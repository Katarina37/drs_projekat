import { useState, useEffect } from 'react';
import { Ticket, Star, Calendar, Clock, MapPin } from 'lucide-react';
import { TopHeader } from '../components/layout/TopHeader';
import { 
  Card, 
  CardBody, 
  Button, 
  EmptyState, 
  Spinner,
  Modal,
  Badge,
  Textarea
} from '../components';
import { ticketsApi, ratingsApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import type { Ticket as TicketType } from '../types';
import { FlightStatus } from '../types';

export function MyTicketsPage() {
  const { addToast } = useToast();
  
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [ratingModal, setRatingModal] = useState<TicketType | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    setIsLoading(true);
    try {
      const response = await ticketsApi.getMyTickets();
      if (response.success) {
        setTickets(response.data || []);
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
      addToast({
        type: 'error',
        title: 'Greška',
        message: 'Nije moguće učitati karte.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitRating = async () => {
    if (!ratingModal) return;

    setIsSubmitting(true);
    try {
      const response = await ratingsApi.rateFlight(
        ratingModal.flight_id,
        rating,
        comment || undefined
      );

      if (response.success) {
        addToast({
          type: 'success',
          title: 'Ocena sačuvana',
          message: 'Hvala vam na oceni!',
        });
        setRatingModal(null);
        setRating(5);
        setComment('');
      } else {
        addToast({
          type: 'error',
          title: 'Greška',
          message: response.message || 'Nije moguće sačuvati ocenu.',
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Greška',
        message: 'Došlo je do greške.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sr-RS', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('sr-RS', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const activeTickets = tickets.filter(t => !t.otkazana);
  const cancelledTickets = tickets.filter(t => t.otkazana);

  return (
    <>
      <TopHeader title="Moje karte" />
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-row">
            <div>
              <h2>Moje rezervacije</h2>
              <p className="page-subtitle">
                Pregled svih vaših rezervisanih letova.
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--spacing-3xl)' }}>
            <Spinner size="lg" />
          </div>
        ) : tickets.length === 0 ? (
          <Card>
            <CardBody>
              <EmptyState
                icon={<Ticket />}
                title="Nemate rezervacija"
                description="Još uvek niste rezervisali nijedan let. Pregledajte dostupne letove i rezervišite vaše putovanje."
                action={
                  <Button onClick={() => window.location.href = '/flights'}>
                    Pretraži letove
                  </Button>
                }
              />
            </CardBody>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
            {/* Active Tickets */}
            {activeTickets.length > 0 && (
              <div>
                <h3 style={{ marginBottom: 'var(--spacing-md)' }}>
                  Aktivne rezervacije ({activeTickets.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                  {activeTickets.map((ticket) => (
                    <Card key={ticket.id}>
                      <CardBody>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-lg)' }}>
                            <div style={{
                              width: '56px',
                              height: '56px',
                              borderRadius: 'var(--radius-lg)',
                              background: 'rgba(0, 57, 166, 0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--color-primary)',
                            }}>
                              <Ticket size={28} />
                            </div>
                            <div>
                              <h4 style={{ marginBottom: 'var(--spacing-xs)' }}>
                                {ticket.let?.naziv || `Let #${ticket.flight_id}`}
                              </h4>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-lg)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                  <MapPin size={14} />
                                  {ticket.let?.aerodrom_polaska} → {ticket.let?.aerodrom_dolaska}
                                </span>
                                {ticket.let?.vreme_polaska && (
                                  <>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                      <Calendar size={14} />
                                      {formatDate(ticket.let.vreme_polaska)}
                                    </span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                      <Clock size={14} />
                                      {formatTime(ticket.let.vreme_polaska)}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-lg)' }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Cena</div>
                              <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-primary)' }}>
                                {ticket.cena.toFixed(2)} €
                              </div>
                            </div>
                            
                            {ticket.let?.status === FlightStatus.ZAVRSEN && (
                              <Button 
                                variant="secondary" 
                                size="sm"
                                leftIcon={<Star size={16} />}
                                onClick={() => setRatingModal(ticket)}
                              >
                                Oceni
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Cancelled Tickets */}
            {cancelledTickets.length > 0 && (
              <div>
                <h3 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--text-secondary)' }}>
                  Otkazane rezervacije ({cancelledTickets.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                  {cancelledTickets.map((ticket) => (
                    <Card key={ticket.id} style={{ opacity: 0.7 }}>
                      <CardBody>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-lg)' }}>
                            <div style={{
                              width: '56px',
                              height: '56px',
                              borderRadius: 'var(--radius-lg)',
                              background: 'var(--color-gray-100)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--text-tertiary)',
                            }}>
                              <Ticket size={28} />
                            </div>
                            <div>
                              <h4 style={{ marginBottom: 'var(--spacing-xs)' }}>
                                {ticket.let?.naziv || `Let #${ticket.flight_id}`}
                              </h4>
                              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)' }}>
                                {ticket.let?.aerodrom_polaska} → {ticket.let?.aerodrom_dolaska}
                              </div>
                            </div>
                          </div>
                          <Badge variant="error">Otkazano</Badge>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rating Modal */}
        <Modal
          isOpen={!!ratingModal}
          onClose={() => {
            setRatingModal(null);
            setRating(5);
            setComment('');
          }}
          title="Ocenite let"
          footer={
            <>
              <Button variant="secondary" onClick={() => setRatingModal(null)}>
                Otkaži
              </Button>
              <Button onClick={handleSubmitRating} isLoading={isSubmitting}>
                Sačuvaj ocenu
              </Button>
            </>
          }
        >
          <div>
            <p style={{ marginBottom: 'var(--spacing-lg)' }}>
              Kako biste ocenili let <strong>{ratingModal?.let?.naziv}</strong>?
            </p>
            
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <label className="input-label">Ocena</label>
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)' }}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    style={{
                      padding: 'var(--spacing-sm)',
                      background: value <= rating ? 'var(--color-warning)' : 'var(--color-gray-200)',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <Star
                      size={24}
                      fill={value <= rating ? 'currentColor' : 'none'}
                      color={value <= rating ? 'white' : 'var(--text-tertiary)'}
                    />
                  </button>
                ))}
              </div>
            </div>
            
            <Textarea
              label="Komentar (opciono)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Napišite vaš komentar o letu..."
              rows={4}
            />
          </div>
        </Modal>
      </div>
    </>
  );
}
