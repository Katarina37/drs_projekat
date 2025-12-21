import { useState, useEffect } from 'react';
import { Users, Trash2, Shield } from 'lucide-react';
import { TopHeader } from '../components/layout/TopHeader';
import { 
  Card, 
  CardBody, 
  Table, 
  Button, 
  Modal,
  Select,
  Avatar,
  RoleBadge,
  SearchBar,
  EmptyState,
  Spinner
} from '../components';
import { usersApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import type { User } from '../types';
import { UserRole } from '../types';

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const { addToast } = useToast();
  
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleModal, setRoleModal] = useState<User | null>(null);
  const [deleteModal, setDeleteModal] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const response = await usersApi.getAll();
      if (response.success) {
        setUsers(response.data || []);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      addToast({
        type: 'error',
        title: 'Greška',
        message: 'Nije moguće učitati korisnike.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeRole = async () => {
    if (!roleModal || !selectedRole) return;

    setIsSubmitting(true);
    try {
      const response = await usersApi.changeRole(roleModal.id, selectedRole);
      
      if (response.success) {
        addToast({
          type: 'success',
          title: 'Uloga promenjena',
          message: `Uloga korisnika ${roleModal.ime} ${roleModal.prezime} je uspešno promenjena.`,
        });
        setRoleModal(null);
        setSelectedRole('');
        loadUsers();
      } else {
        addToast({
          type: 'error',
          title: 'Greška',
          message: response.message || 'Nije moguće promeniti ulogu.',
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

  const handleDeleteUser = async () => {
    if (!deleteModal) return;

    setIsSubmitting(true);
    try {
      const response = await usersApi.delete(deleteModal.id);
      
      if (response.success) {
        addToast({
          type: 'success',
          title: 'Korisnik obrisan',
          message: `Korisnik ${deleteModal.ime} ${deleteModal.prezime} je uspešno obrisan.`,
        });
        setDeleteModal(null);
        loadUsers();
      } else {
        addToast({
          type: 'error',
          title: 'Greška',
          message: response.message || 'Nije moguće obrisati korisnika.',
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

  const filteredUsers = users.filter((user) =>
    `${user.ime} ${user.prezime} ${user.email}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const columns = [
    {
      key: 'user',
      header: 'Korisnik',
      render: (user: User) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
          <Avatar name={`${user.ime} ${user.prezime}`} src={user.profilna_slika} size="sm" />
          <div>
            <div style={{ fontWeight: 'var(--font-weight-medium)' }}>{user.ime} {user.prezime}</div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>{user.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'uloga',
      header: 'Uloga',
      render: (user: User) => <RoleBadge role={user.uloga} />,
    },
    {
      key: 'stanje_racuna',
      header: 'Stanje',
      render: (user: User) => `${Number(user.stanje_racuna).toFixed(2)} €`,
    },
    {
      key: 'drzava',
      header: 'Država',
    },
    {
      key: 'kreiran',
      header: 'Registrovan',
      render: (user: User) => new Date(user.kreiran).toLocaleDateString('sr-RS'),
    },
    {
      key: 'actions',
      header: 'Akcije',
      render: (user: User) => (
        <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setRoleModal(user);
              setSelectedRole(user.uloga);
            }}
            disabled={user.id === currentUser?.id}
          >
            <Shield size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteModal(user)}
            disabled={user.id === currentUser?.id}
          >
            <Trash2 size={16} style={{ color: 'var(--color-error)' }} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <TopHeader title="Korisnici" />
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-row">
            <div>
              <h2>Upravljanje korisnicima</h2>
              <p className="page-subtitle">
                Pregled i upravljanje svim korisnicima platforme.
              </p>
            </div>
          </div>
        </div>

        <div className="filters-bar">
          <SearchBar
            placeholder="Pretraži korisnike..."
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
            ) : filteredUsers.length > 0 ? (
              <Table
                columns={columns}
                data={filteredUsers}
                keyExtractor={(user) => user.id}
              />
            ) : (
              <EmptyState
                icon={<Users />}
                title="Nema korisnika"
                description={searchTerm ? 'Nema korisnika koji odgovaraju pretrazi.' : 'Nema registrovanih korisnika.'}
              />
            )}
          </CardBody>
        </Card>

        {/* Change Role Modal */}
        <Modal
          isOpen={!!roleModal}
          onClose={() => {
            setRoleModal(null);
            setSelectedRole('');
          }}
          title="Promeni ulogu korisnika"
          footer={
            <>
              <Button variant="secondary" onClick={() => setRoleModal(null)}>
                Otkaži
              </Button>
              <Button onClick={handleChangeRole} isLoading={isSubmitting}>
                Sačuvaj
              </Button>
            </>
          }
        >
          {roleModal && (
            <div>
              <p style={{ marginBottom: 'var(--spacing-lg)' }}>
                Promenite ulogu za korisnika <strong>{roleModal.ime} {roleModal.prezime}</strong>.
              </p>
              <Select
                label="Nova uloga"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                options={[
                  { value: UserRole.KORISNIK, label: 'Korisnik' },
                  { value: UserRole.MENADZER, label: 'Menadžer' },
                  { value: UserRole.ADMINISTRATOR, label: 'Administrator' },
                ]}
              />
            </div>
          )}
        </Modal>

        {/* Delete User Modal */}
        <Modal
          isOpen={!!deleteModal}
          onClose={() => setDeleteModal(null)}
          title="Obriši korisnika"
          footer={
            <>
              <Button variant="secondary" onClick={() => setDeleteModal(null)}>
                Otkaži
              </Button>
              <Button variant="danger" onClick={handleDeleteUser} isLoading={isSubmitting}>
                Obriši
              </Button>
            </>
          }
        >
          {deleteModal && (
            <p>
              Da li ste sigurni da želite da obrišete korisnika{' '}
              <strong>{deleteModal.ime} {deleteModal.prezime}</strong>? Ova akcija je nepovratna.
            </p>
          )}
        </Modal>
      </div>
    </>
  );
}
