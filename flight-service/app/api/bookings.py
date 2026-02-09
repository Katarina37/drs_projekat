# flight-service/app/api/bookings.py

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.services import BookingService

bookings_bp = Blueprint('bookings', __name__)


@bookings_bp.route('/', methods=['GET'])
@jwt_required()
def get_all_bookings():
    identity = get_jwt_identity()
    if identity.get('uloga') != 'ADMINISTRATOR':
        return jsonify({'success': False, 'message': 'Pristup odbijen'}), 403
    
    service = BookingService()
    bookings = service.get_all_bookings()
    return jsonify({
        'success': True,
        'data': [b.to_dict() for b in bookings]
    }), 200


@bookings_bp.route('/my', methods=['GET'])
@jwt_required()
def get_my_bookings():
    identity = get_jwt_identity()
    user_id = identity.get('id')
    
    service = BookingService()
    bookings = service.get_bookings_by_user(user_id)
    return jsonify({
        'success': True,
        'data': [b.to_dict() for b in bookings]
    }), 200


@bookings_bp.route('/flight/<int:flight_id>', methods=['GET'])
@jwt_required()
def get_bookings_by_flight(flight_id: int):
    identity = get_jwt_identity()
    if identity.get('uloga') != 'ADMINISTRATOR':
        return jsonify({'success': False, 'message': 'Pristup odbijen'}), 403
    
    service = BookingService()
    bookings = service.get_bookings_by_flight(flight_id)
    return jsonify({
        'success': True,
        'data': [b.to_dict() for b in bookings]
    }), 200


@bookings_bp.route('/<int:booking_id>/cancel', methods=['POST'])
@jwt_required()
def cancel_booking(booking_id: int):
    identity = get_jwt_identity()
    user_id = identity.get('id')
    
    service = BookingService()
    success, message = service.cancel_booking(booking_id, user_id)
    
    if success:
        return jsonify({'success': True, 'message': message}), 200
    return jsonify({'success': False, 'message': message}), 400