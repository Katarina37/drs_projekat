import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { TopHeader } from '../components/layout/TopHeader';
import { Card, CardBody, EmptyState, Spinner, Table } from '../components';
import { ratingsApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import type { FlightRating } from '../types';

export function RatingsPage() {
  const { addToast } = useToast();
  const [ratings, setRatings] = useState<FlightRating[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadRatings = async () => {
      setIsLoading(true);
      try {
        const response = await ratingsApi.getAll();
        if (response.success) {
          setRatings(response.data || []);
        }
      } catch {
        addToast({
          type: 'error',
          title: 'Greška',
          message: 'Nije moguće učitati ocene.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadRatings();
  }, [addToast]);

  const columns = [
    {
      key: 'flight',
      header: 'Let',
      render: (rating: FlightRating) => rating.let?.naziv || `Let #${rating.flight_id}`,
    },
    {
      key: 'ocena',
      header: 'Ocena',
      render: (rating: FlightRating) => `${rating.ocena} / 5`,
    },
    {
      key: 'komentar',
      header: 'Komentar',
      render: (rating: FlightRating) => rating.komentar || '-',
    },
    {
      key: 'user_id',
      header: 'Korisnik',
      render: (rating: FlightRating) => `ID ${rating.user_id}`,
    },
    {
      key: 'kreirana',
      header: 'Datum',
      render: (rating: FlightRating) =>
        new Date(rating.kreirana).toLocaleDateString('sr-RS'),
    },
  ];

  return (
    <>
      <TopHeader title="Ocene korisnika" />
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-row">
            <div>
              <h2>Pregled svih ocena</h2>
              <p className="page-subtitle">Ocene korisnika za završene letove.</p>
            </div>
          </div>
        </div>

        <Card>
          <CardBody style={{ padding: 0 }}>
            {isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--spacing-3xl)' }}>
                <Spinner size="lg" />
              </div>
            ) : ratings.length > 0 ? (
              <Table columns={columns} data={ratings} keyExtractor={(rating) => rating.id} />
            ) : (
              <EmptyState
                icon={<Star />}
                title="Nema ocena"
                description="Još uvek nema ocena korisnika."
              />
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
