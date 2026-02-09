// User Types
export enum UserRole {
  KORISNIK = 'KORISNIK',
  MENADZER = 'MENADZER',
  ADMINISTRATOR = 'ADMINISTRATOR'
}

export interface User {
  id: number;
  ime: string;
  prezime: string;
  email: string;
  datum_rodjenja: string;
  pol: 'M' | 'Z';
  drzava: string;
  ulica: string;
  broj: string;
  uloga: UserRole;
  stanje_racuna: number;
  profilna_slika?: string;
  aktivan: boolean;
  kreiran: string;
  azuriran: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  ime: string;
  prezime: string;
  email: string;
  password: string;
  datum_rodjenja: string;
  pol: 'M' | 'Z';
  drzava: string;
  ulica: string;
  broj: string;
  stanje_racuna: number;
  profilna_slika?: string;
}

export interface UpdateUserData {
  ime?: string;
  prezime?: string;
  email?: string;
  password?: string;
  datum_rodjenja?: string;
  pol?: 'M' | 'Z';
  drzava?: string;
  ulica?: string;
  broj?: string;
  profilna_slika?: string;
}

// Flight Types
export enum FlightStatus {
  CEKA_ODOBRENJE = 'CEKA_ODOBRENJE',
  ODOBREN = 'ODOBREN',
  ODBIJEN = 'ODBIJEN',
  U_TOKU = 'U_TOKU',
  ZAVRSEN = 'ZAVRSEN',
  OTKAZAN = 'OTKAZAN'
}

export interface Airline {
  id: number;
  naziv: string;
  kod: string;
  drzava: string;
  logo?: string;
  aktivna: boolean;
}

export interface Flight {
  id: number;
  naziv: string;
  airline_id: number;
  avio_kompanija?: Airline;
  duzina_km: number;
  trajanje_minuta: number;
  vreme_polaska: string;
  vreme_dolaska: string;
  aerodrom_polaska: string;
  aerodrom_dolaska: string;
  cena_karte: number;
  ukupno_mesta: number;
  slobodna_mesta: number;
  status: FlightStatus;
  kreirao_id: number;
  razlog_odbijanja?: string;
  prosecna_ocena?: number;
  kreiran: string;
  azuriran?: string;
}

export interface CreateFlightData {
  naziv: string;
  airline_id: number;
  duzina_km: number;
  trajanje_minuta: number;
  vreme_polaska: string;
  aerodrom_polaska: string;
  aerodrom_dolaska: string;
  cena_karte: number;
  ukupno_mesta: number;
}

// Ticket Types
export interface Ticket {
  id: number;
  flight_id: number;
  user_id: number;
  cena: number;
  kupljena: string;
  otkazana: boolean;
  let?: Flight;
}

// Rating Types
export interface FlightRating {
  id: number;
  flight_id: number;
  user_id: number;
  ocena: number;
  komentar?: string;
  kreirana: string;
  let?: Flight;
  korisnik?: {
    ime: string;
    prezime: string;
  };
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface AuthResponse extends ApiResponse {
  access_token?: string;
  data?: User;
  user?: User;
}

// UI Types
export interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ size?: number }>;
  roles?: UserRole[];
}

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
}
