import { useState, useEffect } from 'react';
import { Plane, Clock, MapPin, Users, Timer } from 'lucide-react';
import type { Flight } from '../types';
import { FlightStatus } from '../types';
import { FlightStatusBadge } from './Badge';
import { Button } from './Button';

interface FlightCardProps {
  flight: Flight;
  onBook?: (flight: Flight) => void;
  onCancel?: (flight: Flight) => void;
  onView?: (flight: Flight) => void;
  showActions?: boolean;
  showCountdown?: boolean;
  actionLabel?: string;
}

function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft('Zavrseno');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${seconds}s`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 12px',
      background: 'rgba(234, 179, 8, 0.1)',
      border: '1px solid rgba(234, 179, 8, 0.3)',
      borderRadius: 'var(--radius-md)',
      color: '#b45309',
      fontWeight: 'var(--font-weight-semibold)',
      fontSize: 'var(--font-size-sm)',
    }}>
      <Timer size={16} />
      <span>Do kraja leta: {timeLeft}</span>
    </div>
  );
}

export function FlightCard({
  flight,
  onBook,
  onCancel,
  onView,
  showActions = true,
  showCountdown = false,
  actionLabel = 'Rezervisi',
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

  const isInProgress = flight.status === FlightStatus.U_TOKU;

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

      {/* Countdown timer za letove u toku */}
      {(showCountdown || isInProgress) && flight.vreme_dolaska && (
        <CountdownTimer targetDate={flight.vreme_dolaska} />
      )}

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
              {onCancel && (
                <Button variant="danger" size="sm" onClick={() => onCancel(flight)}>
                  Otkazi
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
