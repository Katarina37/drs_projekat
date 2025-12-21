# server/app/routes/internal_routes.py

import os
from flask import Blueprint, request, jsonify

from app.services import UserService

internal_bp = Blueprint('internal', __name__)

INTERNAL_API_KEY = os.getenv('INTERNAL_API_KEY', 'internal-secret')


def verify_internal_key():
    """Verifikuje interni API ključ."""
    key = request.headers.get('X-Internal-Key')
    return key == INTERNAL_API_KEY


@internal_bp.route('/deduct-balance', methods=['POST'])
def deduct_balance():
    """
    Interna ruta za skidanje sredstava sa računa korisnika.
    Koristi se od strane flight-service prilikom kupovine karte.
    
    Request body:
        - user_id: int
        - amount: float
    
    Headers:
        - X-Internal-Key: str
    
    Returns:
        JSON sa rezultatom transakcije
    """
    if not verify_internal_key():
        return jsonify({
            'success': False,
            'message': 'Nevalidan API ključ'
        }), 401
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'Nedostaju podaci'}), 400
        
        user_id = data.get('user_id')
        amount = data.get('amount')
        
        if not user_id or not amount:
            return jsonify({
                'success': False,
                'message': 'Nedostaju user_id ili amount'
            }), 400
        
        user_service = UserService()
        success, message = user_service.deduct_balance(user_id, float(amount))
        
        if success:
            return jsonify({
                'success': True,
                'message': message
            }), 200
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


@internal_bp.route('/refund-balance', methods=['POST'])
def refund_balance():
    """
    Interna ruta za vraćanje sredstava na račun korisnika.
    Koristi se od strane flight-service prilikom otkazivanja leta.
    
    Request body:
        - user_id: int
        - amount: float
    
    Headers:
        - X-Internal-Key: str
    
    Returns:
        JSON sa rezultatom transakcije
    """
    if not verify_internal_key():
        return jsonify({
            'success': False,
            'message': 'Nevalidan API ključ'
        }), 401
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'Nedostaju podaci'}), 400
        
        user_id = data.get('user_id')
        amount = data.get('amount')
        
        if not user_id or not amount:
            return jsonify({
                'success': False,
                'message': 'Nedostaju user_id ili amount'
            }), 400
        
        user_service = UserService()
        success, message = user_service.refund_balance(user_id, float(amount))
        
        if success:
            return jsonify({
                'success': True,
                'message': message
            }), 200
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


@internal_bp.route('/user/<int:user_id>', methods=['GET'])
def get_user_internal(user_id):
    """
    Interna ruta za dobijanje podataka o korisniku.
    
    Args:
        user_id: ID korisnika
    
    Headers:
        - X-Internal-Key: str
    
    Returns:
        JSON sa podacima korisnika
    """
    if not verify_internal_key():
        return jsonify({
            'success': False,
            'message': 'Nevalidan API ključ'
        }), 401
    
    try:
        user_service = UserService()
        user = user_service.get_user_by_id(user_id)
        
        if user:
            return jsonify({
                'success': True,
                'data': user.to_dict()
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': 'Korisnik nije pronađen'
            }), 404
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Greška: {str(e)}'
        }), 500