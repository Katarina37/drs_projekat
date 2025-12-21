# flight-service/app/models/flight.py

from datetime import datetime
from enum import Enum
from app import db


class FlightStatus(str, Enum):
    """Enum za status leta."""
    CEKA_ODOBRENJE = "CEKA_ODOBRENJE"  # Let čeka odobrenje od admina
    ODOBREN = "ODOBREN"                  # Let je odobren i vidljiv korisnicima
    ODBIJEN = "ODBIJEN"                  # Let je odbijen, vraćen menadžeru na izmenu
    U_TOKU = "U_TOKU"                    # Let je trenutno u toku
    ZAVRSEN = "ZAVRSEN"                  # Let je završen
    OTKAZAN = "OTKAZAN"                  # Let je otkazan


class Airline(db.Model):
    """
    Model avio kompanije za DB2.
    Čuva informacije o avio kompanijama koje vrše letove.
    """
    __tablename__ = 'airlines'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    naziv = db.Column(db.String(200), unique=True, nullable=False)
    kod = db.Column(db.String(10), unique=True, nullable=False)  # IATA kod (npr. "JU", "AF")
    logo = db.Column(db.Text, nullable=True)  # URL ili base64 logoa
    drzava = db.Column(db.String(100), nullable=True)
    aktivna = db.Column(db.Boolean, default=True, nullable=False)
    kreirana = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relacija sa letovima
    letovi = db.relationship('Flight', backref='avio_kompanija', lazy='dynamic')

    def __repr__(self):
        return f'<Airline {self.naziv} ({self.kod})>'

    def to_dict(self):
        """Konvertuje avio kompaniju u rečnik za JSON odgovor."""
        return {
            'id': self.id,
            'naziv': self.naziv,
            'kod': self.kod,
            'logo': self.logo,
            'drzava': self.drzava,
            'aktivna': self.aktivna
        }


class Flight(db.Model):
    """
    Model leta za DB2.
    Čuva sve informacije o letu uključujući vreme, destinacije i status.
    """
    __tablename__ = 'flights'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # Osnovni podaci o letu
    naziv = db.Column(db.String(200), nullable=False)
    airline_id = db.Column(db.Integer, db.ForeignKey('airlines.id'), nullable=False, index=True)
    
    # Geografski podaci
    duzina_km = db.Column(db.Numeric(10, 2), nullable=False)  # Dužina leta u kilometrima
    aerodrom_polaska = db.Column(db.String(200), nullable=False)
    aerodrom_dolaska = db.Column(db.String(200), nullable=False)
    
    # Vremenski podaci
    vreme_polaska = db.Column(db.DateTime, nullable=False)
    trajanje_minuta = db.Column(db.Integer, nullable=False)  # Trajanje leta u minutima
    
    # Cena
    cena_karte = db.Column(db.Numeric(10, 2), nullable=False)
    
    # Ko je kreirao let (ID menadžera iz DB1)
    kreirao_id = db.Column(db.Integer, nullable=False)
    
    # Status leta
    status = db.Column(db.Enum(FlightStatus), default=FlightStatus.CEKA_ODOBRENJE, nullable=False, index=True)
    
    # Razlog odbijanja (ako je odbijen)
    razlog_odbijanja = db.Column(db.Text, nullable=True)
    
    # Broj dostupnih mesta
    ukupno_mesta = db.Column(db.Integer, default=100, nullable=False)
    
    # Vremenski podaci kreiranja i ažuriranja
    kreiran = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    azuriran = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relacija sa rezervacijama
    rezervacije = db.relationship('Ticket', backref='let', lazy='dynamic')
    # Relacija sa ocenama
    ocene = db.relationship('FlightRating', backref='let', lazy='dynamic')

    def __repr__(self):
        return f'<Flight {self.naziv} ({self.status.value})>'

    @property
    def vreme_dolaska(self):
        """Izračunava vreme dolaska na osnovu vremena polaska i trajanja."""
        from datetime import timedelta
        return self.vreme_polaska + timedelta(minutes=self.trajanje_minuta)

    @property
    def slobodna_mesta(self):
        """Vraća broj slobodnih mesta."""
        prodato = self.rezervacije.filter_by(otkazana=False).count()
        return self.ukupno_mesta - prodato

    @property
    def prosecna_ocena(self):
        """Vraća prosečnu ocenu leta."""
        ocene = [r.ocena for r in self.ocene.all()]
        if not ocene:
            return None
        return sum(ocene) / len(ocene)

    def to_dict(self, include_airline=True):
        """Konvertuje let u rečnik za JSON odgovor."""
        data = {
            'id': self.id,
            'naziv': self.naziv,
            'airline_id': self.airline_id,
            'duzina_km': float(self.duzina_km),
            'aerodrom_polaska': self.aerodrom_polaska,
            'aerodrom_dolaska': self.aerodrom_dolaska,
            'vreme_polaska': self.vreme_polaska.isoformat() if self.vreme_polaska else None,
            'vreme_dolaska': self.vreme_dolaska.isoformat() if self.vreme_polaska else None,
            'trajanje_minuta': self.trajanje_minuta,
            'cena_karte': float(self.cena_karte),
            'kreirao_id': self.kreirao_id,
            'status': self.status.value,
            'razlog_odbijanja': self.razlog_odbijanja,
            'ukupno_mesta': self.ukupno_mesta,
            'slobodna_mesta': self.slobodna_mesta,
            'prosecna_ocena': self.prosecna_ocena,
            'kreiran': self.kreiran.isoformat() if self.kreiran else None
        }
        if include_airline and self.avio_kompanija:
            data['avio_kompanija'] = self.avio_kompanija.to_dict()
        return data


