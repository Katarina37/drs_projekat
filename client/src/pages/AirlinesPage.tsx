import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Building2, Pencil, Trash2 } from 'lucide-react';
import { TopHeader } from '../components/layout/TopHeader';
import {
  Button,
  Card,
  CardBody,
  Modal,
  Table,
  Input,
  SearchBar,
  Spinner,
  EmptyState,
} from '../components';
import { airlinesApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import type { Airline } from '../types';

type AirlineFormData = {
  naziv: string;
  kod: string;
  drzava: string;
  logo: string;
};

const emptyForm: AirlineFormData = {
  naziv: '',
  kod: '',
  drzava: '',
  logo: '',
};

export function AirlinesPage() {
  const { addToast } = useToast();
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Airline | null>(null);
  const [editing, setEditing] = useState<Airline | null>(null);
  const [formData, setFormData] = useState<AirlineFormData>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const loadAirlines = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await airlinesApi.getAll();
      if (response.success) {
        setAirlines(response.data || []);
      }
    } catch {
      addToast({
        type: 'error',
        title: 'Greška',
        message: 'Nije moguće učitati avio kompanije.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadAirlines();
  }, [loadAirlines]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.naziv.trim()) newErrors.naziv = 'Naziv je obavezan';
    if (!formData.kod.trim()) {
      newErrors.kod = 'Kod je obavezan';
    } else if (formData.kod.trim().length < 2 || formData.kod.trim().length > 4) {
      newErrors.kod = 'Kod mora imati 2-4 karaktera';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const openCreateModal = () => {
    setEditing(null);
    setFormData(emptyForm);
    setErrors({});
    setModalOpen(true);
  };

  const openEditModal = (airline: Airline) => {
    setEditing(airline);
    setFormData({
      naziv: airline.naziv || '',
      kod: airline.kod || '',
      drzava: airline.drzava || '',
      logo: airline.logo || '',
    });
    setErrors({});
    setModalOpen(true);
  };

  const submitForm = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        naziv: formData.naziv.trim(),
        kod: formData.kod.trim().toUpperCase(),
        drzava: formData.drzava.trim() || undefined,
        logo: formData.logo.trim() || undefined,
      };

      const response = editing
        ? await airlinesApi.update(editing.id, payload)
        : await airlinesApi.create(payload);

      if (response.success) {
        addToast({
          type: 'success',
          title: editing ? 'Avio kompanija ažurirana' : 'Avio kompanija kreirana',
          message: editing ? 'Promene su sačuvane.' : 'Nova kompanija je dodata.',
        });
        setModalOpen(false);
        setEditing(null);
        await loadAirlines();
      } else {
        addToast({
          type: 'error',
          title: 'Greška',
          message: response.message || 'Nije moguće sačuvati promene.',
        });
      }
    } catch {
      addToast({
        type: 'error',
        title: 'Greška',
        message: 'Došlo je do greške prilikom čuvanja.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submitForm();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      const response = await airlinesApi.delete(deleteTarget.id);
      if (response.success) {
        addToast({
          type: 'success',
          title: 'Avio kompanija obrisana',
          message: `${deleteTarget.naziv} je deaktivirana.`,
        });
        setDeleteTarget(null);
        await loadAirlines();
      } else {
        addToast({
          type: 'error',
          title: 'Greška',
          message: response.message || 'Nije moguće obrisati kompaniju.',
        });
      }
    } catch {
      addToast({
        type: 'error',
        title: 'Greška',
        message: 'Došlo je do greške prilikom brisanja.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAirlines = airlines.filter((a) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      a.naziv.toLowerCase().includes(term) ||
      a.kod.toLowerCase().includes(term) ||
      (a.drzava && a.drzava.toLowerCase().includes(term))
    );
  });

  const columns = [
    {
      key: 'logo',
      header: '',
      render: (airline: Airline) =>
        airline.logo ? (
          <img
            src={airline.logo}
            alt={airline.naziv}
            style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', objectFit: 'contain' }}
          />
        ) : (
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-sm)',
            background: 'var(--color-gray-100)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-tertiary)',
          }}>
            <Building2 size={16} />
          </div>
        ),
    },
    {
      key: 'naziv',
      header: 'Naziv',
    },
    {
      key: 'kod',
      header: 'Kod',
      render: (airline: Airline) => (
        <span style={{
          padding: '2px 8px',
          background: 'var(--color-gray-100)',
          borderRadius: 'var(--radius-sm)',
          fontWeight: 'var(--font-weight-semibold)',
          fontSize: 'var(--font-size-sm)',
        }}>
          {airline.kod}
        </span>
      ),
    },
    {
      key: 'drzava',
      header: 'Država',
      render: (airline: Airline) => airline.drzava || '—',
    },
    {
      key: 'aktivna',
      header: 'Status',
      render: (airline: Airline) => (
        <span style={{
          padding: '2px 10px',
          borderRadius: 'var(--radius-full)',
          fontSize: 'var(--font-size-xs)',
          fontWeight: 'var(--font-weight-semibold)',
          background: airline.aktivna ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          color: airline.aktivna ? '#16a34a' : '#dc2626',
        }}>
          {airline.aktivna ? 'Aktivna' : 'Neaktivna'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Akcije',
      render: (airline: Airline) => (
        <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditModal(airline)}
          >
            <Pencil size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteTarget(airline)}
          >
            <Trash2 size={16} style={{ color: 'var(--color-error)' }} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <TopHeader title="Avio kompanije" />
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-row">
            <div>
              <h2>Upravljanje avio kompanijama</h2>
              <p className="page-subtitle">
                Dodajte nove kompanije ili ažurirajte postojeće podatke.
              </p>
            </div>
            <Button onClick={openCreateModal} leftIcon={<Building2 size={18} />}>
              Nova kompanija
            </Button>
          </div>
        </div>

        <div className="filters-bar">
          <SearchBar
            placeholder="Pretraži avio kompanije..."
            value={searchTerm}
            onSearch={setSearchTerm}
          />
        </div>

        <Card>
          <CardBody style={{ padding: 0 }}>
            {isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--spacing-3xl)' }}>
                <Spinner size="lg" />
              </div>
            ) : filteredAirlines.length > 0 ? (
              <Table columns={columns} data={filteredAirlines} keyExtractor={(airline) => airline.id} />
            ) : (
              <EmptyState
                icon={<Building2 />}
                title="Nema avio kompanija"
                description={
                  searchTerm
                    ? 'Nema kompanija koje odgovaraju vašoj pretrazi.'
                    : 'Dodajte prvu avio kompaniju kako biste mogli da kreirate letove.'
                }
              />
            )}
          </CardBody>
        </Card>

        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editing ? 'Izmeni avio kompaniju' : 'Dodaj avio kompaniju'}
          footer={
            <>
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                Otkaži
              </Button>
              <Button onClick={() => void submitForm()} isLoading={isSubmitting}>
                Sačuvaj
              </Button>
            </>
          }
        >
          <form onSubmit={handleSubmit}>
            <Input
              label="Naziv"
              required
              value={formData.naziv}
              onChange={(e) => setFormData((prev) => ({ ...prev, naziv: e.target.value }))}
              error={errors.naziv}
            />
            <Input
              label="Kod"
              required
              value={formData.kod}
              onChange={(e) => setFormData((prev) => ({ ...prev, kod: e.target.value.toUpperCase() }))}
              error={errors.kod}
              helper="IATA kod (2-4 karaktera)"
            />
            <Input
              label="Država"
              value={formData.drzava}
              onChange={(e) => setFormData((prev) => ({ ...prev, drzava: e.target.value }))}
            />
            <Input
              label="Logo URL (opciono)"
              value={formData.logo}
              onChange={(e) => setFormData((prev) => ({ ...prev, logo: e.target.value }))}
            />
          </form>
        </Modal>

        <Modal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          title="Obriši avio kompaniju"
          footer={
            <>
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
                Otkaži
              </Button>
              <Button variant="danger" onClick={handleDelete} isLoading={isSubmitting}>
                Obriši
              </Button>
            </>
          }
        >
          {deleteTarget && (
            <p>
              Da li ste sigurni da želite da obrišete kompaniju{' '}
              <strong>{deleteTarget.naziv}</strong>?
            </p>
          )}
        </Modal>
      </div>
    </>
  );
}
