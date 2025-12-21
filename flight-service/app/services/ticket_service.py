# flight-service/app/services/ticket_service.py

from datetime import datetime
from typing import Tuple, Optional, List
from multiprocessing import Process
import time
import requests
import os

from app import db
from app.models import Flight, FlightStatus, Ticket
from app.dto import BuyTicketDTO


class TicketService:
    """Servis za rad sa kartama (rezervacijama)."""
    
    def __init__(self, socketio=None):
        """
        Inicijalizuje TicketService.
        
        Args:
            socketio: SocketIO instanca za real-time notifikacije
        """
        self.socketio = socketio
        self.server_url = os.getenv('SERVER_URL', 'http://server:5001')
    
    def buy_ticket_async(self, dto: BuyTicketDTO, user_id: int, user_balance: float) -> Tuple[bool, str]:
        """
        Pokreće asinhronu kupovinu karte korišćenjem procesa.
        
        Args:
            dto: BuyTicketDTO sa ID-em leta
            user_id: ID korisnika
            user_balance: Trenutno stanje na računu korisnika
            
        Returns:
            Tuple (success, message) - inicijalna validacija
        """
        errors = dto.validate()
        if errors:
            return False, ', '.join(errors)
        
        flight = Flight.query.get(dto.flight_id)
        if not flight:
            return False, 'Let nije pronađen'
        
        if flight.status != FlightStatus.ODOBREN:
            return False, 'Karte se mogu kupiti samo za odobrene letove'
        
        if flight.vreme_polaska < datetime.utcnow():
            return False, 'Let je već počeo'
        
        if flight.slobodna_mesta <= 0:
            return False, 'Nema slobodnih mesta'
        
        if user_balance < float(flight.cena_karte):
            return False, 'Nedovoljno sredstava na računu'
        
        # Provera da li korisnik već ima kartu za ovaj let
        existing_ticket = Ticket.query.filter_by(
            flight_id=dto.flight_id,
            user_id=user_id,
            otkazana=False
        ).first()
        
        if existing_ticket:
            return False, 'Već imate kartu za ovaj let'
        
        # Pokreni asinhronu obradu kupovine
        process = Process(
            target=self._process_purchase,
            args=(dto.flight_id, user_id, float(flight.cena_karte))
        )
        process.start()
        
        return True, 'Kupovina karte je u toku. Dobićete obaveštenje kada bude završena.'
    
    def _process_purchase(self, flight_id: int, user_id: int, price: float):
        """
        Interna funkcija za obradu kupovine u zasebnom procesu.
        Simulira duže vreme obrade sa sleep.
        
        Args:
            flight_id: ID leta
            user_id: ID korisnika
            price: Cena karte
        """
        from app import create_app, db
        
        app = create_app()
        with app.app_context():
            try:
                # Simulacija duže obrade (za testiranje)
                time.sleep(3)
                
                # Ponovna provera dostupnosti
                flight = Flight.query.get(flight_id)
                if not flight or flight.status != FlightStatus.ODOBREN:
                    self._notify_purchase_failed(user_id, 'Let više nije dostupan')
                    return
                
                if flight.slobodna_mesta <= 0:
                    self._notify_purchase_failed(user_id, 'Nema više slobodnih mesta')
                    return
                
                # Skidanje novca sa računa korisnika (poziv Server API)
                deduct_success = self._deduct_user_balance(user_id, price)
                if not deduct_success:
                    self._notify_purchase_failed(user_id, 'Greška pri transakciji')
                    return
                
                # Kreiranje karte
                ticket = Ticket(
                    flight_id=flight_id,
                    user_id=user_id,
                    cena=price
                )
                db.session.add(ticket)
                db.session.commit()
                
                # Notifikacija o uspešnoj kupovini
                self._notify_purchase_success(user_id, ticket.to_dict())
                
            except Exception as e:
                print(f"[TICKET] Greška pri obradi kupovine: {str(e)}")
                self._notify_purchase_failed(user_id, f'Greška: {str(e)}')
    
    def _deduct_user_balance(self, user_id: int, amount: float) -> bool:
        """
        Poziva Server API za skidanje sredstava sa računa.
        
        Args:
            user_id: ID korisnika
            amount: Iznos
            
        Returns:
            True ako je uspešno, False inače
        """
        try:
            # Interno korišćenje - može se koristiti direktan API poziv ili interni mehanizam
            # Za jednostavnost, ovo simulira uspešnu transakciju
            # U produkciji bi se koristio HTTP poziv ka Server servisu
            response = requests.post(
                f'{self.server_url}/api/internal/deduct-balance',
                json={'user_id': user_id, 'amount': amount},
                headers={'X-Internal-Key': os.getenv('INTERNAL_API_KEY', 'internal-secret')}
            )
            return response.status_code == 200
        except Exception as e:
            print(f"[TICKET] Greška pri skidanju sredstava: {str(e)}")
            return False
    
    def _notify_purchase_success(self, user_id: int, ticket_data: dict):
        """Šalje notifikaciju o uspešnoj kupovini."""
        if self.socketio:
            self.socketio.emit('purchase_success', {
                'user_id': user_id,
                'ticket': ticket_data
            }, namespace='/user')
    
    def _notify_purchase_failed(self, user_id: int, reason: str):
        """Šalje notifikaciju o neuspešnoj kupovini."""
        if self.socketio:
            self.socketio.emit('purchase_failed', {
                'user_id': user_id,
                'reason': reason
            }, namespace='/user')
    
    def get_user_tickets(self, user_id: int) -> List[Ticket]:
        """
        Vraća sve karte korisnika.
        
        Args:
            user_id: ID korisnika
            
        Returns:
            Lista karata
        """
        return Ticket.query.filter_by(user_id=user_id).all()
    
    def get_ticket_by_id(self, ticket_id: int) -> Optional[Ticket]:
        """
        Vraća kartu po ID-u.
        
        Args:
            ticket_id: ID karte
            
        Returns:
            Ticket objekat ili None
        """
        return Ticket.query.get(ticket_id)
    
    def cancel_ticket(self, ticket_id: int, user_id: int) -> Tuple[bool, str]:
        """
        Otkazuje kartu (vraća novac).
        
        Args:
            ticket_id: ID karte
            user_id: ID korisnika
            
        Returns:
            Tuple (success, message)
        """
        ticket = Ticket.query.get(ticket_id)
        if not ticket:
            return False, 'Karta nije pronađena'
        
        if ticket.user_id != user_id:
            return False, 'Nemate pravo da otkažete ovu kartu'
        
        if ticket.otkazana:
            return False, 'Karta je već otkazana'
        
        flight = ticket.let
        if flight.vreme_polaska < datetime.utcnow():
            return False, 'Ne možete otkazati kartu za let koji je već počeo'
        
        ticket.otkazana = True
        
        # Vraćanje novca
        try:
            response = requests.post(
                f'{self.server_url}/api/internal/refund-balance',
                json={'user_id': user_id, 'amount': float(ticket.cena)},
                headers={'X-Internal-Key': os.getenv('INTERNAL_API_KEY', 'internal-secret')}
            )
            if response.status_code != 200:
                db.session.rollback()
                return False, 'Greška pri vraćanju sredstava'
        except Exception as e:
            db.session.rollback()
            return False, f'Greška pri vraćanju sredstava: {str(e)}'
        
        db.session.commit()
        return True, 'Karta uspešno otkazana, sredstva su vraćena na račun'
