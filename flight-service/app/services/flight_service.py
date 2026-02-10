# flight-service/app/services/flight_service.py

from datetime import datetime, timedelta
from typing import Tuple, Optional, List
from multiprocessing import Process
import time

from app import db
from app.models import Flight, FlightStatus, Airline, Ticket, FlightRating
from app.dto import (
    CreateFlightDTO, UpdateFlightDTO, ApproveFlightDTO, 
    RejectFlightDTO, CancelFlightDTO, RateFlightDTO, FlightSearchDTO
)


class FlightService:
    """Servis za rad sa letovima."""
    
    def __init__(self, socketio=None):
        """
        Inicijalizuje FlightService.

         Args:
            socketio: SocketIO instanca za real-time notifikacije
        """
        self.socketio = socketio
    

    def create_flight(self, dto: CreateFlightDTO, manager_id: int) -> Tuple[bool, str, Optional[dict]]:
        """
        Kreira novi let (samo menadžer).

        Args:
            dto: CreateFlightDTO sa podacima leta
            manager_id: ID menadžera koji kreira let
            
        Returns:
            Tuple (success, message, flight_data)
        """
        errors = dto.validate()
        if errors:
            return False, ', '.join(errors), None
        
        airline = Airline.query.get(dto.airline_id)
        if not airline:
            return False, 'Avio kompanija nije pronađena', None
        
        # PROMENA: Koristimo lokalno vreme kontejnera (Srbija)
        if dto.vreme_polaska < datetime.now():
            return False, 'Vreme polaska ne može biti u prošlosti', None
        
        flight = Flight(
            naziv=dto.naziv,
            airline_id=dto.airline_id,
            duzina_km=dto.duzina_km,
            trajanje_minuta=dto.trajanje_minuta,
            vreme_polaska=dto.vreme_polaska,
            aerodrom_polaska=dto.aerodrom_polaska,
            aerodrom_dolaska=dto.aerodrom_dolaska,
            cena_karte=dto.cena_karte,
            ukupno_mesta=dto.ukupno_mesta,
            kreirao_id=manager_id,
            status=FlightStatus.CEKA_ODOBRENJE
        )
        
        try:
            db.session.add(flight)
            db.session.commit()
            
            if self.socketio:
                self.socketio.emit('new_flight_pending', {
                    'flight': flight.to_dict()
                }, namespace='/admin')
            
            return True, 'Let uspešno kreiran i čeka odobrenje', flight.to_dict()
        except Exception as e:
            db.session.rollback()
            return False, f'Greška pri kreiranju leta: {str(e)}', None
    
    def update_flight(self, flight_id: int, dto: UpdateFlightDTO, manager_id: int) -> Tuple[bool, str, Optional[dict]]:
        """
        Ažurira let (menadžer koji ga je kreirao).
        
        Args:
            flight_id: ID leta
            dto: UpdateFlightDTO sa novim podacima
            manager_id: ID menadžera
            
        Returns:
            Tuple (success, message, flight_data)
        """
        errors = dto.validate()
        if errors:
            return False, ', '.join(errors), None
        
        flight = Flight.query.get(flight_id)
        if not flight:
            return False, 'Let nije pronađen', None
        
        if flight.kreirao_id != manager_id:
            return False, 'Nemate pravo da menjate ovaj let', None
        
        if flight.status not in [FlightStatus.CEKA_ODOBRENJE, FlightStatus.ODBIJEN]:
            return False, 'Let se može menjati samo dok čeka odobrenje ili je odbijen', None
        
        # Ažuriranje polja
        if dto.naziv is not None:
            flight.naziv = dto.naziv
        if dto.airline_id is not None:
            flight.airline_id = dto.airline_id
        if dto.duzina_km is not None:
            flight.duzina_km = dto.duzina_km
        if dto.trajanje_minuta is not None:
            flight.trajanje_minuta = dto.trajanje_minuta
        if dto.vreme_polaska is not None:
            flight.vreme_polaska = dto.vreme_polaska
        if dto.aerodrom_polaska is not None:
            flight.aerodrom_polaska = dto.aerodrom_polaska
        if dto.aerodrom_dolaska is not None:
            flight.aerodrom_dolaska = dto.aerodrom_dolaska
        if dto.cena_karte is not None:
            flight.cena_karte = dto.cena_karte
        if dto.ukupno_mesta is not None:
            flight.ukupno_mesta = dto.ukupno_mesta
        
        if flight.status == FlightStatus.ODBIJEN:
            flight.status = FlightStatus.CEKA_ODOBRENJE
            flight.razlog_odbijanja = None
        
        try:
            db.session.commit()
            if self.socketio:
                self.socketio.emit('flight_updated', {
                    'flight': flight.to_dict()
                }, namespace='/admin')
            return True, 'Let uspešno ažuriran', flight.to_dict()
        except Exception as e:
            db.session.rollback()
            return False, f'Greška pri ažuriranju: {str(e)}', None

    def approve_flight(self, dto: ApproveFlightDTO) -> Tuple[bool, str, Optional[dict]]:
        """
        Odobrava let (samo admin).
        
        Args:
            dto: ApproveFlightDTO
            
        Returns:
            Tuple (success, message, flight_data)
        """
        errors = dto.validate()
        if errors:
            return False, ', '.join(errors), None
        flight = Flight.query.get(dto.flight_id)
        if not flight or flight.status != FlightStatus.CEKA_ODOBRENJE:
            return False, 'Nevalidan let za odobravanje', None
        
        flight.status = FlightStatus.ODOBREN
        try:
            db.session.commit()
            
            # Emituj obavestenje ka menadžeru o odobrenju
            if self.socketio:
                self.socketio.emit('flight_approved', {'flight': flight.to_dict()}, namespace='/manager')  # Ovaj deo je novo
            
            # Emituj obavestenje na frontend za sve
            if self.socketio:
                self.socketio.emit('flight_status_changed', {
                    'flight_id': flight.id,
                    'status': flight.status.value  
                }, namespace='/manager')
            
            return True, 'Let uspešno odobren', flight.to_dict()
        except Exception as e:
            db.session.rollback()
            return False, str(e), None


    def cancel_flight(self, dto: CancelFlightDTO) -> Tuple[bool, str, Optional[dict], List[tuple]]:
        """Otkazuje let."""
        flight = Flight.query.get(dto.flight_id)
        if not flight or flight.status != FlightStatus.ODOBREN:
            return False, 'Samo odobreni letovi se mogu otkazati', None, []
        
        # PROMENA: Lokalno vreme
        if flight.vreme_polaska < datetime.now():
            return False, 'Let koji je već počeo se ne može otkazati', None, []
        
        flight.status = FlightStatus.OTKAZAN
        tickets = Ticket.query.filter_by(flight_id=dto.flight_id, otkazana=False).all()
        refunds = [(t.user_id, float(t.cena)) for t in tickets]
        for t in tickets: t.otkazana = True
        
        try:
            db.session.commit()
            if self.socketio:
                self.socketio.emit('flight_cancelled', {'flight': flight.to_dict()}, namespace='/flights')
            return True, 'Let otkazan', flight.to_dict(), refunds
        except Exception as e:
            db.session.rollback()
            return False, str(e), None, []
    
    def reject_flight(self, dto: RejectFlightDTO) -> Tuple[bool, str, Optional[dict]]:
        """
        Odbija let (samo admin).
        
        Args:
            dto: RejectFlightDTO sa razlogom
            
        Returns:
            Tuple (success, message, flight_data)
        """
        errors = dto.validate()
        if errors:
            return False, ', '.join(errors), None
        
        flight = Flight.query.get(dto.flight_id)
        if not flight:
            return False, 'Let nije pronađen', None
        
        if flight.status != FlightStatus.CEKA_ODOBRENJE:
            return False, 'Let nije u statusu čekanja odobrenja', None
        
        flight.status = FlightStatus.ODBIJEN
        flight.razlog_odbijanja = dto.razlog
        
        try:
            db.session.commit()
            
            if self.socketio:
                self.socketio.emit('flight_rejected', {
                    'flight': flight.to_dict()
                }, namespace='/manager')
            
            return True, 'Let odbijen', flight.to_dict()
        except Exception as e:
            db.session.rollback()
            return False, f'Greška pri odbijanju: {str(e)}', None
    
    
    def delete_flight(self, flight_id: int) -> Tuple[bool, str]:
        """
        Briše let (samo admin).
        
        Args:
            flight_id: ID leta
            
        Returns:
            Tuple (success, message)
        """
        flight = Flight.query.get(flight_id)
        if not flight:
            return False, 'Let nije pronađen'
        
        # Provera da li postoje karte
        has_tickets = Ticket.query.filter_by(flight_id=flight_id, otkazana=False).count() > 0
        if has_tickets:
            return False, 'Let sa kupljenim kartama se ne može obrisati. Otkazite ga umesto toga.'
        
        try:
            db.session.delete(flight)
            db.session.commit()
            return True, 'Let uspešno obrisan'
        except Exception as e:
            db.session.rollback()
            return False, f'Greška pri brisanju: {str(e)}'
    
    def get_flights_by_status(self, status: str = None) -> List[Flight]:
        """
        Vraća letove filtrirane po statusu.
        
        Args:
            status: Status leta (opciono)
            
        Returns:
            Lista letova
        """
        query = Flight.query
        
        if status:
            query = query.filter_by(status=FlightStatus(status))
        
        return query.order_by(Flight.vreme_polaska).all()
    
    def get_upcoming_flights(self) -> List[Flight]:
        """Vraća letove koji još nisu počeli."""
        # PROMENA: Lokalno vreme
        now = datetime.now()
        return Flight.query.filter(
            Flight.status == FlightStatus.ODOBREN,
            Flight.vreme_polaska > now
        ).order_by(Flight.vreme_polaska).all()
    
    def get_in_progress_flights(self) -> List[Flight]:
        """Vraća letove koji su u toku."""
        # PROMENA: Lokalno vreme
        now = datetime.now()
        flights = Flight.query.filter(
            Flight.status.in_([FlightStatus.ODOBREN, FlightStatus.U_TOKU])
        ).all()
        
        in_progress = []
        for flight in flights:
            if flight.vreme_polaska <= now < flight.vreme_dolaska:
                if flight.status != FlightStatus.U_TOKU:
                    flight.status = FlightStatus.U_TOKU
                    db.session.commit()
                in_progress.append(flight)
        return in_progress
    
    def get_finished_flights(self) -> List[Flight]:
        """Vraća završene i ažurira status onih koji su prošli."""
        # PROMENA: Lokalno vreme
        now = datetime.now()
        potential_finished = Flight.query.filter(
            Flight.status.in_([FlightStatus.ODOBREN, FlightStatus.U_TOKU])
        ).all()
        
        for flight in potential_finished:
            if flight.vreme_dolaska <= now:
                flight.status = FlightStatus.ZAVRSEN
        
        db.session.commit()
        return Flight.query.filter(
            Flight.status.in_([FlightStatus.ZAVRSEN, FlightStatus.OTKAZAN])
        ).order_by(Flight.vreme_polaska.desc()).all()
    
    def search_flights(self, dto: FlightSearchDTO) -> List[Flight]:
        """
        Pretražuje letove.
        
        Args:
            dto: FlightSearchDTO sa kriterijumima pretrage
            
        Returns:
            Lista letova
        """
        query = Flight.query.filter(Flight.status == FlightStatus.ODOBREN)
        
        if dto.naziv:
            query = query.filter(Flight.naziv.ilike(f'%{dto.naziv}%'))
        
        if dto.airline_id:
            query = query.filter(Flight.airline_id == dto.airline_id)
        
        if dto.datum_od:
            query = query.filter(Flight.vreme_polaska >= dto.datum_od)
        
        if dto.datum_do:
            query = query.filter(Flight.vreme_polaska <= dto.datum_do)
        
        return query.order_by(Flight.vreme_polaska).all()
    
    def get_pending_flights(self) -> List[Flight]:
        """Vraća letove koji čekaju odobrenje."""
        return Flight.query.filter_by(status=FlightStatus.CEKA_ODOBRENJE).all()

    def get_flights_by_creator(self, creator_id: int) -> List[Flight]:
        """Vraća letove koje je kreirao dati menadžer."""
        return (
            Flight.query.filter_by(kreirao_id=creator_id)
            .order_by(Flight.vreme_polaska.desc())
            .all()
        )
    
    def rate_flight(self, dto: RateFlightDTO, user_id: int) -> Tuple[bool, str, Optional[dict]]:
        """
        Ocenjuje let.
        
        Args:
            dto: RateFlightDTO sa ocenom
            user_id: ID korisnika
            
        Returns:
            Tuple (success, message, rating_data)
        """
        errors = dto.validate()
        if errors:
            return False, ', '.join(errors), None
        
        flight = Flight.query.get(dto.flight_id)
        if not flight:
            return False, 'Let nije pronađen', None
        
        if flight.status != FlightStatus.ZAVRSEN:
            return False, 'Let se može oceniti samo nakon završetka', None
        
        # Provera da li je korisnik imao kartu za ovaj let
        ticket = Ticket.query.filter_by(
            flight_id=dto.flight_id,
            user_id=user_id,
            otkazana=False
        ).first()
        
        if not ticket:
            return False, 'Možete oceniti samo letove za koje ste imali kartu', None
        
        # Provera da li je već ocenio
        existing_rating = FlightRating.query.filter_by(
            flight_id=dto.flight_id,
            user_id=user_id
        ).first()
        
        if existing_rating:
            return False, 'Već ste ocenili ovaj let', None
        
        rating = FlightRating(
            flight_id=dto.flight_id,
            user_id=user_id,
            ocena=dto.ocena,
            komentar=dto.komentar
        )
        
        try:
            db.session.add(rating)
            db.session.commit()
            return True, 'Ocena uspešno sačuvana', rating.to_dict()
        except Exception as e:
            db.session.rollback()
            return False, f'Greška pri ocenjivanju: {str(e)}', None
    
    def get_all_ratings(self) -> List[FlightRating]:
        """Vraća sve ocene (za admina)."""
        return FlightRating.query.join(Flight).all()
    
    def get_flight_by_id(self, flight_id: int) -> Optional[Flight]:
        """Vraća let po ID-u."""
        return Flight.query.get(flight_id)

