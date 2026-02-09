# flight-service/app/models/booking.py

from datetime import datetime
from app import db


class Booking(db.Model):
    __tablename__ = 'bookings'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    flight_id = db.Column(db.Integer, db.ForeignKey('flights.id'), nullable=False)
    user_id = db.Column(db.Integer, nullable=False)
    cena = db.Column(db.Numeric(10, 2), nullable=False)
    otkazana = db.Column(db.Boolean, default=False, nullable=False)
    kreirana = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    let = db.relationship('Flight', backref='booking_rezervacije')

    def to_dict(self):
        return {
            'id': self.id,
            'flight_id': self.flight_id,
            'user_id': self.user_id,
            'cena': float(self.cena),
            'otkazana': self.otkazana,
            'kreirana': self.kreirana.isoformat() if self.kreirana else None
        }