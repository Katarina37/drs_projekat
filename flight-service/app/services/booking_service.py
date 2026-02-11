# flight-service/app/services/booking_service.py

from typing import Tuple, Optional, List
from datetime import datetime

from app import db
from app.models import Ticket, Flight, FlightStatus



class BookingService:
    def get_all_bookings(self) -> List[Ticket]:
        return Ticket.query.all()
    

    def get_bookings_by_flight(self, flight_id: int) -> List[Ticket]:
        return Ticket.query.filter_by(flight_id=flight_id).all()
    
    def get_bookings_by_user(self, user_id: int) -> List[Ticket]:
        return Ticket.query.filter_by(user_id=user_id).all()
    
    def cancel_booking(self, booking_id: int, user_id: int) -> Tuple[bool, str]:
        ticket = Ticket.query.get(booking_id)
        if not ticket:
            return False, 'Rezervacija nije pronađena'
        
        if ticket.user_id != user_id:
            return False, 'Nemate pravo da otkažete ovu rezervaciju'
        
        if ticket.otkazana:
            return False, 'Rezervacija je već otkazana'
        
        flight = ticket.let
        if flight.vreme_polaska < datetime.now():
            return False, 'Ne možete otkazati rezervaciju za let koji je već počeo'
        
        ticket.otkazana = True
        
        try:
            db.session.commit()
            return True, 'Rezervacija uspešno otkazana'
        except Exception as e:
            db.session.rollback()
            return False, f'Greška pri otkazivanju: {str(e)}'