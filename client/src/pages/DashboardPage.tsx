import { useState, useEffect } from 'react';
import { 
  Plane, 
  PlaneTakeoff, 
  PlaneLanding, 
  Ticket, 
  TrendingUp,
  Calendar
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TopHeader } from '../components/layout/TopHeader';
import { 
  StatsCard, 
  Card, 
  CardHeader, 
  CardBody, 
  FlightCard, 
  Button,
  EmptyState,
  Spinner
} from '../components';
import { flightsApi, ticketsApi } from '../services/api';
import type { Flight, Ticket as TicketType } from '../types';
import { UserRole } from '../types';

export function DashboardPage() {
  const { user } = useAuth();
  const [upcomingFlights, setUpcomingFlights] = useState<Flight[]>([]);
  const [myTickets, setMyTickets] = useState<TicketType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [flightsRes, ticketsRes] = await Promise.all([
        flightsApi.getUpcoming(),
        ticketsApi.getMyTickets(),
      ]);

      if (flightsRes.success && flightsRes.data) {
        setUpcomingFlights(flightsRes.data.slice(0, 3));
      }
      if (ticketsRes.success && ticketsRes.data) {
        setMyTickets(ticketsRes.data);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Dobro jutro';
    if (hour < 18) return 'Dobar dan';
    return 'Dobro veče';
  };

  return (
    <>
      <TopHeader title="Kontrolna tabla" />
      <div className="page-content">
        <div className="page-header">
          <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>
            {getGreeting()}, {user?.ime}! 👋
          </h2>
          <p className="page-subtitle">
            Evo pregleda vaših aktivnosti i dostupnih letova.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="dashboard-grid">
          <StatsCard
            icon={<Ticket size={24} />}
            value={myTickets.length}
            label="Moje karte"
          />
          <StatsCard
            icon={<Plane size={24} />}
            value={upcomingFlights.length}
            label="Dostupni letovi"
          />
          <StatsCard
            icon={<Calendar size={24} />}
            value={myTickets.filter(t => !t.otkazana).length}
            label="Aktivne rezervacije"
          />
          <StatsCard
            icon={<TrendingUp size={24} />}
            value={`${Number(user?.stanje_racuna || 0).toFixed(2)} €`}
            label="Stanje računa"
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid-2" style={{ alignItems: 'start' }}>
          {/* Upcoming Flights */}
          <Card>
            <CardHeader 
              title="Dostupni letovi" 
              subtitle="Najnoviji letovi spremni za rezervaciju"
              action={
                <Button variant="secondary" size="sm" onClick={() => window.location.href = '/flights'}>
                  Vidi sve
                </Button>
              }
            />
            <CardBody>
              {isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--spacing-xl)' }}>
                  <Spinner />
                </div>
              ) : upcomingFlights.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                  {upcomingFlights.map((flight) => (
                    <FlightCard key={flight.id} flight={flight} showActions={false} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<Plane />}
                  title="Nema dostupnih letova"
                  description="Trenutno nema letova dostupnih za rezervaciju."
                />
              )}
            </CardBody>
          </Card>



          {/* Quick Actions & Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            {/* Quick Actions */}
            <Card>
              <CardHeader title="Brze akcije" />
              <CardBody>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                  <Button 
                    variant="secondary" 
                    leftIcon={<Plane size={18} />}
                    style={{ justifyContent: 'flex-start' }}
                    onClick={() => window.location.href = '/flights'}
                  >
                    Pretraži letove
                  </Button>
                  <Button 
                    variant="secondary" 
                    leftIcon={<Ticket size={18} />}
                    style={{ justifyContent: 'flex-start' }}
                    onClick={() => window.location.href = '/my-tickets'}
                  >
                    Moje karte
                  </Button>
                  {(user?.uloga === UserRole.MENADZER || user?.uloga === UserRole.ADMINISTRATOR) && (
                    <Button 
                      variant="secondary" 
                      leftIcon={<PlaneTakeoff size={18} />}
                      style={{ justifyContent: 'flex-start' }}
                      onClick={() => window.location.href = '/create-flight'}
                    >
                      Kreiraj novi let
                    </Button>
                  )}
                </div>
              </CardBody>
            </Card>

            {/* My Upcoming Trips */}
            <Card>
              <CardHeader 
                title="Moja putovanja" 
                subtitle="Vaše predstojeće rezervacije"
              />
              <CardBody>
                {myTickets.filter(t => !t.otkazana).length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                    {myTickets.filter(t => !t.otkazana).slice(0, 3).map((ticket) => (
                      <div 
                        key={ticket.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--spacing-md)',
                          padding: 'var(--spacing-md)',
                          background: 'var(--color-gray-50)',
                          borderRadius: 'var(--radius-md)',
                        }}
                      >
                        <div 
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: 'var(--radius-md)',
                            background: 'rgba(0, 57, 166, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--color-primary)',
                          }}
                        >
                          <PlaneTakeoff size={20} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 'var(--font-weight-medium)', fontSize: 'var(--font-size-sm)' }}>
                            {ticket.let?.naziv || `Let #${ticket.flight_id}`}
                          </div>
                          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                            {ticket.let?.aerodrom_polaska} → {ticket.let?.aerodrom_dolaska}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-primary)' }}>
                            {ticket.cena.toFixed(2)} €
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<PlaneLanding />}
                    title="Nema rezervacija"
                    description="Nemate aktivne rezervacije letova."
                  />
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
