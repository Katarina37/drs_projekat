# server/app/utils/security.py

from functools import wraps

from flask import jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash


def hash_password(password: str) -> str:
    return generate_password_hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return check_password_hash(password_hash, password)


def role_required(*roles):
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            identity = get_jwt_identity() or {}
            if identity.get("uloga") not in roles:
                return jsonify({"success": False, "message": "Pristup odbijen"}), 403
            return fn(*args, **kwargs)

        return wrapper

    return decorator


def admin_required(fn):
    return role_required("ADMINISTRATOR")(fn)


def manager_required(fn):
    return role_required("MENADZER")(fn)


def user_required(fn):
    return role_required("KORISNIK")(fn)
