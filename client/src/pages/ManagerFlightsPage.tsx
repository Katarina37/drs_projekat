import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Pencil, RefreshCw } from 'lucide-react';
import { TopHeader } from '../components/layout/TopHeader';
import {
  Button,
  Card,
  CardBody,
  EmptyState,
  FlightStatusBadge,
  Input,
  Modal,
  Select,
  Spinner,
  Table,
} from '../components';
import { airlinesApi, flightsApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import type { Airline, Flight } from '../types';
import { FlightStatus } from '../types';
import { createSocket } from '../services/socket';


type FlightEditForm = {
  naziv: string;
  airline_id: string;
  duzina_km: string;
  trajanje_minuta: string;
  vreme_polaska: string;
  aerodrom_polaska: string;
  aerodrom_dolaska: string;
  cena_karte: string;
  ukupno_mesta: string;
};

const toLocalInput = (iso: string) => {
  if (!iso) return '';
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

export function ManagerFlightsPage() {
  const { addToast } = useToast();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editTarget, setEditTarget] = useState<Flight | null>(null);
  const [formData, setFormData] = useState<FlightEditForm | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [flightsRes, airlinesRes] = await Promise.all([
        flightsApi.getMyFlights(),
        airlinesApi.getAll(),
      ]);

      if (flightsRes.success) setFlights(flightsRes.data || []);
      if (airlinesRes.success) setAirlines(airlinesRes.data || []);
    } catch {
      addToast({
        type: 'error',
        title: 'Greška',
        message: 'Nije moguće učitati podatke.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const socket = createSocket('/manager');

    const handleRejected = (payload: { flight?: Flight }) => {
      if (!payload?.flight) return;
      const flight = payload.flight;
      setFlights((prev) => {
        const index = prev.findIndex((item) => item.id === flight.id);
        if (index === -1) {
          return [flight, ...prev];
        }
        const next = [...prev];
        next[index] = flight;
        return next;
      });
      addToast({
        type: 'warning',
        title: 'Let odbijen',
        message: flight.naziv,
      });
    };

    const handleStatusChanged = (payload: { flight?: Flight }) => {
      if (!payload?.flight) return;
      const flight = payload.flight;
      setFlights((prev) => {
        const index = prev.findIndex((item) => item.id === flight.id);
        if (index === -1) {
          return [flight, ...prev];
        }
        const next = [...prev];
        next[index] = flight;
        return next;
      });
      addToast({
        type: 'info',
        title: 'Status leta promenjen',
        message: `${flight.naziv} je sada u statusu: ${flight.status}`,
      });
    };

    const handleApproved = (payload: { flight?: Flight }) => {
      if (!payload?.flight) return;
      const flight = payload.flight;
      setFlights((prev) => {
        const index = prev.findIndex((item) => item.id === flight.id);
        if (index === -1) {
          return [flight, ...prev];
        }
        const next = [...prev];
        next[index] = flight;
        return next;
      });
      addToast({
        type: 'info',
        title: 'Let odobren',
        message: `${flight.naziv} je sada odobren.`,
      });
    };

    // Pratimo događaje
    socket.on('flight_rejected', handleRejected);
    socket.on('flight_status_changed', handleStatusChanged); 
    socket.on('flight_approved', handleApproved); // Dodajemo za odobrenje leta

    return () => {
      socket.off('flight_rejected', handleRejected);
      socket.off('flight_status_changed', handleStatusChanged);
      socket.off('flight_approved', handleApproved); // Očistimo listener za odobrenje
      socket.disconnect();
    };
  }, [addToast]);


  const openEditModal = (flight: Flight) => {
    setEditTarget(flight);
    setFormData({
      naziv: flight.naziv || '',
      airline_id: String(flight.airline_id || ''),
      duzina_km: String(flight.duzina_km ?? ''),
      trajanje_minuta: String(flight.trajanje_minuta ?? ''),
      vreme_polaska: toLocalInput(flight.vreme_polaska),
      aerodrom_polaska: flight.aerodrom_polaska || '',
      aerodrom_dolaska: flight.aerodrom_dolaska || '',
      cena_karte: String(flight.cena_karte ?? ''),
      ukupno_mesta: String(flight.ukupno_mesta ?? ''),
    });
    setErrors({});
  };

  const resetModal = () => {
    setEditTarget(null);
    setFormData(null);
    setErrors({});
  };

  const validate = () => {
    if (!formData) return false;
    const newErrors: Record<string, string> = {};
    if (!formData.naziv.trim()) newErrors.naziv = 'Naziv je obavezan';
    if (!formData.airline_id) newErrors.airline_id = 'Avio kompanija je obavezna';
    if (!formData.duzina_km || Number(formData.duzina_km) <= 0) newErrors.duzina_km = 'Unesite validnu dužinu';
    if (!formData.trajanje_minuta || Number(formData.trajanje_minuta) <= 0) newErrors.trajanje_minuta = 'Unesite validno trajanje';
    if (!formData.vreme_polaska) newErrors.vreme_polaska = 'Vreme polaska je obavezno';
    if (!formData.aerodrom_polaska.trim()) newErrors.aerodrom_polaska = 'Aerodrom polaska je obavezan';
    if (!formData.aerodrom_dolaska.trim()) newErrors.aerodrom_dolaska = 'Aerodrom dolaska je obavezan';
    if (!formData.cena_karte || Number(formData.cena_karte) <= 0) newErrors.cena_karte = 'Unesite validnu cenu';
    if (!formData.ukupno_mesta || Number(formData.ukupno_mesta) <= 0) newErrors.ukupno_mesta = 'Unesite validan broj mesta';
    if (
      formData.aerodrom_polaska &&
      formData.aerodrom_dolaska &&
      formData.aerodrom_polaska === formData.aerodrom_dolaska
    ) {
      newErrors.aerodrom_dolaska = 'Aerodrom polaska i dolaska ne mogu biti isti';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submitUpdate = async () => {
    if (!editTarget || !formData) return;
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        naziv: formData.naziv.trim(),
        airline_id: Number(formData.airline_id),
        duzina_km: Number(formData.duzina_km),
        trajanje_minuta: Number(formData.trajanje_minuta),
        vreme_polaska: formData.vreme_polaska,
        aerodrom_polaska: formData.aerodrom_polaska.trim(),
        aerodrom_dolaska: formData.aerodrom_dolaska.trim(),
        cena_karte: Number(formData.cena_karte),
        ukupno_mesta: Number(formData.ukupno_mesta),
      };

      const response = await flightsApi.update(editTarget.id, payload);
      if (response.success) {
        addToast({
          type: 'success',
          title: 'Let ažuriran',
          message: 'Let je prosleđen na ponovno odobrenje.',
        });
        await loadData();
        resetModal();
      } else {
        addToast({
          type: 'error',
          title: 'Greška',
          message: response.message || 'Nije moguće ažurirati let.',
        });
      }
    } catch {
      addToast({
        type: 'error',
        title: 'Greška',
        message: 'Došlo je do greške prilikom ažuriranja.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submitUpdate();
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
      key: 'status',
      header: 'Status',
      render: (flight: Flight) => <FlightStatusBadge status={flight.status} />,
    },
    {
      key: 'razlog_odbijanja',
      header: 'Razlog',
      render: (flight: Flight) => flight.razlog_odbijanja || '-',
    },
    {
      key: 'actions',
      header: 'Akcije',
      render: (flight: Flight) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openEditModal(flight)}
          disabled={!([FlightStatus.CEKA_ODOBRENJE, FlightStatus.ODBIJEN].includes(flight.status))}
        >
          <Pencil size={16} />
        </Button>
      ),
    },
  ];

  return (
    <>
      <TopHeader title="Moji letovi" />
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-row">
            <div>
              <h2>Letovi koje ste kreirali</h2>
              <p className="page-subtitle">
                Ažurirajte letove koji čekaju odobrenje ili su odbijeni.
              </p>
            </div>
            <Button variant="secondary" onClick={loadData} leftIcon={<RefreshCw size={16} />}>
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
                icon={<Pencil />}
                title="Nema kreiranih letova"
                description="Kreirajte prvi let kako biste ga poslali na odobrenje."
              />
            )}
          </CardBody>
        </Card>

        <Modal
          isOpen={!!editTarget}
          onClose={resetModal}
          title="Izmeni let"
          footer={
            <>
              <Button variant="secondary" onClick={resetModal}>
                Otkaži
              </Button>
              <Button onClick={() => void submitUpdate()} isLoading={isSubmitting}>
                Sačuvaj
              </Button>
            </>
          }
        >
          {formData && (
            <form onSubmit={handleSubmit}>
              <Input
                label="Naziv leta"
                required
                value={formData.naziv}
                onChange={(e) => setFormData((prev) => (prev ? { ...prev, naziv: e.target.value } : prev))}
                error={errors.naziv}
              />
              <Select
                label="Avio kompanija"
                required
                value={formData.airline_id}
                onChange={(e) => setFormData((prev) => (prev ? { ...prev, airline_id: e.target.value } : prev))}
                error={errors.airline_id}
                placeholder="Izaberite kompaniju"
                options={airlines.map((airline) => ({
                  value: airline.id,
                  label: `${airline.naziv} (${airline.kod})`,
                }))}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                <Input
                  label="Dužina leta (km)"
                  type="number"
                  required
                  value={formData.duzina_km}
                  onChange={(e) => setFormData((prev) => (prev ? { ...prev, duzina_km: e.target.value } : prev))}
                  error={errors.duzina_km}
                  min="1"
                />
                <Input
                  label="Trajanje leta (min)"
                  type="number"
                  required
                  value={formData.trajanje_minuta}
                  onChange={(e) => setFormData((prev) => (prev ? { ...prev, trajanje_minuta: e.target.value } : prev))}
                  error={errors.trajanje_minuta}
                  min="1"
                />
              </div>
              <Input
                label="Vreme polaska"
                type="datetime-local"
                required
                value={formData.vreme_polaska}
                onChange={(e) => setFormData((prev) => (prev ? { ...prev, vreme_polaska: e.target.value } : prev))}
                error={errors.vreme_polaska}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                <Input
                  label="Aerodrom polaska"
                  required
                  value={formData.aerodrom_polaska}
                  onChange={(e) => setFormData((prev) => (prev ? { ...prev, aerodrom_polaska: e.target.value } : prev))}
                  error={errors.aerodrom_polaska}
                />
                <Input
                  label="Aerodrom dolaska"
                  required
                  value={formData.aerodrom_dolaska}
                  onChange={(e) => setFormData((prev) => (prev ? { ...prev, aerodrom_dolaska: e.target.value } : prev))}
                  error={errors.aerodrom_dolaska}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                <Input
                  label="Cena karte (EUR)"
                  type="number"
                  required
                  value={formData.cena_karte}
                  onChange={(e) => setFormData((prev) => (prev ? { ...prev, cena_karte: e.target.value } : prev))}
                  error={errors.cena_karte}
                  min="1"
                  step="0.01"
                />
                <Input
                  label="Ukupno mesta"
                  type="number"
                  required
                  value={formData.ukupno_mesta}
                  onChange={(e) => setFormData((prev) => (prev ? { ...prev, ukupno_mesta: e.target.value } : prev))}
                  error={errors.ukupno_mesta}
                  min="1"
                />
              </div>
            </form>
          )}
        </Modal>
      </div>
    </>
  );
}
