# flight-service/app/dto/__init__.py

from app.dto.flight_dto import (
    CreateFlightDTO,
    UpdateFlightDTO,
    ApproveFlightDTO,
    RejectFlightDTO,
    CancelFlightDTO,
    BuyTicketDTO,
    RateFlightDTO,
    CreateAirlineDTO,
    FlightSearchDTO
)

__all__ = [
    'CreateFlightDTO',
    'UpdateFlightDTO',
    'ApproveFlightDTO',
    'RejectFlightDTO',
    'CancelFlightDTO',
    'BuyTicketDTO',
    'RateFlightDTO',
    'CreateAirlineDTO',
    'FlightSearchDTO'
]