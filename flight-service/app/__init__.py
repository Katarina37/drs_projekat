# flight-service/app/__init__.py

import os
from flask import Flask
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
    """
    app = Flask(__name__)
    
    # --- KONFIGURACIJA BAZE PODATAKA ---
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DB2_URL', 'mysql+pymysql://root:root@localhost:3308/flights_db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    
    # DODAJ OVO: Sprečava "SSL error: decryption failed" kod Eventlet-a
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        "pool_pre_ping": True,
        "pool_recycle": 280,
    }

    # --- KONFIGURACIJA ZA EMAIL (DODAJ OVO) ---
    app.config['MAIL_SERVER'] = os.getenv('SMTP_HOST', 'smtp.gmail.com')
    app.config['MAIL_PORT'] = int(os.getenv('SMTP_PORT', 587))
    app.config['MAIL_USE_TLS'] = True  # Ključno za port 587 i Render
    app.config['MAIL_USE_SSL'] = False
    app.config['MAIL_USERNAME'] = os.getenv('SMTP_USER')
    app.config['MAIL_PASSWORD'] = os.getenv('SMTP_PASSWORD')
    app.config['MAIL_DEFAULT_SENDER'] = os.getenv('SMTP_USER')
    
    # --- OSTALA PODEŠAVANJA ---
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET', 'supersecret123')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 86400  # 24 sata
    app.config['JWT_VERIFY_SUB'] = False
    
    # Redis konfiguracija za keš
    app.config['REDIS_URL'] = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    
    # Server URL za internu komunikaciju
    app.config['SERVER_URL'] = os.getenv('SERVER_URL', 'http://server:5001')
    
    # Inicijalizacija ekstenzija sa app
    db.init_app(app)
    jwt.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    socketio.init_app(app, message_queue=app.config['REDIS_URL'])
    
    # Registracija blueprintova (ruta)
    from app.routes.flight_routes import flight_bp
    from app.routes.airline_routes import airline_bp
    from app.routes.ticket_routes import ticket_bp
    from app.routes.rating_routes import rating_bp
    
    app.register_blueprint(flight_bp, url_prefix='/api/flights')
    app.register_blueprint(airline_bp, url_prefix='/api/airlines')
    app.register_blueprint(ticket_bp, url_prefix='/api/tickets')
    app.register_blueprint(rating_bp, url_prefix='/api/ratings')
    
    # Registracija WebSocket handlera
    from app.routes import websocket_handlers
    websocket_handlers.register_handlers(socketio)
    
    # Kreiranje tabela
    with app.app_context():
        db.create_all()
        
        # Kreiranje demo avio kompanija
        from app.models import Airline
        demo_airlines = [
            {'naziv': 'Air Serbia', 'kod': 'JU', 'drzava': 'Srbija'},
            {'naziv': 'Lufthansa', 'kod': 'LH', 'drzava': 'Nemačka'},
            {'naziv': 'Turkish Airlines', 'kod': 'TK', 'drzava': 'Turska'},
            {'naziv': 'Ryanair', 'kod': 'FR', 'drzava': 'Irska'},
            {'naziv': 'Wizz Air', 'kod': 'W6', 'drzava': 'Mađarska'},
        ]
        
        for airline_data in demo_airlines:
            existing = Airline.query.filter_by(kod=airline_data['kod']).first()
            if not existing:
                airline = Airline(**airline_data)
                db.session.add(airline)
        
        db.session.commit()
        print('[FLIGHT-SERVICE] Demo avio kompanije kreirane')
    
    return app