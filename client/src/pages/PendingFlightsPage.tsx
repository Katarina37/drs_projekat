import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { TopHeader } from '../components/layout/TopHeader';
import {
  Button,
  Card,
  CardBody,
  EmptyState,
  FlightStatusBadge,
  Modal,
  Spinner,
  Table,
  Textarea,
} from '../components';
import { flightsApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import type { Flight } from '../types';
import { createSocket } from '../services/socket';

export function PendingFlightsPage() {
  const { addToast } = useToast();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rejectTarget, setRejectTarget] = useState<Flight | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadPending = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await flightsApi.getPending();
      if (response.success) {
        setFlights(response.data || []);
      }
    } catch {
      addToast({
        type: 'error',
        title: 'Greška',
        message: 'Nije moguće učitati letove.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  useEffect(() => {
    const socket = createSocket('/admin');

    const handleNew = (payload: { flight?: Flight }) => {
      if (!payload?.flight) return;
      const flight = payload.flight;
      setFlights((prev) => {
        if (prev.some((item) => item.id === flight.id)) {
          return prev;
        }
        return [flight, ...prev];
      });
      addToast({
        type: 'info',
        title: 'Novi let na čekanju',
        message: flight.naziv,
      });
    };

    const handleUpdate = (payload: { flight?: Flight }) => {
      if (!payload?.flight) return;
      const flight = payload.flight;
      setFlights((prev) => {
        const index = prev.findIndex((item) => item.id === flight.id);
        if (index === -1) return prev;
        const next = [...prev];
        next[index] = flight;
        return next;
      });
    };

    socket.on('new_flight_pending', handleNew);
    socket.on('flight_updated', handleUpdate);

    return () => {
      socket.off('new_flight_pending', handleNew);
      socket.off('flight_updated', handleUpdate);
      socket.disconnect();
    };
  }, [addToast]);

  const handleApprove = async (flight: Flight) => {
    setIsSubmitting(true);
    try {
      const response = await flightsApi.approve(flight.id);
      if (response.success) {
        addToast({
          type: 'success',
          title: 'Let odobren',
          message: flight.naziv,
        });
        setFlights((prev) => prev.filter((item) => item.id !== flight.id));
      } else {
        addToast({
          type: 'error',
          title: 'Greška',
          message: response.message || 'Nije moguće odobriti let.',
        });
      }
    } catch {
      addToast({
        type: 'error',
        title: 'Greška',
        message: 'Došlo je do greške prilikom odobravanja.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    if (rejectReason.trim().length < 10) {
      addToast({
        type: 'warning',
        title: 'Nedovoljan razlog',
        message: 'Razlog mora imati najmanje 10 karaktera.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await flightsApi.reject(rejectTarget.id, rejectReason.trim());
      if (response.success) {
        addToast({
          type: 'success',
          title: 'Let odbijen',
          message: rejectTarget.naziv,
        });
        setFlights((prev) => prev.filter((item) => item.id !== rejectTarget.id));
        setRejectTarget(null);
        setRejectReason('');
      } else {
        addToast({
          type: 'error',
          title: 'Greška',
          message: response.message || 'Nije moguće odbiti let.',
        });
      }
    } catch {
      addToast({
        type: 'error',
        title: 'Greška',
        message: 'Došlo je do greške prilikom odbijanja.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'naziv',
      header: 'Naziv',
      render: (flight: Flight) => (
        <div>
          <div style={{ fontWeight: 'var(--font-weight-medium)' }}>{flight.naziv}</div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
            {flight.avio_kompanija?.naziv || 'Nepoznata kompanija'}
          </div>
        </div>
      ),
    },
    {
      key: 'vreme_polaska',
      header: 'Polazak',
      render: (flight: Flight) =>
        new Date(flight.vreme_polaska).toLocaleString('sr-RS', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }),
    },
    {
      key: 'kreirao_id',
      header: 'Kreirao',
      render: (flight: Flight) => `ID ${flight.kreirao_id}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (flight: Flight) => <FlightStatusBadge status={flight.status} />,
    },
    {
      key: 'actions',
      header: 'Akcije',
      render: (flight: Flight) => (
        <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleApprove(flight)}
            disabled={isSubmitting}
          >
            <CheckCircle size={16} style={{ color: 'var(--color-success)' }} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRejectTarget(flight)}
            disabled={isSubmitting}
          >
            <XCircle size={16} style={{ color: 'var(--color-error)' }} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <TopHeader title="Odobrenja letova" />
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-row">
            <div>
              <h2>Letovi na čekanju</h2>
              <p className="page-subtitle">
                Pregledajte nove letove i odlučite da li će biti odobreni.
              </p>
            </div>
            <Button variant="secondary" onClick={loadPending}>
              Osveži
            </Button>
          </div>
        </div>

        <Card>
          <CardBody style={{ padding: 0 }}>
            {isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--spacing-3xl)' }}>
                <Spinner size="lg" />
              </div>
            ) : flights.length > 0 ? (
              <Table columns={columns} data={flights} keyExtractor={(flight) => flight.id} />
            ) : (
              <EmptyState
                icon={<CheckCircle />}
                title="Nema letova na čekanju"
                description="Trenutno nema novih letova za odobravanje."
              />
            )}
          </CardBody>
        </Card>

        <Modal
          isOpen={!!rejectTarget}
          onClose={() => {
            setRejectTarget(null);
            setRejectReason('');
          }}
          title="Odbij let"
          footer={
            <>
              <Button variant="secondary" onClick={() => setRejectTarget(null)}>
                Otkaži
              </Button>
              <Button variant="danger" onClick={handleReject} isLoading={isSubmitting}>
                Odbij
              </Button>
            </>
          }
        >
          <p>
            Navedite razlog odbijanja za let{' '}
            <strong>{rejectTarget?.naziv}</strong>.
          </p>
          <Textarea
            label="Razlog odbijanja"
            required
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Unesite detaljan razlog..."
            rows={4}
          />
        </Modal>
      </div>
    </>
  );
}
