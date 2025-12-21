import { Plane, Clock, MapPin, Users } from 'lucide-react';
import type { Flight } from '../types';
import { FlightStatusBadge } from './Badge';
import { Button } from './Button';

interface FlightCardProps {
  flight: Flight;
  onBook?: (flight: Flight) => void;
  onView?: (flight: Flight) => void;
  showActions?: boolean;
  actionLabel?: string;
}

export function FlightCard({
  flight,
  onBook,
  onView,
  showActions = true,
  actionLabel = 'Rezerviši',
}: FlightCardProps) {
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('sr-RS', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sr-RS', {
      day: 'numeric',
      month: 'short',
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="flight-card">
      <div className="flight-card-header">
        <div>
          <h3 className="flight-card-title">{flight.naziv}</h3>
          <p className="flight-card-airline">
            {flight.avio_kompanija?.naziv || 'Nepoznata kompanija'}
          </p>
        </div>
        <FlightStatusBadge status={flight.status} />
      </div>

      <div className="flight-route">
        <div className="flight-route-point">
          <div className="flight-route-city">{flight.aerodrom_polaska}</div>
          <div className="flight-route-time">
            {formatTime(flight.vreme_polaska)} · {formatDate(flight.vreme_polaska)}
          </div>
        </div>

        <div className="flight-route-line">
          <span className="flight-route-duration">
            <Plane size={14} style={{ marginRight: '4px' }} />
            {formatDuration(flight.trajanje_minuta)}
          </span>
        </div>

        <div className="flight-route-point" style={{ textAlign: 'right' }}>
          <div className="flight-route-city">{flight.aerodrom_dolaska}</div>
          <div className="flight-route-time">
            {formatTime(flight.vreme_dolaska)} · {formatDate(flight.vreme_dolaska)}
          </div>
        </div>
      </div>

      <div className="flight-details">
        <div className="flight-detail-item">
          <Clock size={16} />
          <span>{formatDuration(flight.trajanje_minuta)}</span>
        </div>
        <div className="flight-detail-item">
          <MapPin size={16} />
          <span>{flight.duzina_km} km</span>
        </div>
        <div className="flight-detail-item">
          <Users size={16} />
          <span>{flight.slobodna_mesta} mesta</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
          <div className="flight-price">
            {flight.cena_karte.toFixed(2)}
            <span className="flight-price-currency"> EUR</span>
          </div>
          {showActions && (
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
              {onView && (
                <Button variant="secondary" size="sm" onClick={() => onView(flight)}>
                  Detalji
                </Button>
              )}
              {onBook && flight.slobodna_mesta > 0 && (
                <Button size="sm" onClick={() => onBook(flight)}>
                  {actionLabel}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
