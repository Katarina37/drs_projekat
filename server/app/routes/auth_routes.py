# server/app/routes/auth_routes.py

from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity

from app.services import AuthService, UserService
from app.dto import RegisterUserDTO, LoginDTO

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    dto = RegisterUserDTO.from_dict(data)
    service = AuthService()

    success, message, user_data = service.register(dto)
    if success:
        return jsonify({"success": True, "message": message, "data": user_data}), 201
    return jsonify({"success": False, "message": message}), 400


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    dto = LoginDTO.from_dict(data)
    service = AuthService()

    success, message, user = service.login(dto, request.remote_addr)
    if not success:
        return jsonify({"success": False, "message": message}), 401

    identity = {
        "id": user.id,
        "email": user.email,
        "uloga": user.uloga.value,
        "ime": user.ime,
        "prezime": user.prezime,
    }
    access_token = create_access_token(identity=identity)
    return jsonify(
        {
            "success": True,
            "message": message,
            "access_token": access_token,
            "user": user.to_dict(),
        }
    ), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    identity = get_jwt_identity()
    return jsonify({"success": True, "data": identity}), 200


@auth_bp.route("/profile", methods=["GET"])
@jwt_required()
def profile():
    identity = get_jwt_identity() or {}
    user_id = identity.get("id")
    if not user_id:
        return jsonify({"success": False, "message": "Nevalidan token"}), 401

    user_service = UserService()
    user = user_service.get_user_by_id(user_id)
    if not user:
        return jsonify({"success": False, "message": "Korisnik nije pronadjen"}), 404

    return jsonify({"success": True, "data": user.to_dict()}), 200


@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    # JWT je stateless; klijent uklanja token lokalno.
    return jsonify({"success": True, "message": "Uspesno ste odjavljeni"}), 200
