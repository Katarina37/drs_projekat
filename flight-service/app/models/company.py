# flight-service/app/models/company.py

from datetime import datetime
from app import db


class Company(db.Model):
    __tablename__ = 'companies'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    naziv = db.Column(db.String(200), nullable=False)
    kod = db.Column(db.String(10), nullable=False)
    drzava = db.Column(db.String(100), nullable=True)
    aktivna = db.Column(db.Boolean, default=True, nullable=False)
    kreirana = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'naziv': self.naziv,
            'kod': self.kod,
            'drzava': self.drzava,
            'aktivna': self.aktivna
        }