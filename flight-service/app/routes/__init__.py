# flight-service/app/routes/__init__.py

from app.routes.flight_routes import flight_bp
from app.routes.airline_routes import airline_bp
from app.routes.ticket_routes import ticket_bp
from app.routes.rating_routes import rating_bp
from app.routes import websocket_handlers

__all__ = ['flight_bp', 'airline_bp', 'ticket_bp', 'rating_bp', 'websocket_handlers']