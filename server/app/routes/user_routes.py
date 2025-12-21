# server/app/routes/user_routes.py

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.services import UserService
from app.dto import UpdateUserDTO, ChangeRoleDTO, DepositDTO

user_bp = Blueprint("users", __name__)


def _role_check(*allowed_roles) -> bool:
    identity = get_jwt_identity() or {}
    return identity.get("uloga") in allowed_roles


@user_bp.route("/", methods=["GET"])
@jwt_required()
def get_users():
    if not _role_check("ADMINISTRATOR"):
        return jsonify({"success": False, "message": "Pristup odbijen"}), 403

    user_service = UserService()
    users = user_service.get_all_users()
    return jsonify({"success": True, "data": [u.to_dict() for u in users]}), 200


@user_bp.route("/<int:user_id>", methods=["GET"])
@jwt_required()
def get_user(user_id: int):
    identity = get_jwt_identity() or {}
    if identity.get("uloga") != "ADMINISTRATOR" and identity.get("id") != user_id:
        return jsonify({"success": False, "message": "Pristup odbijen"}), 403

    user_service = UserService()
    user = user_service.get_user_by_id(user_id)
    if not user:
        return jsonify({"success": False, "message": "Korisnik nije pronadjen"}), 404

    return jsonify({"success": True, "data": user.to_dict()}), 200


@user_bp.route("/<int:user_id>", methods=["PUT"])
@jwt_required()
def update_user(user_id: int):
    identity = get_jwt_identity() or {}
    if identity.get("uloga") != "ADMINISTRATOR" and identity.get("id") != user_id:
        return jsonify({"success": False, "message": "Pristup odbijen"}), 403

    data = request.get_json() or {}
    dto = UpdateUserDTO.from_dict(data)

    user_service = UserService()
    success, message, user_data = user_service.update_user(user_id, dto)

    if success:
        return jsonify({"success": True, "message": message, "data": user_data}), 200
    return jsonify({"success": False, "message": message}), 400


@user_bp.route("/change-role", methods=["POST"])
@jwt_required()
def change_role():
    identity = get_jwt_identity() or {}
    if identity.get("uloga") != "ADMINISTRATOR":
        return jsonify({"success": False, "message": "Pristup odbijen"}), 403

    data = request.get_json() or {}
    dto = ChangeRoleDTO.from_dict(data)

    user_service = UserService()
    success, message, user_data = user_service.change_role(dto, identity.get("id"))

    if success:
        return jsonify({"success": True, "message": message, "data": user_data}), 200
    return jsonify({"success": False, "message": message}), 400


@user_bp.route("/<int:user_id>", methods=["DELETE"])
@jwt_required()
def delete_user(user_id: int):
    identity = get_jwt_identity() or {}
    if identity.get("uloga") != "ADMINISTRATOR":
        return jsonify({"success": False, "message": "Pristup odbijen"}), 403

    user_service = UserService()
    success, message = user_service.delete_user(user_id, identity.get("id"))

    if success:
        return jsonify({"success": True, "message": message}), 200
    return jsonify({"success": False, "message": message}), 400


@user_bp.route("/<int:user_id>/deposit", methods=["POST"])
@jwt_required()
def deposit(user_id: int):
    identity = get_jwt_identity() or {}
    if identity.get("uloga") != "ADMINISTRATOR" and identity.get("id") != user_id:
        return jsonify({"success": False, "message": "Pristup odbijen"}), 403

    data = request.get_json() or {}
    dto = DepositDTO.from_dict(data)

    user_service = UserService()
    success, message, stanje = user_service.deposit(user_id, dto)

    if success:
        return jsonify({"success": True, "message": message, "stanje_racuna": stanje}), 200
    return jsonify({"success": False, "message": message}), 400
