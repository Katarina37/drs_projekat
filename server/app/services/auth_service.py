# server/app/services/auth_service.py

from datetime import datetime, timedelta
from typing import Tuple, Optional
import redis
import os

from flask import current_app

from app import db
from app.models import User, UserRole, LoginAttempt, AccountLock
from app.dto import RegisterUserDTO, LoginDTO
from app.utils import hash_password, verify_password



class AuthService:
    """Service for user auth and registration."""

    # Konstante za lockout
    MAX_FAILED_ATTEMPTS = 3
    LOCKOUT_SECONDS = int(os.getenv('LOCK_SECONDS', '60'))


    def __init__(self):
        """Inicijalizacija servisa sa Redis konekcijom."""
        redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
        self.redis_client = redis.from_url(redis_url, decode_responses=True)

    def _get_lockout_key(self, email: str) -> str:
        """Vraća Redis ključ za lockout."""
        return f"lockout:{email}"

    def _get_attempts_key(self, email: str) -> str:
        """Vraća Redis ključ za broj pokušaja."""
        return f"login_attempts:{email}"

    def _is_locked_out(self, email: str) -> Tuple[bool, int]:
        """
        Proverava da li je korisnik zaključan.
        
        Returns:
            Tuple (is_locked, remaining_seconds)
        """
        lockout_key = self._get_lockout_key(email)
        ttl = self.redis_client.ttl(lockout_key)
        
        if ttl > 0:
            return True, ttl
        return False, 0

    def _record_failed_attempt(self, email: str) -> int:
        """
        Beleži neuspešan pokušaj prijave.
        
        Returns:
            Broj preostalih pokušaja pre zaključavanja
        """
        attempts_key = self._get_attempts_key(email)
        
        # Inkrementiraj broj pokušaja
        attempts = self.redis_client.incr(attempts_key)
        
        # Postavi TTL na ključ ako je prvi pokušaj (resetuje se nakon 5 minuta neaktivnosti)
        if attempts == 1:
            self.redis_client.expire(attempts_key, 300)  # 5 minuta
        
        # Ako je dostignut maksimum, zaključaj nalog
        if attempts >= self.MAX_FAILED_ATTEMPTS:
            lockout_key = self._get_lockout_key(email)
            self.redis_client.setex(lockout_key, self.LOCKOUT_SECONDS, "1")
            # Resetuj brojač pokušaja
            self.redis_client.delete(attempts_key)
            return 0
        
        return self.MAX_FAILED_ATTEMPTS - attempts

    def _clear_failed_attempts(self, email: str) -> None:
        """Briše sve neuspešne pokušaje nakon uspešne prijave."""
        attempts_key = self._get_attempts_key(email)
        lockout_key = self._get_lockout_key(email)
        self.redis_client.delete(attempts_key)
        self.redis_client.delete(lockout_key)

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

        # Proveri da li je nalog zaključan
        is_locked, remaining_seconds = self._is_locked_out(dto.email)
        if is_locked:
            return False, f"Nalog je zaključan. Pokušajte ponovo za {remaining_seconds} sekundi.", None

        user = User.query.filter_by(email=dto.email).first()
        
        # Provjeri da li korisnik postoji
        if not user:
            attempts_left = self._record_failed_attempt(dto.email)
            self._record_login_attempt(dto.email, ip_address, False)
            
            if attempts_left == 0:
                return False, f"Korisnik sa ovim emailom ne postoji. Nalog je zaključan na {self.LOCKOUT_SECONDS} sekundi.", None
            return False, f"Korisnik sa ovim emailom ne postoji. Preostalo pokušaja: {attempts_left}", None
        
        # Provjeri lozinku
        if not verify_password(dto.password, user.password_hash):
            attempts_left = self._record_failed_attempt(dto.email)
            self._record_login_attempt(dto.email, ip_address, False)
            
            if attempts_left == 0:
                return False, f"Pogrešna lozinka. Nalog je zaključan na {self.LOCKOUT_SECONDS} sekundi.", None
            return False, f"Pogrešna lozinka. Preostalo pokušaja: {attempts_left}", None

        if not user.aktivan:
            return False, "Nalog je deaktiviran. Kontaktirajte administratora.", None

        # Uspešna prijava - očisti sve neuspešne pokušaje
        self._clear_failed_attempts(dto.email)
        self._record_login_attempt(dto.email, ip_address, True)

        return True, "Prijava uspesna", user

    def _record_login_attempt(self, email: str, ip_address: Optional[str], success: bool) -> None:
        """Beleži pokušaj prijave u bazu za audit."""
        try:
            attempt = LoginAttempt(
                email=email,
                ip_adresa=ip_address,
                uspesno=success,
            )
            db.session.add(attempt)
            db.session.commit()
        except Exception:
            db.session.rollback()


class TokenBlacklistService:
    """Servis za upravljanje blacklist-om JWT tokena."""
    
    def __init__(self):
        """Inicijalizacija servisa sa Redis konekcijom."""
        redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
        self.redis_client = redis.from_url(redis_url, decode_responses=True)

    def _get_blacklist_key(self, jti: str) -> str:
        """Vraća Redis ključ za blacklistani token."""
        return f"token_blacklist:{jti}"

    def blacklist_token(self, jti: str, expires_in: int = 86400) -> bool:
        """
        Dodaje token na blacklist.
        
        Args:
            jti: Jedinstveni identifikator tokena
            expires_in: Vreme u sekundama koliko token ostaje na blacklisti (default 24h)
        
        Returns:
            True ako je uspešno dodato
        """
        try:
            key = self._get_blacklist_key(jti)
            self.redis_client.setex(key, expires_in, "1")
            return True
        except Exception as e:
            print(f"[TOKEN BLACKLIST] Greška pri blacklistanju tokena: {str(e)}")
            return False

    def is_blacklisted(self, jti: str) -> bool:
        """
        Proverava da li je token na blacklisti.
        
        Args:
            jti: Jedinstveni identifikator tokena
        
        Returns:
            True ako je token blacklistovan
        """
        try:
            key = self._get_blacklist_key(jti)
            return self.redis_client.exists(key) > 0
        except Exception as e:
            print(f"[TOKEN BLACKLIST] Greška pri proveri tokena: {str(e)}")
            # U slučaju greške, pretpostavi da token nije blacklistovan
            # da ne bi blokirali legitimne korisnike
            return False