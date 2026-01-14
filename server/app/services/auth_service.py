# server/app/services/auth_service.py

from datetime import datetime, timedelta
from typing import Tuple, Optional

from flask import current_app

from app import db
from app.models import User, UserRole, LoginAttempt, AccountLock
from app.dto import RegisterUserDTO, LoginDTO
from app.utils import hash_password, verify_password


class AuthService:
    """Service for user auth and registration."""

    def register(self, dto: RegisterUserDTO) -> Tuple[bool, str, Optional[dict]]:
        errors = dto.validate()
        if errors:
            return False, ", ".join(errors), None

        existing = User.query.filter_by(email=dto.email).first()
        if existing:
            return False, "Email vec postoji", None

        user = User(
            ime=dto.ime,
            prezime=dto.prezime,
            email=dto.email,
            password_hash=hash_password(dto.password),
            datum_rodjenja=dto.datum_rodjenja,
            pol=dto.pol,
            drzava=dto.drzava,
            ulica=dto.ulica,
            broj=dto.broj,
            stanje_racuna=dto.stanje_racuna,
            profilna_slika=dto.profilna_slika,
            uloga=UserRole.KORISNIK,
            aktivan=True,
        )

        try:
            db.session.add(user)
            db.session.commit()
            return True, "Registracija uspesna", user.to_dict()
        except Exception as e:
            db.session.rollback()
            return False, f"Greska pri registraciji: {str(e)}", None

    def login(self, dto: LoginDTO, ip_address: Optional[str] = None) -> Tuple[bool, str, Optional[User]]:
        errors = dto.validate()
        if errors:
            return False, ", ".join(errors), None

        lock = self._get_lock(dto.email)
        if lock and lock.is_locked():
            remaining_seconds = (lock.zakljucan_do - datetime.utcnow()).total_seconds()
            remaining_minutes = int(remaining_seconds // 60)
            remaining_secs = int(remaining_seconds % 60)
            if remaining_minutes > 0:
                return False, f"Nalog je zaključan. Pokušajte ponovo za {remaining_minutes} min {remaining_secs} sek.", None
            else:
                return False, f"Nalog je zaključan. Pokušajte ponovo za {remaining_secs} sekundi.", None

        user = User.query.filter_by(email=dto.email).first()
        
        # Provjeri da li korisnik postoji
        if not user:
            self._record_attempt(dto.email, ip_address, False)
            self._increment_lock(dto.email)
            try:
                db.session.commit()
            except Exception:
                db.session.rollback()
            return False, "Korisnik sa ovim emailom ne postoji", None
        
        # Provjeri lozinku
        if not verify_password(dto.password, user.password_hash):
            self._record_attempt(dto.email, ip_address, False)
            lock_result = self._increment_lock(dto.email)
            try:
                db.session.commit()
            except Exception:
                db.session.rollback()
            
            # Provjeri koliko pokušaja je ostalo
            current_lock = self._get_lock(dto.email)
            if current_lock and current_lock.broj_pokusaja > 0:
                attempts_left = 3 - current_lock.broj_pokusaja
                if attempts_left > 0:
                    return False, f"Pogrešna lozinka. Preostalo pokušaja: {attempts_left}", None
                else:
                    return False, "Pogrešna lozinka. Nalog je zaključan na 1 minut.", None
            return False, "Pogrešna lozinka", None

        if not user.aktivan:
            return False, "Nalog je deaktiviran. Kontaktirajte administratora.", None

        self._record_attempt(dto.email, ip_address, True)
        self._clear_lock(dto.email)
        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            return False, f"Greska pri prijavi: {str(e)}", None

        return True, "Prijava uspesna", user

    def _get_lock(self, email: str) -> Optional[AccountLock]:
        return AccountLock.query.filter_by(email=email).first()

    def _increment_lock(self, email: str) -> None:
        now = datetime.utcnow()
        lock = AccountLock.query.filter_by(email=email).first()

        if not lock:
            lock = AccountLock(email=email, zakljucan_do=now, broj_pokusaja=1)
            db.session.add(lock)
        else:
            if lock.zakljucan_do and lock.zakljucan_do < now:
                lock.broj_pokusaja = 0
            lock.broj_pokusaja += 1

        if lock.broj_pokusaja >= 3:
            lock_seconds = int(current_app.config.get("LOCK_SECONDS", 60))
            lock.zakljucan_do = now + timedelta(seconds=lock_seconds)
            lock.broj_pokusaja = 0
        else:
            lock.zakljucan_do = now

    def _clear_lock(self, email: str) -> None:
        lock = AccountLock.query.filter_by(email=email).first()
        if lock:
            db.session.delete(lock)

    def _record_attempt(self, email: str, ip_address: Optional[str], success: bool) -> None:
        attempt = LoginAttempt(
            email=email,
            ip_adresa=ip_address,
            uspesno=success,
        )
        db.session.add(attempt)