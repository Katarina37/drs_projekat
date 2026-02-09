# flight-service/app/routes/ticket_routes.py

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import os
import requests

from app import socketio
from app.services import TicketService
from app.dto import BuyTicketDTO

ticket_bp = Blueprint("tickets", __name__)


def _role_check(*allowed_roles) -> bool:
    identity = get_jwt_identity() or {}
    return identity.get("uloga") in allowed_roles


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


@ticket_bp.route("/buy", methods=["POST"])
@jwt_required()
def buy_ticket():
    identity = get_jwt_identity() or {}
    if not _role_check("KORISNIK", "MENADZER"):
        return jsonify({"success": False, "message": "Pristup odbijen"}), 403

    data = request.get_json() or {}
    dto = BuyTicketDTO.from_dict(data)

    user_data = _fetch_user_data(identity.get("id"))
    if not user_data:
        return jsonify({"success": False, "message": "Ne mogu da dohvatim korisnika"}), 502

    user_balance = float(user_data.get("stanje_racuna", 0))

    service = TicketService(socketio=socketio)
    success, message = service.buy_ticket_async(dto, identity.get("id"), user_balance)

    if success:
        return jsonify({"success": True, "message": message}), 200
    return jsonify({"success": False, "message": message}), 400


@ticket_bp.route("/", methods=["GET"])
@jwt_required()
def get_user_tickets():
    identity = get_jwt_identity() or {}
    service = TicketService()
    tickets = service.get_user_tickets(identity.get("id"))
    return jsonify({"success": True, "data": [t.to_dict() for t in tickets]}), 200


@ticket_bp.route("/my", methods=["GET"])
@jwt_required()
def get_my_tickets():
    identity = get_jwt_identity() or {}
    service = TicketService()
    tickets = service.get_user_tickets(identity.get("id"))
    return jsonify({"success": True, "data": [t.to_dict() for t in tickets]}), 200


@ticket_bp.route("/<int:ticket_id>", methods=["GET"])
@jwt_required()
def get_ticket(ticket_id: int):
    identity = get_jwt_identity() or {}
    service = TicketService()
    ticket = service.get_ticket_by_id(ticket_id)

    if not ticket:
        return jsonify({"success": False, "message": "Karta nije pronadjena"}), 404
    if identity.get("uloga") != "ADMINISTRATOR" and ticket.user_id != identity.get("id"):
        return jsonify({"success": False, "message": "Pristup odbijen"}), 403

    return jsonify({"success": True, "data": ticket.to_dict()}), 200


@ticket_bp.route("/<int:ticket_id>/cancel", methods=["POST"])
@jwt_required()
def cancel_ticket(ticket_id: int):
    identity = get_jwt_identity() or {}
    service = TicketService(socketio=socketio)
    success, message = service.cancel_ticket(ticket_id, identity.get("id"))

    if success:
        return jsonify({"success": True, "message": message}), 200
    return jsonify({"success": False, "message": message}), 400
