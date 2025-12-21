# server/app/dto/user_dto.py

from dataclasses import dataclass
from datetime import datetime, date
from typing import Optional, List

from app.models import UserRole


def _parse_date(value) -> Optional[date]:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        value = value.strip()
        if not value:
            return None
        try:
            return datetime.fromisoformat(value).date()
        except ValueError:
            return None
    return None


def _clean_str(value) -> Optional[str]:
    if value is None:
        return None
    value = str(value).strip()
    return value or None


@dataclass
class RegisterUserDTO:
    ime: str
    prezime: str
    email: str
    password: str
    datum_rodjenja: Optional[date]
    pol: str
    drzava: str
    ulica: str
    broj: str
    profilna_slika: Optional[str] = None

    @classmethod
    def from_dict(cls, data: dict) -> "RegisterUserDTO":
        return cls(
            ime=(data.get("ime") or "").strip(),
            prezime=(data.get("prezime") or "").strip(),
            email=(data.get("email") or "").strip().lower(),
            password=data.get("password") or "",
            datum_rodjenja=_parse_date(data.get("datum_rodjenja")),
            pol=(data.get("pol") or "").strip().upper(),
            drzava=(data.get("drzava") or "").strip(),
            ulica=(data.get("ulica") or "").strip(),
            broj=(data.get("broj") or "").strip(),
            profilna_slika=data.get("profilna_slika"),
        )

    def validate(self) -> List[str]:
        errors = []

        if len(self.ime) < 2:
            errors.append("Ime mora imati najmanje 2 karaktera")
        if len(self.prezime) < 2:
            errors.append("Prezime mora imati najmanje 2 karaktera")
        if not self.email or "@" not in self.email:
            errors.append("Email nije validan")
        if not self.password or len(self.password) < 6:
            errors.append("Lozinka mora imati najmanje 6 karaktera")
        if not self.datum_rodjenja:
            errors.append("Datum rodjenja je obavezan")
        if self.pol not in ("M", "Z"):
            errors.append("Pol mora biti M ili Z")
        if not self.drzava:
            errors.append("Drzava je obavezna")
        if not self.ulica:
            errors.append("Ulica je obavezna")
        if not self.broj:
            errors.append("Broj je obavezan")

        return errors


@dataclass
class LoginDTO:
    email: str
    password: str

    @classmethod
    def from_dict(cls, data: dict) -> "LoginDTO":
        return cls(
            email=(data.get("email") or "").strip().lower(),
            password=data.get("password") or "",
        )

    def validate(self) -> List[str]:
        errors = []
        if not self.email:
            errors.append("Email je obavezan")
        if not self.password:
            errors.append("Lozinka je obavezna")
        return errors


@dataclass
class UpdateUserDTO:
    ime: Optional[str] = None
    prezime: Optional[str] = None
    datum_rodjenja: Optional[date] = None
    pol: Optional[str] = None
    drzava: Optional[str] = None
    ulica: Optional[str] = None
    broj: Optional[str] = None
    profilna_slika: Optional[str] = None

    @classmethod
    def from_dict(cls, data: dict) -> "UpdateUserDTO":
        pol = _clean_str(data.get("pol"))
        return cls(
            ime=_clean_str(data.get("ime")),
            prezime=_clean_str(data.get("prezime")),
            datum_rodjenja=_parse_date(data.get("datum_rodjenja")),
            pol=pol.upper() if pol else None,
            drzava=_clean_str(data.get("drzava")),
            ulica=_clean_str(data.get("ulica")),
            broj=_clean_str(data.get("broj")),
            profilna_slika=data.get("profilna_slika"),
        )

    def validate(self) -> List[str]:
        errors = []

        if self.ime is not None and len(self.ime) < 2:
            errors.append("Ime mora imati najmanje 2 karaktera")
        if self.prezime is not None and len(self.prezime) < 2:
            errors.append("Prezime mora imati najmanje 2 karaktera")
        if self.pol is not None and self.pol not in ("M", "Z"):
            errors.append("Pol mora biti M ili Z")

        return errors


@dataclass
class ChangeRoleDTO:
    user_id: int
    nova_uloga: str

    @classmethod
    def from_dict(cls, data: dict) -> "ChangeRoleDTO":
        nova_uloga = _clean_str(data.get("nova_uloga"))
        nova_uloga = nova_uloga.upper() if nova_uloga else ""
        return cls(
            user_id=int(data.get("user_id", 0) or 0),
            nova_uloga=nova_uloga,
        )

    def validate(self) -> List[str]:
        errors = []
        valid_roles = {role.value for role in UserRole}

        if not self.user_id or self.user_id <= 0:
            errors.append("User ID nije validan")
        if self.nova_uloga not in valid_roles:
            errors.append("Uloga nije validna")

        return errors


@dataclass
class DepositDTO:
    iznos: float

    @classmethod
    def from_dict(cls, data: dict) -> "DepositDTO":
        try:
            amount = float(data.get("iznos", 0))
        except (TypeError, ValueError):
            amount = 0.0
        return cls(iznos=amount)

    def validate(self) -> List[str]:
        errors = []
        if self.iznos <= 0:
            errors.append("Iznos mora biti veci od 0")
        return errors
