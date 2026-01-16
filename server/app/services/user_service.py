# server/app/services/user_service.py

from typing import Tuple, Optional, List
from decimal import Decimal

from app import db
from app.models import User, UserRole
from app.dto import UpdateUserDTO, ChangeRoleDTO, DepositDTO
from app.utils import send_role_change_email, hash_password


class UserService:
    """Servis za upravljanje korisnicima."""
    
    def get_user_by_id(self, user_id: int) -> Optional[User]:
        """
        Vraća korisnika po ID-u.
        
        Args:
            user_id: ID korisnika
            
        Returns:
            User objekat ili None
        """
        return User.query.get(user_id)
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        """
        Vraća korisnika po email-u.
        
        Args:
            email: Email adresa
            
        Returns:
            User objekat ili None
        """
        return User.query.filter_by(email=email).first()
    
    def get_all_users(self) -> List[User]:
        """
        Vraća sve korisnike.
        
        Returns:
            Lista User objekata
        """
        return User.query.all()
    
    def update_user(self, user_id: int, dto: UpdateUserDTO) -> Tuple[bool, str, Optional[dict]]:
        """
        Ažurira podatke korisnika.
        
        Args:
            user_id: ID korisnika
            dto: UpdateUserDTO sa novim podacima
            
        Returns:
            Tuple (success, message, user_data)
        """
        errors = dto.validate()
        if errors:
            return False, ', '.join(errors), None
        
        user = User.query.get(user_id)
        if not user:
            return False, 'Korisnik nije pronađen', None
        
        # Ažuriranje polja koja su prisutna
        if dto.ime is not None:
            user.ime = dto.ime
        if dto.prezime is not None:
            user.prezime = dto.prezime
        if dto.email is not None:
            existing = User.query.filter(User.email == dto.email, User.id != user_id).first()
            if existing:
                return False, 'Email vec postoji', None
            user.email = dto.email
        if dto.password is not None:
            user.password_hash = hash_password(dto.password)
        if dto.datum_rodjenja is not None:
            user.datum_rodjenja = dto.datum_rodjenja
        if dto.pol is not None:
            user.pol = dto.pol
        if dto.drzava is not None:
            user.drzava = dto.drzava
        if dto.ulica is not None:
            user.ulica = dto.ulica
        if dto.broj is not None:
            user.broj = dto.broj
        if dto.profilna_slika is not None:
            user.profilna_slika = dto.profilna_slika
        
        try:
            db.session.commit()
            return True, 'Profil uspešno ažuriran', user.to_dict()
        except Exception as e:
            db.session.rollback()
            return False, f'Greška pri ažuriranju: {str(e)}', None
    
    def change_role(self, dto: ChangeRoleDTO, admin_id: int) -> Tuple[bool, str, Optional[dict]]:
        """
        Menja ulogu korisnika (samo admin).
        
        Args:
            dto: ChangeRoleDTO sa novom ulogom
            admin_id: ID administratora koji vrši promenu
            
        Returns:
            Tuple (success, message, user_data)
        """
        errors = dto.validate()
        if errors:
            return False, ', '.join(errors), None
        
        # Provera da admin ne menja sebi ulogu
        if dto.user_id == admin_id:
            return False, 'Ne možete promeniti svoju ulogu', None
        
        user = User.query.get(dto.user_id)
        if not user:
            return False, 'Korisnik nije pronađen', None
        
        # Provera da ne menja drugog admina
       
        if user.uloga == UserRole.ADMINISTRATOR:
            return False, 'Ne možete promeniti ulogu drugog administratora', None
        stara_uloga = user.uloga.value
        user.uloga = UserRole(dto.nova_uloga)
        nova_uloga = UserRole(dto.nova_uloga)
        if nova_uloga == stara_uloga:
            return False, 'Ne možete promeniti ulogu u vec postojecu ', None
        try:
            db.session.commit()
            
            # Slanje email obaveštenja o promeni uloge
            if user.uloga == UserRole.MENADZER:
                send_role_change_email(user.email, user.ime, dto.nova_uloga)
            
            
            return True, f'Uloga promenjena iz {stara_uloga} u {dto.nova_uloga}', user.to_dict()
        except Exception as e:
            db.session.rollback()
            return False, f'Greška pri promeni uloge: {str(e)}', None
    
    def delete_user(self, user_id: int, admin_id: int) -> Tuple[bool, str]:
        """
        Briše korisnika (samo admin).
        
        Args:
            user_id: ID korisnika za brisanje
            admin_id: ID administratora
            
        Returns:
            Tuple (success, message)
        """
        if user_id == admin_id:
            return False, 'Ne možete obrisati svoj nalog'
        
        user = User.query.get(user_id)
        if not user:
            return False, 'Korisnik nije pronađen'
        
        if user.uloga == UserRole.ADMINISTRATOR:
            return False, 'Ne možete obrisati drugog administratora'
        
        try:
            db.session.delete(user)
            db.session.commit()
            return True, 'Korisnik uspešno obrisan'
        except Exception as e:
            db.session.rollback()
            return False, f'Greška pri brisanju: {str(e)}'
    
    def deposit(self, user_id: int, dto: DepositDTO) -> Tuple[bool, str, Optional[float]]:
        """
        Uplaćuje sredstva na račun korisnika.
        
        Args:
            user_id: ID korisnika
            dto: DepositDTO sa iznosom
            
        Returns:
            Tuple (success, message, novo_stanje)
        """
        errors = dto.validate()
        if errors:
            return False, ', '.join(errors), None
        
        user = User.query.get(user_id)
        if not user:
            return False, 'Korisnik nije pronađen', None
        
        user.stanje_racuna = Decimal(str(user.stanje_racuna)) + Decimal(str(dto.iznos))
        
        try:
            db.session.commit()
            return True, f'Uspešno uplaćeno {dto.iznos}', float(user.stanje_racuna)
        except Exception as e:
            db.session.rollback()
            return False, f'Greška pri uplati: {str(e)}', None
    
    def deduct_balance(self, user_id: int, amount: float) -> Tuple[bool, str]:
        """
        Oduzima sredstva sa računa korisnika.
        
        Args:
            user_id: ID korisnika
            amount: Iznos za oduzimanje
            
        Returns:
            Tuple (success, message)
        """
        user = User.query.get(user_id)
        if not user:
            return False, 'Korisnik nije pronađen'
        
        if float(user.stanje_racuna) < amount:
            return False, 'Nedovoljno sredstava na računu'
        
        user.stanje_racuna = Decimal(str(user.stanje_racuna)) - Decimal(str(amount))
        
        try:
            db.session.commit()
            return True, 'Sredstva uspešno oduzeta'
        except Exception as e:
            db.session.rollback()
            return False, f'Greška pri transakciji: {str(e)}'
    
    def refund_balance(self, user_id: int, amount: float) -> Tuple[bool, str]:
        """
        Vraća sredstva na račun korisnika (refund).
        
        Args:
            user_id: ID korisnika
            amount: Iznos za vraćanje
            
        Returns:
            Tuple (success, message)
        """
        user = User.query.get(user_id)
        if not user:
            return False, 'Korisnik nije pronađen'
        
        user.stanje_racuna = Decimal(str(user.stanje_racuna)) + Decimal(str(amount))
        
        try:
            db.session.commit()
            return True, 'Sredstva uspešno vraćena'
        except Exception as e:
            db.session.rollback()
            return False, f'Greška pri transakciji: {str(e)}'
