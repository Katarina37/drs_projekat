# flight-service/app/routes/flight_routes.py

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import os
import requests

from app import socketio
from app.services import FlightService
from app.utils.report_generator import generate_flights_report_async
from app.dto import (
    CreateFlightDTO,
    UpdateFlightDTO,
    ApproveFlightDTO,
    RejectFlightDTO,
    CancelFlightDTO,
    FlightSearchDTO,
)

flight_bp = Blueprint("flights", __name__)


def _role_check(*allowed_roles) -> bool:
    identity = get_jwt_identity() or {}
    return identity.get("uloga") in allowed_roles


def _refund_balance(user_id: int, amount: float) -> bool:
    server_url = os.getenv("SERVER_URL", "http://server:5001")
    try:
        response = requests.post(
            f"{server_url}/api/internal/refund-balance",
            json={"user_id": user_id, "amount": amount},
            headers={"X-Internal-Key": os.getenv("INTERNAL_API_KEY", "internal-secret")},
        )
        return response.status_code == 200
    except Exception:
        return False


def _fetch_user_data(user_id: int):
    server_url = os.getenv("SERVER_URL", "http://server:5001")
    try:
        response = requests.get(
            f"{server_url}/api/internal/user/{user_id}",
            headers={"X-Internal-Key": os.getenv("INTERNAL_API_KEY", "internal-secret")},
        )
        if response.status_code == 200:
            return response.json().get("data")
    except Exception:
        return None
    return None


@flight_bp.route("/", methods=["GET"])
def list_flights():
    try:
        service = FlightService()
        params = request.args.to_dict()
        if params:
            dto = FlightSearchDTO.from_dict(params)
            flights = service.search_flights(dto)
        else:
            flights = service.get_upcoming_flights()

        return jsonify({"success": True, "data": [f.to_dict() for f in flights]}), 200
    except Exception as e:
        return jsonify({"success": False, "message": f"Greska: {str(e)}"}), 500


@flight_bp.route("/upcoming", methods=["GET"])
def upcoming_flights():
    try:
        service = FlightService()
        flights = service.get_upcoming_flights()
        return jsonify({"success": True, "data": [f.to_dict() for f in flights]}), 200
    except Exception as e:
        return jsonify({"success": False, "message": f"Greska: {str(e)}"}), 500


@flight_bp.route("/search", methods=["GET"])
def search_flights():
    try:
        service = FlightService()
        params = request.args.to_dict()
        dto = FlightSearchDTO.from_dict(params)
        flights = service.search_flights(dto)
        return jsonify({"success": True, "data": [f.to_dict() for f in flights]}), 200
    except Exception as e:
        return jsonify({"success": False, "message": f"Greska: {str(e)}"}), 500


@flight_bp.route("/<int:flight_id>", methods=["GET"])
def get_flight(flight_id: int):
    try:
        service = FlightService()
        flight = service.get_flight_by_id(flight_id)
        if not flight:
            return jsonify({"success": False, "message": "Let nije pronadjen"}), 404
        return jsonify({"success": True, "data": flight.to_dict()}), 200
    except Exception as e:
        return jsonify({"success": False, "message": f"Greska: {str(e)}"}), 500


@flight_bp.route("/pending", methods=["GET"])
@jwt_required()
def pending_flights():
    if not _role_check("ADMINISTRATOR"):
        return jsonify({"success": False, "message": "Pristup odbijen"}), 403

    try:
        service = FlightService()
        flights = service.get_pending_flights()
        return jsonify({"success": True, "data": [f.to_dict() for f in flights]}), 200
    except Exception as e:
        return jsonify({"success": False, "message": f"Greska: {str(e)}"}), 500


@flight_bp.route("/my", methods=["GET"])
@jwt_required()
def my_flights():
    if not _role_check("MENADZER", "ADMINISTRATOR"):
        return jsonify({"success": False, "message": "Pristup odbijen"}), 403

    identity = get_jwt_identity() or {}
    manager_id = identity.get("id")
    if not manager_id:
        return jsonify({"success": False, "message": "Nevalidan token"}), 401

    try:
        service = FlightService()
        flights = service.get_flights_by_creator(manager_id)
        return jsonify({"success": True, "data": [f.to_dict() for f in flights]}), 200
    except Exception as e:
        return jsonify({"success": False, "message": f"Greska: {str(e)}"}), 500


