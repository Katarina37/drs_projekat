# flight-service/app/models/rating.py

from datetime import datetime
from app import db


class Rating(db.Model):
    __tablename__ = 'ratings'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    flight_id = db.Column(db.Integer, db.ForeignKey('flights.id'), nullable=False)
    user_id = db.Column(db.Integer, nullable=False)
    ocena = db.Column(db.Integer, nullable=False)
    komentar = db.Column(db.Text, nullable=True)
    kreirana = db.Column(db.DateTime, default=datetime.now, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'flight_id': self.flight_id,
            'user_id': self.user_id,
            'ocena': self.ocena,
            'komentar': self.komentar,
            'kreirana': self.kreirana.isoformat() if self.kreirana else None
        }