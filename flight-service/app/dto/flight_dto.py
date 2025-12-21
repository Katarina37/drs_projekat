# flight-service/app/dto/flight_dto.py

from dataclasses import dataclass
from typing import Optional
from datetime import datetime


@dataclass
class CreateFlightDTO:
    """DTO za kreiranje novog leta."""
    naziv: str
    airline_id: int
    duzina_km: float
    trajanje_minuta: int
    vreme_polaska: datetime
    aerodrom_polaska: str
    aerodrom_dolaska: str
    cena_karte: float
    ukupno_mesta: int = 100

    @classmethod
    def from_dict(cls, data: dict) -> 'CreateFlightDTO':
        """Kreira DTO iz rečnika."""
        vreme = data.get('vreme_polaska')
        if isinstance(vreme, str):
            vreme = datetime.fromisoformat(vreme.replace('Z', '+00:00'))
        
        return cls(
            naziv=data.get('naziv', ''),
            airline_id=int(data.get('airline_id', 0)),
            duzina_km=float(data.get('duzina_km', 0)),
            trajanje_minuta=int(data.get('trajanje_minuta', 0)),
            vreme_polaska=vreme,
            aerodrom_polaska=data.get('aerodrom_polaska', ''),
            aerodrom_dolaska=data.get('aerodrom_dolaska', ''),
            cena_karte=float(data.get('cena_karte', 0)),
            ukupno_mesta=int(data.get('ukupno_mesta', 100))
        )

    def validate(self) -> list:
        """Validira DTO i vraća listu grešaka."""
        errors = []
        
        if not self.naziv or len(self.naziv) < 3:
            errors.append('Naziv leta mora imati najmanje 3 karaktera')
        
        if not self.airline_id or self.airline_id <= 0:
            errors.append('Avio kompanija nije validna')
        
        if self.duzina_km <= 0:
            errors.append('Dužina leta mora biti veća od 0')
        
        if self.trajanje_minuta <= 0:
            errors.append('Trajanje leta mora biti veće od 0')
        
        if not self.vreme_polaska:
            errors.append('Vreme polaska je obavezno')
        
        if not self.aerodrom_polaska:
            errors.append('Aerodrom polaska je obavezan')
        
        if not self.aerodrom_dolaska:
            errors.append('Aerodrom dolaska je obavezan')
        
        if self.aerodrom_polaska == self.aerodrom_dolaska:
            errors.append('Aerodrom polaska i dolaska ne mogu biti isti')
        
        if self.cena_karte <= 0:
            errors.append('Cena karte mora biti veća od 0')
        
        if self.ukupno_mesta <= 0:
            errors.append('Broj mesta mora biti veći od 0')
        
        return errors


@dataclass
class UpdateFlightDTO:
    """DTO za ažuriranje leta."""
    naziv: Optional[str] = None
    airline_id: Optional[int] = None
    duzina_km: Optional[float] = None
    trajanje_minuta: Optional[int] = None
    vreme_polaska: Optional[datetime] = None
    aerodrom_polaska: Optional[str] = None
    aerodrom_dolaska: Optional[str] = None
    cena_karte: Optional[float] = None
    ukupno_mesta: Optional[int] = None

    @classmethod
    def from_dict(cls, data: dict) -> 'UpdateFlightDTO':
        """Kreira DTO iz rečnika."""
        vreme = data.get('vreme_polaska')
        if isinstance(vreme, str):
            vreme = datetime.fromisoformat(vreme.replace('Z', '+00:00'))
        
        return cls(
            naziv=data.get('naziv'),
            airline_id=int(data['airline_id']) if data.get('airline_id') else None,
            duzina_km=float(data['duzina_km']) if data.get('duzina_km') else None,
            trajanje_minuta=int(data['trajanje_minuta']) if data.get('trajanje_minuta') else None,
            vreme_polaska=vreme,
            aerodrom_polaska=data.get('aerodrom_polaska'),
            aerodrom_dolaska=data.get('aerodrom_dolaska'),
            cena_karte=float(data['cena_karte']) if data.get('cena_karte') else None,
            ukupno_mesta=int(data['ukupno_mesta']) if data.get('ukupno_mesta') else None
        )

    def validate(self) -> list:
        """Validira DTO i vraća listu grešaka."""
        errors = []
        
        if self.naziv is not None and len(self.naziv) < 3:
            errors.append('Naziv leta mora imati najmanje 3 karaktera')
        
        if self.duzina_km is not None and self.duzina_km <= 0:
            errors.append('Dužina leta mora biti veća od 0')
        
        if self.trajanje_minuta is not None and self.trajanje_minuta <= 0:
            errors.append('Trajanje leta mora biti veće od 0')
        
        if self.cena_karte is not None and self.cena_karte <= 0:
            errors.append('Cena karte mora biti veća od 0')
        
        if self.ukupno_mesta is not None and self.ukupno_mesta <= 0:
            errors.append('Broj mesta mora biti veći od 0')
        
        return errors


