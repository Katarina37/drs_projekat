# server/app/__init__.py

import os
from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_socketio import SocketIO
from dotenv import load_dotenv

# Učitavanje environment varijabli
load_dotenv()

# Inicijalizacija ekstenzija
db = SQLAlchemy()
jwt = JWTManager()
socketio = SocketIO(cors_allowed_origins="*", async_mode='eventlet')


def create_app():
    """
    Factory funkcija za kreiranje Flask aplikacije.
    
    Returns:
        Flask app instanca
    """
    app = Flask(__name__)
    
    # Konfiguracija
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DB1_URL', 'mysql+pymysql://root:root@localhost:3307/auth_db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET', 'supersecret123')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 86400  # 24 sata
    app.config['JWT_VERIFY_SUB'] = False
    
    # DODANO: Povećan limit za upload slika (16 MB)
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB
    
    # SMTP konfiguracija za email
    app.config['SMTP_HOST'] = os.getenv('SMTP_HOST', 'smtp.gmail.com')
    app.config['SMTP_PORT'] = int(os.getenv('SMTP_PORT', 587))
    app.config['SMTP_USER'] = os.getenv('SMTP_USER', '')
    app.config['SMTP_PASSWORD'] = os.getenv('SMTP_PASSWORD', '')

    # Redis konfiguracija za WebSocket message queue
    app.config['REDIS_URL'] = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    
    # Lock duration za neuspešne prijave (više se ne koristi - sada je u auth_service.py)
    app.config['LOCK_SECONDS'] = int(os.getenv('LOCK_SECONDS', 20))
    
    # Inicijalizacija ekstenzija sa app
    db.init_app(app)
    jwt.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    socketio.init_app(app, message_queue=app.config['REDIS_URL'])
    
    # JWT Token Blacklist callback
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        """
        Callback koji se poziva za svaki zahtev sa JWT tokenom.
        Proverava da li je token na blacklisti (revociran).
        """
        from app.services.auth_service import TokenBlacklistService
        
        jti = jwt_payload.get("jti")
        if not jti:
            return False
        
        blacklist_service = TokenBlacklistService()
        return blacklist_service.is_blacklisted(jti)
    
    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        """
        Callback koji se poziva kada je token revociran (na blacklisti).
        """
        return jsonify({
            "success": False,
            "message": "Token je istekao ili je odjava već izvršena. Molimo prijavite se ponovo."
        }), 401
    
    # Registracija blueprintova (ruta)
    from app.routes.auth_routes import auth_bp
    from app.routes.user_routes import user_bp
    from app.routes.internal_routes import internal_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(user_bp, url_prefix='/api/users')
    app.register_blueprint(internal_bp, url_prefix='/api/internal')

    # Registracija WebSocket handlera
    from app.routes import websocket_handlers
    websocket_handlers.register_handlers(socketio)
    
    # Kreiranje tabela
    with app.app_context():
        db.create_all()
        
        # Kreiranje admin korisnika ako ne postoji
        from app.models import User, UserRole
        from app.utils import hash_password
        
        admin = User.query.filter_by(email='admin@admin.com').first()
        if not admin:
            admin = User(
                ime='Admin',
                prezime='Administrator',
                email='admin@admin.com',
                password_hash=hash_password('admin123'),
                datum_rodjenja='1990-01-01',
                pol='M',
                drzava='Srbija',
                ulica='Adminova',
                broj='1',
                uloga=UserRole.ADMINISTRATOR,
                stanje_racuna=10000.00
            )
            db.session.add(admin)
            db.session.commit()
            print('[SERVER] Admin korisnik kreiran: admin@admin.com / admin123')
    
    return app