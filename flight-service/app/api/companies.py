# flight-service/app/api/companies.py

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from app.services import AirlineService

companies_bp = Blueprint('companies', __name__)


@companies_bp.route('/', methods=['GET'])
def get_all_companies():
    service = AirlineService()
    companies = service.get_all_airlines()
    return jsonify({
        'success': True,
        'data': [c.to_dict() for c in companies]
    }), 200


@companies_bp.route('/<int:company_id>', methods=['GET'])
def get_company(company_id: int):
    service = AirlineService()
    company = service.get_airline_by_id(company_id)
    if not company:
        return jsonify({'success': False, 'message': 'Kompanija nije pronađena'}), 404
    
    return jsonify({
        'success': True,
        'data': company.to_dict()
    }), 200