@flight_bp.route("/in-progress", methods=["GET"])
def in_progress_flights():
    try:
        service = FlightService()
        flights = service.get_in_progress_flights()
        return jsonify({"success": True, "data": [f.to_dict() for f in flights]}), 200
    except Exception as e:
        return jsonify({"success": False, "message": f"Greska: {str(e)}"}), 500


@flight_bp.route("/finished", methods=["GET"])
def finished_flights():
    try:
        service = FlightService()
        flights = service.get_finished_flights()
        return jsonify({"success": True, "data": [f.to_dict() for f in flights]}), 200
    except Exception as e:
        return jsonify({"success": False, "message": f"Greska: {str(e)}"}), 500


@flight_bp.route("/", methods=["POST"])
@jwt_required()
def create_flight():
    if not _role_check("MENADZER"):
        return jsonify({"success": False, "message": "Pristup odbijen"}), 403

    data = request.get_json() or {}
    dto = CreateFlightDTO.from_dict(data)
    identity = get_jwt_identity() or {}

    service = FlightService(socketio=socketio)
    success, message, flight_data = service.create_flight(dto, identity.get("id"))

    if success:
        return jsonify({"success": True, "message": message, "data": flight_data}), 201
    return jsonify({"success": False, "message": message}), 400


@flight_bp.route("/<int:flight_id>", methods=["PUT"])
@jwt_required()
def update_flight(flight_id: int):
    if not _role_check("MENADZER"):
        return jsonify({"success": False, "message": "Pristup odbijen"}), 403

    data = request.get_json() or {}
    dto = UpdateFlightDTO.from_dict(data)
    identity = get_jwt_identity() or {}

    service = FlightService(socketio=socketio)
    success, message, flight_data = service.update_flight(flight_id, dto, identity.get("id"))

    if success:
        return jsonify({"success": True, "message": message, "data": flight_data}), 200
    return jsonify({"success": False, "message": message}), 400


@flight_bp.route("/approve", methods=["POST"])
@jwt_required()
def approve_flight():
    if not _role_check("ADMINISTRATOR"):
        return jsonify({"success": False, "message": "Pristup odbijen"}), 403

    data = request.get_json() or {}
    dto = ApproveFlightDTO.from_dict(data)

    service = FlightService(socketio=socketio)
    success, message, flight_data = service.approve_flight(dto)

    if success:
        return jsonify({"success": True, "message": message, "data": flight_data}), 200
    return jsonify({"success": False, "message": message}), 400


@flight_bp.route("/<int:flight_id>/approve", methods=["POST"])
@jwt_required()
def approve_flight_by_id(flight_id: int):
    if not _role_check("ADMINISTRATOR"):
        return jsonify({"success": False, "message": "Pristup odbijen"}), 403

    dto = ApproveFlightDTO.from_dict({"flight_id": flight_id})
    service = FlightService(socketio=socketio)
    success, message, flight_data = service.approve_flight(dto)

    if success:
        return jsonify({"success": True, "message": message, "data": flight_data}), 200
    return jsonify({"success": False, "message": message}), 400


@flight_bp.route("/reject", methods=["POST"])
@jwt_required()
def reject_flight():
    if not _role_check("ADMINISTRATOR"):
        return jsonify({"success": False, "message": "Pristup odbijen"}), 403

    data = request.get_json() or {}
    dto = RejectFlightDTO.from_dict(data)

    service = FlightService(socketio=socketio)
    success, message, flight_data = service.reject_flight(dto)

    if success:
        return jsonify({"success": True, "message": message, "data": flight_data}), 200
    return jsonify({"success": False, "message": message}), 400


