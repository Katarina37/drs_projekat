# flight-service/app/api/ratings.py

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.services import RatingService

ratings_bp = Blueprint('ratings', __name__)


@ratings_bp.route('/', methods=['POST'])
@jwt_required()
def create_rating():
    identity = get_jwt_identity()
    data = request.get_json()
    
    if not data:
        return jsonify({'success': False, 'message': 'Nedostaju podaci'}), 400
    
    flight_id = data.get('flight_id')
    ocena = data.get('ocena')
    komentar = data.get('komentar')
    
    if not flight_id or not ocena:
        return jsonify({'success': False, 'message': 'Flight ID i ocena su obavezni'}), 400
    
    service = RatingService()
    success, message, rating_data = service.create_rating(
        flight_id=flight_id,
        user_id=identity.get('id'),
        ocena=ocena,
        komentar=komentar
    )
    
    if success:
        return jsonify({'success': True, 'message': message, 'data': rating_data}), 201
    return jsonify({'success': False, 'message': message}), 400


@ratings_bp.route('/flight/<int:flight_id>', methods=['GET'])
def get_flight_ratings(flight_id: int):
    service = RatingService()
    ratings = service.get_ratings_by_flight(flight_id)
    average = service.get_average_rating(flight_id)
    
    return jsonify({
        'success': True,
        'data': {
            'ratings': [r.to_dict() for r in ratings],
            'average': average
        }
    }), 200


@ratings_bp.route('/my', methods=['GET'])
@jwt_required()
def get_my_ratings():
    identity = get_jwt_identity()
    user_id = identity.get('id')
    
    service = RatingService()
    ratings = service.get_ratings_by_user(user_id)
    
    return jsonify({
        'success': True,
        'data': [r.to_dict() for r in ratings]
    }), 200