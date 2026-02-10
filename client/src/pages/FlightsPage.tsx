import { useState, useEffect, useCallback, useRef } from 'react';
import { Plane, FileText } from 'lucide-react';
import { TopHeader } from '../components/layout/TopHeader';
import {
  FlightCard,
  Tabs,
  SearchBar,
  Select,
  EmptyState,
  Spinner,
  Modal,
  Button,
  Card,
  CardBody
} from '../components';
import axios from 'axios';
import { flightsApi, airlinesApi, ticketsApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import type { Flight, Airline, TabItem } from '../types';
import { UserRole, FlightStatus } from '../types';
import { createSocket } from '../services/socket';

export function FlightsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const isAdmin = user?.uloga === UserRole.ADMINISTRATOR;

  const [activeTab, setActiveTab] = useState('upcoming');
  const [upcomingFlights, setUpcomingFlights] = useState<Flight[]>([]);
  const [inProgressFlights, setInProgressFlights] = useState<Flight[]>([]);
  const [finishedFlights, setFinishedFlights] = useState<Flight[]>([]);
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAirline, setSelectedAirline] = useState('');

  const [bookingModal, setBookingModal] = useState<Flight | null>(null);
  const [isBooking, setIsBooking] = useState(false);

  const [cancelModal, setCancelModal] = useState<Flight | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [upcomingRes, inProgressRes, finishedRes, airlinesRes] = await Promise.all([
        flightsApi.getUpcoming(),
        flightsApi.getInProgress(),
        flightsApi.getFinished(),
        airlinesApi.getAll(),
      ]);

      if (upcomingRes.success) setUpcomingFlights(upcomingRes.data || []);
      if (inProgressRes.success) setInProgressFlights(inProgressRes.data || []);
      if (finishedRes.success) setFinishedFlights(finishedRes.data || []);
      if (airlinesRes.success) setAirlines(airlinesRes.data || []);
    } catch (error) {
      console.error('Error loading flights:', error);
      addToast({
        type: 'error',
        title: 'Greska',
        message: 'Nije moguce ucitati letove.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Tiho osvezavanje u pozadini (bez spinnera) kao fallback za propustene socket evente
  const silentRefreshRef = useRef<ReturnType<typeof setInterval>>();
  useEffect(() => {
    silentRefreshRef.current = setInterval(async () => {
      try {
        const [upcomingRes, inProgressRes, finishedRes] = await Promise.all([
          flightsApi.getUpcoming(),
          flightsApi.getInProgress(),
          flightsApi.getFinished(),
        ]);
        if (upcomingRes.success) setUpcomingFlights(upcomingRes.data || []);
        if (inProgressRes.success) setInProgressFlights(inProgressRes.data || []);
        if (finishedRes.success) setFinishedFlights(finishedRes.data || []);
      } catch {

      }
    }, 2000); 

    return () => clearInterval(silentRefreshRef.current);
  }, []);

  // Helper: ukloni let iz svih tabova po ID-u
  const removeFlightFromAll = useCallback((flightId: number) => {
    setUpcomingFlights(prev => prev.filter(f => f.id !== flightId));
    setInProgressFlights(prev => prev.filter(f => f.id !== flightId));
    setFinishedFlights(prev => prev.filter(f => f.id !== flightId));
  }, []);

  useEffect(() => {
    const socket = createSocket('/flights');

    const handleApproved = (payload: { flight?: Flight }) => {
      if (payload?.flight) {
        const flight = payload.flight;
        addToast({
          type: 'info',
          title: 'Novi let odobren',
          message: flight.naziv,
        });
        removeFlightFromAll(flight.id);
        setUpcomingFlights(prev => [flight, ...prev]);
      }
    };

    const handleCancelled = (payload: { flight?: Flight }) => {
      if (payload?.flight) {
        const flight = payload.flight;
        addToast({
          type: 'warning',
          title: 'Let otkazan',
          message: flight.naziv,
        });
        removeFlightFromAll(flight.id);
        setFinishedFlights(prev => [flight, ...prev]);
      }
    };

    const handleStatusChanged = (payload: { flight?: Flight }) => {
      if (payload?.flight) {
        const flight = payload.flight;
        addToast({
          type: 'info',
          title: 'Status leta promenjen',
          message: `${flight.naziv} - ${flight.status}`,
        });
        removeFlightFromAll(flight.id);
        switch (flight.status) {
          case FlightStatus.ODOBREN:
            setUpcomingFlights(prev => [flight, ...prev]);
            break;
          case FlightStatus.U_TOKU:
            setInProgressFlights(prev => [flight, ...prev]);
            break;
          case FlightStatus.ZAVRSEN:
            setFinishedFlights(prev => [flight, ...prev]);
            break;
          case FlightStatus.OTKAZAN:
            setFinishedFlights(prev => [flight, ...prev]);
            break;
        }
      }
    };

    const handleTicketPurchased = (payload: { flight?: Flight }) => {
      if (payload?.flight) {
        const updated = payload.flight;
        setUpcomingFlights(prev => prev.map(f => f.id === updated.id ? updated : f));
        setInProgressFlights(prev => prev.map(f => f.id === updated.id ? updated : f));
      }
    };

    socket.on('flight_approved', handleApproved);
    socket.on('flight_cancelled', handleCancelled);
    socket.on('flight_status_changed', handleStatusChanged);
    socket.on('ticket_purchased', handleTicketPurchased);

    return () => {
      socket.off('flight_approved', handleApproved);
      socket.off('flight_cancelled', handleCancelled);
      socket.off('flight_status_changed', handleStatusChanged);
      socket.off('ticket_purchased', handleTicketPurchased);
      socket.disconnect();
    };
  }, [addToast, removeFlightFromAll]);

  const filterFlights = (flights: Flight[]) => {
    return flights.filter((flight) => {
      const matchesSearch = flight.naziv.toLowerCase().includes(searchTerm.toLowerCase()) ||
        flight.aerodrom_polaska.toLowerCase().includes(searchTerm.toLowerCase()) ||
        flight.aerodrom_dolaska.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesAirline = !selectedAirline || flight.airline_id === Number(selectedAirline);

      return matchesSearch && matchesAirline;
    });
  };

  const handleBookFlight = async () => {
    if (!bookingModal || !user) return;

    if (Number(user.stanje_racuna) < bookingModal.cena_karte) {
      addToast({
        type: 'error',
        title: 'Nedovoljno sredstava',
        message: 'Nemate dovoljno sredstava na racunu za ovu rezervaciju.',
      });
      return;
    }

    setIsBooking(true);
    try {
      const response = await ticketsApi.buyTicket(bookingModal.id);

      if (response.success) {
        addToast({
          type: 'info',
          title: 'Kupovina je u toku',
          message: response.message || 'Rezervacija se obradjuje. Bicete obavesteni kada bude zavrsena.',
        });
        setBookingModal(null);
      } else {
        addToast({
          type: 'error',
          title: 'Greska',
          message: response.message || 'Nije moguce rezervisati let.',
        });
      }
    } catch (error) {
      let message = 'Doslo je do greske prilikom rezervacije.';
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        message = error.response.data.message;
      }
      addToast({
        type: 'error',
        title: 'Greska',
        message,
      });
    } finally {
      setIsBooking(false);
    }
  };

  const handleCancelFlight = async () => {
    if (!cancelModal) return;

    setIsCancelling(true);
    try {
      const response = await flightsApi.cancel(cancelModal.id);

      if (response.success) {
        addToast({
          type: 'success',
          title: 'Let otkazan',
          message: `Let ${cancelModal.naziv} je uspjesno otkazan.`,
        });
        setCancelModal(null);
        loadData();
      } else {
        addToast({
          type: 'error',
          title: 'Greska',
          message: response.message || 'Nije moguce otkazati let.',
        });
      }
    } catch (error) {
      let message = 'Doslo je do greske prilikom otkazivanja leta.';
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        message = error.response.data.message;
      }
      addToast({
        type: 'error',
        title: 'Greska',
        message,
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleGenerateReport = async () => {
    const reportTypeMap: Record<string, string> = {
      'upcoming': 'upcoming',
      'in-progress': 'in_progress',
      'finished': 'finished',
    };
    const reportType = reportTypeMap[activeTab];
    if (!reportType) return;

    setIsGeneratingReport(true);
    try {
      const response = await flightsApi.generateReport(reportType);

      if (response.success) {
        addToast({
          type: 'success',
          title: 'Izvjestaj generisan',
          message: response.message || 'PDF izvjestaj je poslat na vas email.',
        });
      } else {
        addToast({
          type: 'error',
          title: 'Greska',
          message: response.message || 'Nije moguce generisati izvjestaj.',
        });
      }
    } catch {
      addToast({
        type: 'error',
        title: 'Greska',
        message: 'Doslo je do greske prilikom generisanja izvjestaja.',
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const getCurrentFlights = () => {
    switch (activeTab) {
      case 'upcoming':
        return filterFlights(upcomingFlights);
      case 'in-progress':
        return filterFlights(inProgressFlights);
      case 'finished':
        return filterFlights(finishedFlights);
      default:
        return [];
    }
  };

  const tabs: TabItem[] = [
    { id: 'upcoming', label: 'Predstojeci', count: upcomingFlights.length },
    { id: 'in-progress', label: 'U toku', count: inProgressFlights.length },
    { id: 'finished', label: 'Zavrseni', count: finishedFlights.length },
  ];

  const currentFlights = getCurrentFlights();

  return (
    <>
      <TopHeader title="Letovi" />
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-row">
            <div>
              <h2>Pregled letova</h2>
              <p className="page-subtitle">
                Pronadjite i rezervisite letove koji vam odgovaraju.
              </p>
            </div>
            {/* PDF Report button za administratora */}
            {isAdmin && (
              <Button
                variant="secondary"
                onClick={handleGenerateReport}
                isLoading={isGeneratingReport}
                leftIcon={<FileText size={16} />}
              >
                Generiši PDF izvještaj
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="filters-bar">
          <SearchBar
            placeholder="Pretrazi letove..."
            value={searchTerm}
            onSearch={setSearchTerm}
          />
          <Select
            value={selectedAirline}
            onChange={(e) => setSelectedAirline(e.target.value)}
            options={[
              { value: '', label: 'Sve avio kompanije' },
              ...airlines.map((a) => ({ value: a.id, label: a.naziv })),
            ]}
            style={{ minWidth: '200px' }}
          />
        </div>

        {/* Tabs */}
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {/* Flight List */}
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--spacing-3xl)' }}>
            <Spinner size="lg" />
          </div>
        ) : currentFlights.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {currentFlights.map((flight) => (
              <FlightCard
                key={flight.id}
                flight={flight}
                onBook={activeTab === 'upcoming' && new Date(flight.vreme_polaska) > new Date() ? setBookingModal : undefined}
                onCancel={activeTab === 'upcoming' && isAdmin ? setCancelModal : undefined}
                showActions={activeTab === 'upcoming' && new Date(flight.vreme_polaska) > new Date()}
                showCountdown={activeTab === 'in-progress'}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardBody>
              <EmptyState
                icon={<Plane />}
                title="Nema letova"
                description={
                  searchTerm || selectedAirline
                    ? 'Nema letova koji odgovaraju vasoj pretrazi.'
                    : 'Trenutno nema dostupnih letova u ovoj kategoriji.'
                }
              />
            </CardBody>
          </Card>
        )}

        {/* Booking Modal */}
        <Modal
          isOpen={!!bookingModal}
          onClose={() => setBookingModal(null)}
          title="Potvrda rezervacije"
          footer={
            <>
              <Button variant="secondary" onClick={() => setBookingModal(null)}>
                Otkazi
              </Button>
              <Button onClick={handleBookFlight} isLoading={isBooking}>
                Potvrdi rezervaciju
              </Button>
            </>
          }
        >
          {bookingModal && (
            <div>
              <p style={{ marginBottom: 'var(--spacing-lg)' }}>
                Da li ste sigurni da zelite da rezervisete sledeci let?
              </p>

              <div style={{
                padding: 'var(--spacing-lg)',
                background: 'var(--color-gray-50)',
                borderRadius: 'var(--radius-lg)',
                marginBottom: 'var(--spacing-lg)'
              }}>
                <h4 style={{ marginBottom: 'var(--spacing-sm)' }}>{bookingModal.naziv}</h4>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                  {bookingModal.aerodrom_polaska} &rarr; {bookingModal.aerodrom_dolaska}
                </p>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 'var(--spacing-md)',
                background: 'rgba(0, 57, 166, 0.05)',
                borderRadius: 'var(--radius-md)'
              }}>
                <span>Cena karte:</span>
                <span style={{
                  fontSize: 'var(--font-size-xl)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: 'var(--color-primary)'
                }}>
                  {bookingModal.cena_karte.toFixed(2)} EUR
                </span>
              </div>

              <p style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--text-tertiary)',
                marginTop: 'var(--spacing-md)'
              }}>
                Vase trenutno stanje: {Number(user?.stanje_racuna || 0).toFixed(2)} EUR
              </p>
            </div>
          )}
        </Modal>

        {/* Cancel Flight Modal (Admin only) */}
        <Modal
          isOpen={!!cancelModal}
          onClose={() => setCancelModal(null)}
          title="Otkazivanje leta"
          footer={
            <>
              <Button variant="secondary" onClick={() => setCancelModal(null)}>
                Nazad
              </Button>
              <Button variant="danger" onClick={handleCancelFlight} isLoading={isCancelling}>
                Otkazi let
              </Button>
            </>
          }
        >
          {cancelModal && (
            <div>
              <p style={{ marginBottom: 'var(--spacing-lg)' }}>
                Da li ste sigurni da zelite da otkazete sledeci let? Svi korisnici koji su kupili karte bice obavesteni i sredstva ce im biti vracena.
              </p>

              <div style={{
                padding: 'var(--spacing-lg)',
                background: 'var(--color-gray-50)',
                borderRadius: 'var(--radius-lg)',
              }}>
                <h4 style={{ marginBottom: 'var(--spacing-sm)' }}>{cancelModal.naziv}</h4>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                  {cancelModal.aerodrom_polaska} &rarr; {cancelModal.aerodrom_dolaska}
                </p>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </>
  );
}