@flight_bp.route("/<int:flight_id>/reject", methods=["POST"])
@jwt_required()
def reject_flight_by_id(flight_id: int):
    if not _role_check("ADMINISTRATOR"):
        return jsonify({"success": False, "message": "Pristup odbijen"}), 403

    data = request.get_json() or {}
    dto = RejectFlightDTO.from_dict({"flight_id": flight_id, "razlog": data.get("razlog", "")})

    service = FlightService(socketio=socketio)
    success, message, flight_data = service.reject_flight(dto)

    if success:
        return jsonify({"success": True, "message": message, "data": flight_data}), 200
    return jsonify({"success": False, "message": message}), 400


@flight_bp.route("/cancel", methods=["POST"])
@jwt_required()
def cancel_flight():
    if not _role_check("ADMINISTRATOR"):
        return jsonify({"success": False, "message": "Pristup odbijen"}), 403

    data = request.get_json() or {}
    dto = CancelFlightDTO.from_dict(data)

    service = FlightService(socketio=socketio)
    success, message, flight_data, refunds = service.cancel_flight(dto)

    if not success:
        return jsonify({"success": False, "message": message}), 400

    refund_failures = []
    for user_id, amount in refunds:
        if not _refund_balance(user_id, amount):
            refund_failures.append(user_id)

    response = {"success": True, "message": message, "data": flight_data}
    if refund_failures:
        response["refund_failures"] = refund_failures
        response["message"] = f"{message}. Neki refundi nisu uspeli."

    return jsonify(response), 200


@flight_bp.route("/<int:flight_id>/cancel", methods=["POST"])
@jwt_required()
def cancel_flight_by_id(flight_id: int):
    if not _role_check("ADMINISTRATOR"):
        return jsonify({"success": False, "message": "Pristup odbijen"}), 403

    dto = CancelFlightDTO.from_dict({"flight_id": flight_id})
    service = FlightService(socketio=socketio)
    success, message, flight_data, refunds = service.cancel_flight(dto)

    if not success:
        return jsonify({"success": False, "message": message}), 400

    refund_failures = []
    for user_id, amount in refunds:
        if not _refund_balance(user_id, amount):
            refund_failures.append(user_id)

    response = {"success": True, "message": message, "data": flight_data}
    if refund_failures:
        response["refund_failures"] = refund_failures
        response["message"] = f"{message}. Neki refundi nisu uspeli."

    return jsonify(response), 200


@flight_bp.route("/<int:flight_id>", methods=["DELETE"])
@jwt_required()
def delete_flight(flight_id: int):
    if not _role_check("ADMINISTRATOR"):
        return jsonify({"success": False, "message": "Pristup odbijen"}), 403

    service = FlightService()
    success, message = service.delete_flight(flight_id)

    if success:
        return jsonify({"success": True, "message": message}), 200
    return jsonify({"success": False, "message": message}), 400


@flight_bp.route("/report", methods=["POST"])
@jwt_required()
def generate_report():
    if not _role_check("ADMINISTRATOR"):
        return jsonify({"success": False, "message": "Pristup odbijen"}), 403

    data = request.get_json() or {}
    report_type = data.get("report_type")
    normalized_type = report_type.replace("-", "_") if isinstance(report_type, str) else None
    if normalized_type not in {"upcoming", "in_progress", "finished"}:
        return jsonify({"success": False, "message": "Nepoznat tip izvestaja"}), 400

    identity = get_jwt_identity() or {}
    admin_id = identity.get("id")
    if not admin_id:
        return jsonify({"success": False, "message": "Nevalidan token"}), 401

    admin_data = _fetch_user_data(admin_id)
    if not admin_data:
        return jsonify({"success": False, "message": "Ne mogu da dohvatim admina"}), 502

    service = FlightService()
    if normalized_type == "upcoming":
        flights = service.get_upcoming_flights()
    elif normalized_type == "in_progress":
        flights = service.get_in_progress_flights()
    else:
        flights = service.get_finished_flights()

    admin_name = f"{admin_data.get('ime', '')} {admin_data.get('prezime', '')}".strip() or "Administrator"
    generate_flights_report_async(
        [f.to_dict() for f in flights],
        normalized_type,
        admin_data.get("email", ""),
        admin_name,
    )

    return jsonify({"success": True, "message": "Izvestaj je poslat na email"}), 200
