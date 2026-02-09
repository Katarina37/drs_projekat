# flight-service/app/api/flights.py

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.services import FlightService
from app.dto import FlightSearchDTO

flights_bp = Blueprint('flights', __name__)


@flights_bp.route('/', methods=['GET'])
def get_all_flights():
    service = FlightService()
    flights = service.get_all_flights()
    return jsonify({
        'success': True,
        'data': [f.to_dict() for f in flights]
    }), 200


@flights_bp.route('/search', methods=['GET'])
def search_flights():
    params = request.args.to_dict()
    dto = FlightSearchDTO.from_dict(params)
    
    service = FlightService()
    flights = service.search_flights(dto)
    
    return jsonify({
        'success': True,
        'data': [f.to_dict() for f in flights]
    }), 200


@flights_bp.route('/<int:flight_id>', methods=['GET'])
def get_flight(flight_id: int):
    service = FlightService()
    flight = service.get_flight_by_id(flight_id)
    
    if not flight:
        return jsonify({'success': False, 'message': 'Let nije pronađen'}), 404
    
    return jsonify({
        'success': True,
        'data': flight.to_dict()
    }), 200


@flights_bp.route('/<int:flight_id>/available-seats', methods=['GET'])
def get_available_seats(flight_id: int):
    service = FlightService()
    flight = service.get_flight_by_id(flight_id)
    
    if not flight:
        return jsonify({'success': False, 'message': 'Let nije pronađen'}), 404
    
    return jsonify({
        'success': True,
        'data': {
            'total_seats': flight.ukupno_mesta,
            'available_seats': flight.slobodna_mesta,
            'sold_seats': flight.ukupno_mesta - flight.slobodna_mesta
        }
    }), 200