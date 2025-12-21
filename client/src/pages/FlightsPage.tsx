import { useState, useEffect, useCallback } from 'react';
import { Plane } from 'lucide-react';
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
import { flightsApi, airlinesApi, ticketsApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import type { Flight, Airline, TabItem } from '../types';
import { createSocket } from '../services/socket';

export function FlightsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  
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
        title: 'Greška',
        message: 'Nije moguće učitati letove.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const socket = createSocket('/flights');

    const handleApproved = (payload: { flight?: Flight }) => {
      if (payload?.flight) {
        addToast({
          type: 'info',
          title: 'Novi let odobren',
          message: payload.flight.naziv,
        });
      }
      loadData();
    };

    const handleCancelled = (payload: { flight?: Flight }) => {
      if (payload?.flight) {
        addToast({
          type: 'warning',
          title: 'Let otkazan',
          message: payload.flight.naziv,
        });
      }
      loadData();
    };

    socket.on('flight_approved', handleApproved);
    socket.on('flight_cancelled', handleCancelled);

    return () => {
      socket.off('flight_approved', handleApproved);
      socket.off('flight_cancelled', handleCancelled);
      socket.disconnect();
    };
  }, [addToast, loadData]);

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
        message: 'Nemate dovoljno sredstava na računu za ovu rezervaciju.',
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
          message: response.message || 'Rezervacija se obrađuje. Bićete obavešteni kada bude završena.',
        });
        setBookingModal(null);
      } else {
        addToast({
          type: 'error',
          title: 'Greška',
          message: response.message || 'Nije moguće rezervisati let.',
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Greška',
        message: 'Došlo je do greške prilikom rezervacije.',
      });
    } finally {
      setIsBooking(false);
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
    { id: 'upcoming', label: 'Predstojeći', count: upcomingFlights.length },
    { id: 'in-progress', label: 'U toku', count: inProgressFlights.length },
    { id: 'finished', label: 'Završeni', count: finishedFlights.length },
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
                Pronađite i rezervišite letove koji vam odgovaraju.
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-bar">
          <SearchBar
            placeholder="Pretraži letove..."
            value={searchTerm}
            onSearch={setSearchTerm}
          />
          <Select
            value={selectedAirline}
            onChange={(e) => setSelectedAirline(e.target.value)}
            placeholder="Sve avio kompanije"
            options={airlines.map((a) => ({ value: a.id, label: a.naziv }))}
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
                onBook={activeTab === 'upcoming' ? setBookingModal : undefined}
                showActions={activeTab === 'upcoming'}
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
                    ? 'Nema letova koji odgovaraju vašoj pretrazi.'
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
                Otkaži
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
                Da li ste sigurni da želite da rezervišete sledeći let?
              </p>
              
              <div style={{
                padding: 'var(--spacing-lg)',
                background: 'var(--color-gray-50)',
                borderRadius: 'var(--radius-lg)',
                marginBottom: 'var(--spacing-lg)'
              }}>
                <h4 style={{ marginBottom: 'var(--spacing-sm)' }}>{bookingModal.naziv}</h4>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                  {bookingModal.aerodrom_polaska} → {bookingModal.aerodrom_dolaska}
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
                Vaše trenutno stanje: {Number(user?.stanje_racuna || 0).toFixed(2)} EUR
              </p>
            </div>
          )}
        </Modal>
      </div>
    </>
  );
}