@dataclass
class ApproveFlightDTO:
    """DTO za odobrenje leta od strane admina."""
    flight_id: int

    @classmethod
    def from_dict(cls, data: dict) -> 'ApproveFlightDTO':
        """Kreira DTO iz rečnika."""
        return cls(
            flight_id=int(data.get('flight_id', 0))
        )

    def validate(self) -> list:
        """Validira DTO i vraća listu grešaka."""
        errors = []
        
        if not self.flight_id or self.flight_id <= 0:
            errors.append('Flight ID nije validan')
        
        return errors


@dataclass
class RejectFlightDTO:
    """DTO za odbijanje leta od strane admina."""
    flight_id: int
    razlog: str

    @classmethod
    def from_dict(cls, data: dict) -> 'RejectFlightDTO':
        """Kreira DTO iz rečnika."""
        return cls(
            flight_id=int(data.get('flight_id', 0)),
            razlog=data.get('razlog', '')
        )

    def validate(self) -> list:
        """Validira DTO i vraća listu grešaka."""
        errors = []
        
        if not self.flight_id or self.flight_id <= 0:
            errors.append('Flight ID nije validan')
        
        if not self.razlog or len(self.razlog) < 10:
            errors.append('Razlog odbijanja mora imati najmanje 10 karaktera')
        
        return errors


@dataclass
class CancelFlightDTO:
    """DTO za otkazivanje leta od strane admina."""
    flight_id: int

    @classmethod
    def from_dict(cls, data: dict) -> 'CancelFlightDTO':
        """Kreira DTO iz rečnika."""
        return cls(
            flight_id=int(data.get('flight_id', 0))
        )

    def validate(self) -> list:
        """Validira DTO i vraća listu grešaka."""
        errors = []
        
        if not self.flight_id or self.flight_id <= 0:
            errors.append('Flight ID nije validan')
        
        return errors


@dataclass
class BuyTicketDTO:
    """DTO za kupovinu karte."""
    flight_id: int

    @classmethod
    def from_dict(cls, data: dict) -> 'BuyTicketDTO':
        """Kreira DTO iz rečnika."""
        return cls(
            flight_id=int(data.get('flight_id', 0))
        )

    def validate(self) -> list:
        """Validira DTO i vraća listu grešaka."""
        errors = []
        
        if not self.flight_id or self.flight_id <= 0:
            errors.append('Flight ID nije validan')
        
        return errors


@dataclass
class RateFlightDTO:
    """DTO za ocenu leta."""
    flight_id: int
    ocena: int
    komentar: Optional[str] = None

    @classmethod
    def from_dict(cls, data: dict) -> 'RateFlightDTO':
        """Kreira DTO iz rečnika."""
        return cls(
            flight_id=int(data.get('flight_id', 0)),
            ocena=int(data.get('ocena', 0)),
            komentar=data.get('komentar')
        )

    def validate(self) -> list:
        """Validira DTO i vraća listu grešaka."""
        errors = []
        
        if not self.flight_id or self.flight_id <= 0:
            errors.append('Flight ID nije validan')
        
        if not 1 <= self.ocena <= 5:
            errors.append('Ocena mora biti između 1 i 5')
        
        return errors


@dataclass
class CreateAirlineDTO:
    """DTO za kreiranje avio kompanije."""
    naziv: str
    kod: str
    drzava: Optional[str] = None
    logo: Optional[str] = None

    @classmethod
    def from_dict(cls, data: dict) -> 'CreateAirlineDTO':
        """Kreira DTO iz rečnika."""
        return cls(
            naziv=data.get('naziv', ''),
            kod=data.get('kod', '').upper(),
            drzava=data.get('drzava'),
            logo=data.get('logo')
        )

    def validate(self) -> list:
        """Validira DTO i vraća listu grešaka."""
        errors = []
        
        if not self.naziv or len(self.naziv) < 2:
            errors.append('Naziv avio kompanije mora imati najmanje 2 karaktera')
        
        if not self.kod or len(self.kod) < 2 or len(self.kod) > 4:
            errors.append('Kod avio kompanije mora imati 2-4 karaktera')
        
        return errors


@dataclass
class FlightSearchDTO:
    """DTO za pretragu letova."""
    naziv: Optional[str] = None
    airline_id: Optional[int] = None
    status: Optional[str] = None
    datum_od: Optional[datetime] = None
    datum_do: Optional[datetime] = None

    @classmethod
    def from_dict(cls, data: dict) -> 'FlightSearchDTO':
        """Kreira DTO iz rečnika."""
        datum_od = data.get('datum_od')
        datum_do = data.get('datum_do')
        
        if isinstance(datum_od, str):
            datum_od = datetime.fromisoformat(datum_od.replace('Z', '+00:00'))
        if isinstance(datum_do, str):
            datum_do = datetime.fromisoformat(datum_do.replace('Z', '+00:00'))
        
        return cls(
            naziv=data.get('naziv'),
            airline_id=int(data['airline_id']) if data.get('airline_id') else None,
            status=data.get('status'),
            datum_od=datum_od,
            datum_do=datum_do
        )