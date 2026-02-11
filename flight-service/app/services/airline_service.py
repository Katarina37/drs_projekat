# flight-service/app/services/airline_service.py

from typing import Tuple, Optional, List

from app import db
from app.models import Airline
from app.dto import CreateAirlineDTO


class AirlineService:
    """Servis za rad sa avio kompanijama."""
    
    def create_airline(self, dto: CreateAirlineDTO) -> Tuple[bool, str, Optional[dict]]:
        """
        Kreira novu avio kompaniju.
        
        Args:
            dto: CreateAirlineDTO sa podacima
            
        Returns:
            Tuple (success, message, airline_data)
        """
        errors = dto.validate()
        if errors:
            return False, ', '.join(errors), None
        
        # Provera da li kod već postoji
        existing = Airline.query.filter_by(kod=dto.kod).first()
        if existing:
            return False, f'Avio kompanija sa kodom {dto.kod} već postoji', None
        
        airline = Airline(
            naziv=dto.naziv,
            kod=dto.kod,
            drzava=dto.drzava,
            logo=dto.logo
        )
        
        try:
            db.session.add(airline)
            db.session.commit()
            return True, 'Avio kompanija uspešno kreirana', airline.to_dict()
        except Exception as e:
            db.session.rollback()
            return False, f'Greška pri kreiranju: {str(e)}', None
    
    def get_all_airlines(self) -> List[Airline]:
        """Vraća sve aktivne avio kompanije."""
        return Airline.query.filter_by(aktivna=True).all()
    
    def get_airline_by_id(self, airline_id: int) -> Optional[Airline]:
        """Vraća avio kompaniju po ID-u."""
        return Airline.query.get(airline_id)
    
    def update_airline(self, airline_id: int, data: dict) -> Tuple[bool, str, Optional[dict]]:
        """
        Ažurira avio kompaniju.
        
        Args:
            airline_id: ID avio kompanije
            data: Podaci za ažuriranje
            
        Returns:
            Tuple (success, message, airline_data)
        """
        airline = Airline.query.get(airline_id)
        if not airline:
            return False, 'Avio kompanija nije pronađena', None
        
        if 'naziv' in data:
            airline.naziv = data['naziv']
        if 'kod' in data:
            # Provera da li novi kod već postoji
            existing = Airline.query.filter(
                Airline.kod == data['kod'],
                Airline.id != airline_id
            ).first()
            if existing:
                return False, f'Kod {data["kod"]} već koristi druga kompanija', None
            airline.kod = data['kod']
        if 'drzava' in data:
            airline.drzava = data['drzava']
        if 'logo' in data:
            airline.logo = data['logo']
        
        try:
            db.session.commit()
            return True, 'Avio kompanija uspešno ažurirana', airline.to_dict()
        except Exception as e:
            db.session.rollback()
            return False, f'Greška pri ažuriranju: {str(e)}', None
    
    def delete_airline(self, airline_id: int) -> Tuple[bool, str]:
        """
        Briše (deaktivira) avio kompaniju.
        
        Args:
            airline_id: ID avio kompanije
            
        Returns:
            Tuple (success, message)
        """
        airline = Airline.query.get(airline_id)
        if not airline:
            return False, 'Avio kompanija nije pronađena'
        
        # Soft delete - samo deaktivacija
        airline.aktivna = False
        
        try:
            db.session.commit()
            return True, 'Avio kompanija uspešno deaktivirana'
        except Exception as e:
            db.session.rollback()
            return False, f'Greška pri brisanju: {str(e)}'


            