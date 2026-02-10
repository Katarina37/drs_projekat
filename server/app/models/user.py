# server/app/models/user.py

from datetime import datetime
from enum import Enum
from sqlalchemy.dialects.mysql import LONGTEXT
from app import db



class UserRole(str, Enum):
    """Enum za korisničke uloge u sistemu."""
    KORISNIK = "KORISNIK"
    MENADZER = "MENADZER"
    ADMINISTRATOR = "ADMINISTRATOR"


class User(db.Model):
    """
    Model korisnika za DB1.
    Čuva podatke o registrovanim korisnicima, uključujući lične podatke,
    kredencijale i stanje računa.
    """
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # Lični podaci
    ime = db.Column(db.String(100), nullable=False)
    prezime = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    datum_rodjenja = db.Column(db.Date, nullable=False)
    pol = db.Column(db.String(10), nullable=False)  # 'M' ili 'Z'
    
    # Adresa
    drzava = db.Column(db.String(100), nullable=False)
    ulica = db.Column(db.String(200), nullable=False)
    broj = db.Column(db.String(20), nullable=False)
    
    # Autentifikacija
    password_hash = db.Column(db.String(255), nullable=False)
    
    # Uloga u sistemu
    uloga = db.Column(db.Enum(UserRole), default=UserRole.KORISNIK, nullable=False)
    
    # Finansije - stanje na računu za kupovinu karata
    stanje_racuna = db.Column(db.Numeric(12, 2), default=0.00, nullable=False)
    
    # Profilna slika (base64) - LONGTEXT može držati do 4GB
    profilna_slika = db.Column(LONGTEXT, nullable=True)
    
    # Vremenski podaci
    kreiran = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    azuriran = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Status naloga
    aktivan = db.Column(db.Boolean, default=True, nullable=False)

    def __repr__(self):
        return f'<User {self.email} ({self.uloga.value})>'

    def to_dict(self, include_sensitive=False):
        """Konvertuje korisnika u rečnik za JSON odgovor."""
        data = {
            'id': self.id,
            'ime': self.ime,
            'prezime': self.prezime,
            'email': self.email,
            'datum_rodjenja': self.datum_rodjenja.isoformat() if self.datum_rodjenja else None,
            'pol': self.pol,
            'drzava': self.drzava,
            'ulica': self.ulica,
            'broj': self.broj,
            'uloga': self.uloga.value,
            'stanje_racuna': float(self.stanje_racuna),
            'profilna_slika': self.profilna_slika,
            'kreiran': self.kreiran.isoformat() if self.kreiran else None,
            'azuriran': self.azuriran.isoformat() if self.azuriran else None,
            'aktivan': self.aktivan
        }
        return data


class LoginAttempt(db.Model):
    """
    Model za praćenje neuspešnih pokušaja prijave.
    Koristi se za implementaciju zaključavanja naloga nakon 3 neuspešna pokušaja.
    """
    __tablename__ = 'login_attempts'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    email = db.Column(db.String(255), nullable=False, index=True)
    ip_adresa = db.Column(db.String(45), nullable=True)  # Podržava IPv6
    vreme_pokusaja = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    uspesno = db.Column(db.Boolean, default=False, nullable=False)

    def __repr__(self):
        return f'<LoginAttempt {self.email} at {self.vreme_pokusaja}>'


class AccountLock(db.Model):
    """
    Model za praćenje zaključanih naloga.
    Nalog se zaključava na određeno vreme nakon previše neuspešnih pokušaja.
    """
    __tablename__ = 'account_locks'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    email = db.Column(db.String(255), nullable=False, unique=True, index=True)
    zakljucan_do = db.Column(db.DateTime, nullable=False)
    broj_pokusaja = db.Column(db.Integer, default=0, nullable=False)
    kreiran = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f'<AccountLock {self.email} until {self.zakljucan_do}>'

    def is_locked(self):
        """Proverava da li je nalog još uvek zaključan."""
        return datetime.utcnow() < self.zakljucan_do