# flight-service/app/models/__init__.py

from app.models.flight import Airline, Flight, FlightStatus, Ticket, FlightRating

__all__ = ['Airline', 'Flight', 'FlightStatus', 'Ticket', 'FlightRating']