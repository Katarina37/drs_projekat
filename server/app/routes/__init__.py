# server/app/routes/__init__.py

from app.routes.auth_routes import auth_bp
from app.routes.user_routes import user_bp
from app.routes.internal_routes import internal_bp

__all__ = ['auth_bp', 'user_bp', 'internal_bp']