# flight-service/app/routes/airline_routes.py

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.services import AirlineService
from app.dto import CreateAirlineDTO

airline_bp = Blueprint("airlines", __name__)


def _role_check(*allowed_roles) -> bool:
    identity = get_jwt_identity() or {}
    return identity.get("uloga") in allowed_roles


@airline_bp.route("/", methods=["GET"])
def list_airlines():
    try:
        service = AirlineService()
        airlines = service.get_all_airlines()
        return jsonify({"success": True, "data": [a.to_dict() for a in airlines]}), 200
    except Exception as e:
        return jsonify({"success": False, "message": f"Greska: {str(e)}"}), 500


@airline_bp.route("/<int:airline_id>", methods=["GET"])
def get_airline(airline_id: int):
    try:
        service = AirlineService()
        airline = service.get_airline_by_id(airline_id)
        if not airline:
            return jsonify({"success": False, "message": "Avio kompanija nije pronadjena"}), 404
        return jsonify({"success": True, "data": airline.to_dict()}), 200
    except Exception as e:
        return jsonify({"success": False, "message": f"Greska: {str(e)}"}), 500


@airline_bp.route("/", methods=["POST"])
@jwt_required()
def create_airline():
    if not _role_check("ADMINISTRATOR", "MENADZER"):
        return jsonify({"success": False, "message": "Pristup odbijen"}), 403

    data = request.get_json() or {}
    dto = CreateAirlineDTO.from_dict(data)
    service = AirlineService()

    success, message, airline_data = service.create_airline(dto)
    if success:
        return jsonify({"success": True, "message": message, "data": airline_data}), 201
    return jsonify({"success": False, "message": message}), 400


@airline_bp.route("/<int:airline_id>", methods=["PUT"])
@jwt_required()
def update_airline(airline_id: int):
    if not _role_check("ADMINISTRATOR", "MENADZER"):
        return jsonify({"success": False, "message": "Pristup odbijen"}), 403

    data = request.get_json() or {}
    service = AirlineService()
    success, message, airline_data = service.update_airline(airline_id, data)

    if success:
        return jsonify({"success": True, "message": message, "data": airline_data}), 200
    return jsonify({"success": False, "message": message}), 400


@airline_bp.route("/<int:airline_id>", methods=["DELETE"])
@jwt_required()
def delete_airline(airline_id: int):
    if not _role_check("ADMINISTRATOR", "MENADZER"):
        return jsonify({"success": False, "message": "Pristup odbijen"}), 403

    service = AirlineService()
    success, message = service.delete_airline(airline_id)
    if success:
        return jsonify({"success": True, "message": message}), 200
    return jsonify({"success": False, "message": message}), 400
