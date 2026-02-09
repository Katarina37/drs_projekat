# flight-service/app/services/rating_service.py

from typing import Tuple, Optional, List

from app import db
from app.models import FlightRating, Flight, Ticket, FlightStatus


class RatingService:
    
    def create_rating(self, flight_id: int, user_id: int, ocena: int, komentar: str = None) -> Tuple[bool, str, Optional[dict]]:
        if not 1 <= ocena <= 5:
            return False, 'Ocena mora biti između 1 i 5', None
        
        flight = Flight.query.get(flight_id)
        if not flight:
            return False, 'Let nije pronađen', None
        
        if flight.status != FlightStatus.ZAVRSEN:
            return False, 'Let se može oceniti samo nakon završetka', None
        
        ticket = Ticket.query.filter_by(
            flight_id=flight_id,
            user_id=user_id,
            otkazana=False
        ).first()
        
        if not ticket:
            return False, 'Možete oceniti samo letove za koje ste imali kartu', None
        
        existing_rating = FlightRating.query.filter_by(
            flight_id=flight_id,
            user_id=user_id
        ).first()
        
        if existing_rating:
            return False, 'Već ste ocenili ovaj let', None
        
        rating = FlightRating(
            flight_id=flight_id,
            user_id=user_id,
            ocena=ocena,
            komentar=komentar
        )
        
        try:
            db.session.add(rating)
            db.session.commit()
            return True, 'Ocena uspešno sačuvana', rating.to_dict()
        except Exception as e:
            db.session.rollback()
            return False, f'Greška pri ocenjivanju: {str(e)}', None
    
    def get_ratings_by_flight(self, flight_id: int) -> List[FlightRating]:
        return FlightRating.query.filter_by(flight_id=flight_id).all()
    
    def get_ratings_by_user(self, user_id: int) -> List[FlightRating]:
        return FlightRating.query.filter_by(user_id=user_id).all()
    
    def get_all_ratings(self) -> List[FlightRating]:
        return FlightRating.query.all()
    
    def get_average_rating(self, flight_id: int) -> Optional[float]:
        ratings = FlightRating.query.filter_by(flight_id=flight_id).all()
        if not ratings:
            return None
        return sum(r.ocena for r in ratings) / len(ratings)