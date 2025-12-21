# server/app/__init__.py

import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from dotenv import load_dotenv

# Učitavanje environment varijabli
load_dotenv()

# Inicijalizacija ekstenzija
db = SQLAlchemy()
jwt = JWTManager()


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
    
    # SMTP konfiguracija za email
    app.config['SMTP_HOST'] = os.getenv('SMTP_HOST', 'smtp.gmail.com')
    app.config['SMTP_PORT'] = int(os.getenv('SMTP_PORT', 587))
    app.config['SMTP_USER'] = os.getenv('SMTP_USER', '')
    app.config['SMTP_PASSWORD'] = os.getenv('SMTP_PASSWORD', '')
    
    # Lock duration za neuspešne prijave
    app.config['LOCK_SECONDS'] = int(os.getenv('LOCK_SECONDS', 60))
    
    # Inicijalizacija ekstenzija sa app
    db.init_app(app)
    jwt.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    # Registracija blueprintova (ruta)
    from app.routes.auth_routes import auth_bp
    from app.routes.user_routes import user_bp
    from app.routes.internal_routes import internal_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(user_bp, url_prefix='/api/users')
    app.register_blueprint(internal_bp, url_prefix='/api/internal')
    
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