class Ticket(db.Model):
    """
    Model karte/rezervacije za DB2.
    Čuva informacije o kupljenim kartama.
    """
    __tablename__ = 'tickets'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # Referenca na let
    flight_id = db.Column(db.Integer, db.ForeignKey('flights.id'), nullable=False, index=True)
    
    # ID korisnika iz DB1
    user_id = db.Column(db.Integer, nullable=False, index=True)
    
    # Cena u trenutku kupovine
    cena = db.Column(db.Numeric(10, 2), nullable=False)
    
    # Status karte
    otkazana = db.Column(db.Boolean, default=False, nullable=False)
    
    # Vremenski podaci
    kupljena = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f'<Ticket {self.id} for Flight {self.flight_id}>'

    def to_dict(self, include_flight=True):
        """Konvertuje kartu u rečnik za JSON odgovor."""
        data = {
            'id': self.id,
            'flight_id': self.flight_id,
            'user_id': self.user_id,
            'cena': float(self.cena),
            'otkazana': self.otkazana,
            'kupljena': self.kupljena.isoformat() if self.kupljena else None
        }
        if include_flight and self.let:
            data['let'] = self.let.to_dict(include_airline=True)
        return data


class FlightRating(db.Model):
    """
    Model ocene leta za DB2.
    Korisnici mogu oceniti let nakon njegovog završetka.
    """
    __tablename__ = 'flight_ratings'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # Referenca na let
    flight_id = db.Column(db.Integer, db.ForeignKey('flights.id'), nullable=False, index=True)
    
    # ID korisnika iz DB1
    user_id = db.Column(db.Integer, nullable=False, index=True)
    
    # Ocena (1-5)
    ocena = db.Column(db.Integer, nullable=False)
    
    # Komentar (opcionalno)
    komentar = db.Column(db.Text, nullable=True)
    
    # Vreme ocenjivanja
    kreirana = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Jedinstven par (flight_id, user_id) - korisnik može oceniti let samo jednom
    __table_args__ = (
        db.UniqueConstraint('flight_id', 'user_id', name='unique_user_flight_rating'),
    )

    def __repr__(self):
        return f'<FlightRating {self.ocena} for Flight {self.flight_id}>'

    def to_dict(self, include_flight=False):
        """Konvertuje ocenu u rečnik za JSON odgovor."""
        data = {
            'id': self.id,
            'flight_id': self.flight_id,
            'user_id': self.user_id,
            'ocena': self.ocena,
            'komentar': self.komentar,
            'kreirana': self.kreirana.isoformat() if self.kreirana else None
        }
        if include_flight and self.let:
            data['let'] = self.let.to_dict(include_airline=True)
        return data