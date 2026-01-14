# server/app/routes/auth_routes.py

from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, 
    jwt_required, 
    get_jwt_identity, 
    get_jwt
)

from app.services import AuthService, UserService
from app.services.auth_service import TokenBlacklistService
from app.dto import RegisterUserDTO, LoginDTO

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    try:
        data = request.get_json(force=True, silent=True) or {}
    except Exception as e:
        return jsonify({"success": False, "message": f"Greška pri parsiranju podataka: {str(e)}"}), 400
    
    # Validacija profilne slike - ako je prevelika, odbaci je
    profilna_slika = data.get('profilna_slika')
    if profilna_slika and len(profilna_slika) > 10 * 1024 * 1024:  # 10 MB limit za base64
        return jsonify({"success": False, "message": "Slika je prevelika. Maksimalna veličina je 10 MB."}), 400
    
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
    """
    Server-side odjava - dodaje trenutni JWT token na blacklist.
    Token više neće biti validan čak i ako nije istekao.
    """
    try:
        # Dohvati JTI (JWT ID) iz trenutnog tokena
        jwt_data = get_jwt()
        jti = jwt_data.get("jti")
        
        if jti:
            # Dodaj token na blacklist
            blacklist_service = TokenBlacklistService()
            blacklist_service.blacklist_token(jti)
            print(f"[AUTH] Token {jti[:8]}... je dodat na blacklist")
        
        return jsonify({"success": True, "message": "Uspešno ste odjavljeni"}), 200
    except Exception as e:
        print(f"[AUTH] Greška pri odjavi: {str(e)}")
        # Čak i ako ne uspemo da blacklistamo token, vratimo uspeh
        # jer klijent ionako briše token
        return jsonify({"success": True, "message": "Uspešno ste odjavljeni"}), 200