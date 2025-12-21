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
            return False, f"Nalog je zakljucan do {lock.zakljucan_do.isoformat()}", None

        user = User.query.filter_by(email=dto.email).first()
        if not user or not verify_password(dto.password, user.password_hash):
            self._record_attempt(dto.email, ip_address, False)
            self._increment_lock(dto.email)
            try:
                db.session.commit()
            except Exception:
                db.session.rollback()
            return False, "Nevalidan email ili lozinka", None

        if not user.aktivan:
            return False, "Nalog je deaktiviran", None

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
