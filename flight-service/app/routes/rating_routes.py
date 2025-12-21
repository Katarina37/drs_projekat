# flight-service/app/routes/rating_routes.py

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.services import FlightService
from app.dto import RateFlightDTO

rating_bp = Blueprint('ratings', __name__)


def role_check(*allowed_roles):
    """Helper za proveru uloge."""
    identity = get_jwt_identity()
    return identity.get('uloga') in allowed_roles


@rating_bp.route('/', methods=['GET'])
@jwt_required()
def get_all_ratings():
    """
    Vraća sve ocene (samo admin).
    
    Returns:
        JSON lista ocena
    """
    try:
        if not role_check('ADMINISTRATOR'):
            return jsonify({
                'success': False,
                'message': 'Pristup odbijen'
            }), 403
        
        flight_service = FlightService()
        ratings = flight_service.get_all_ratings()
        
        return jsonify({
            'success': True,
            'data': [r.to_dict(include_flight=True) for r in ratings]
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Greška: {str(e)}'
        }), 500


@rating_bp.route('/', methods=['POST'])
@jwt_required()
def rate_flight():
    """
    Ocenjuje let (samo korisnici sa kupljenom kartom, nakon završetka leta).
    
    Request body:
        - flight_id: int
        - ocena: int (1-5)
        - komentar: str (opciono)
    
    Returns:
        JSON sa kreiranom ocenom
    """
    try:
        identity = get_jwt_identity()
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'message': 'Nedostaju podaci'}), 400
        
        dto = RateFlightDTO.from_dict(data)
        flight_service = FlightService()
        
        success, message, rating_data = flight_service.rate_flight(dto, identity['id'])
        
        if success:
            return jsonify({
                'success': True,
                'message': message,
                'data': rating_data
            }), 201
        else:
            return jsonify({
                'success': False,
                'message': message
            }), 400
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Greška: {str(e)}'
        }), 500