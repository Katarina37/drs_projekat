import { useState, type FormEvent } from 'react';
import { Wallet, Save } from 'lucide-react';
import { TopHeader } from '../components/layout/TopHeader';
import { 
  Card, 
  CardHeader, 
  CardBody, 
  Button, 
  Input, 
  Select,
  Avatar,
  RoleBadge
} from '../components';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { usersApi } from '../services/api';

type ProfileFormData = {
  ime: string;
  prezime: string;
  datum_rodjenja: string;
  pol: 'M' | 'Z' | '';
  drzava: string;
  ulica: string;
  broj: string;
};

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { addToast } = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  
  const [formData, setFormData] = useState<ProfileFormData>({
    ime: user?.ime || '',
    prezime: user?.prezime || '',
    datum_rodjenja: user?.datum_rodjenja || '',
    pol: user?.pol || '',
    drzava: user?.drzava || '',
    ulica: user?.ulica || '',
    broj: user?.broj || '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    try {
      const payload = {
        ...formData,
        pol: formData.pol === '' ? undefined : formData.pol,
      };
      const response = await usersApi.update(user.id, payload);
      
      if (response.success && response.data) {
        updateUser(response.data);
        addToast({
          type: 'success',
          title: 'Profil ažuriran',
          message: 'Vaši podaci su uspešno sačuvani.',
        });
        setIsEditing(false);
      } else {
        addToast({
          type: 'error',
          title: 'Greška',
          message: response.message || 'Nije moguće sačuvati promene.',
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Greška',
        message: 'Došlo je do greške.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!user || !depositAmount) return;
    
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      addToast({
        type: 'error',
        title: 'Greška',
        message: 'Unesite validan iznos.',
      });
      return;
    }

    setIsDepositing(true);
    try {
      const response = await usersApi.deposit(user.id, amount);
      
      if (response.success) {
        updateUser({
          ...user,
          stanje_racuna: response.data?.stanje_racuna || Number(user.stanje_racuna) + amount,
        });
        addToast({
          type: 'success',
          title: 'Uplata uspešna',
          message: `Uspešno ste uplatili ${amount.toFixed(2)} EUR na vaš račun.`,
        });
        setDepositAmount('');
      } else {
        addToast({
          type: 'error',
          title: 'Greška',
          message: response.message || 'Nije moguće izvršiti uplatu.',
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Greška',
        message: 'Došlo je do greške.',
      });
    } finally {
      setIsDepositing(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <TopHeader title="Profil" />
      <div className="page-content">
        <div className="grid-2" style={{ alignItems: 'start' }}>
          {/* Profile Info */}
          <Card>
            <CardHeader 
              title="Informacije o profilu"
              action={
                !isEditing && (
                  <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
                    Izmeni
                  </Button>
                )
              }
            />
            <CardBody>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-xl)' }}>
                <Avatar 
                  name={`${user.ime} ${user.prezime}`} 
                  src={user.profilna_slika}
                  size="xl"
                />
                <div>
                  <h3 style={{ marginBottom: 'var(--spacing-xs)' }}>{user.ime} {user.prezime}</h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>{user.email}</p>
                  <div style={{ marginTop: 'var(--spacing-sm)' }}>
                    <RoleBadge role={user.uloga} />
                  </div>
                </div>
              </div>

              {isEditing ? (
                <form onSubmit={handleSave}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                    <Input
                      label="Ime"
                      value={formData.ime}
                      onChange={(e) => handleChange('ime', e.target.value)}
                    />
                    <Input
                      label="Prezime"
                      value={formData.prezime}
                      onChange={(e) => handleChange('prezime', e.target.value)}
                    />
                    <Input
                      label="Datum rođenja"
                      type="date"
                      value={formData.datum_rodjenja}
                      onChange={(e) => handleChange('datum_rodjenja', e.target.value)}
                    />
                    <Select
                      label="Pol"
                      value={formData.pol}
                      onChange={(e) => handleChange('pol', e.target.value)}
                      options={[
                        { value: 'M', label: 'Muški' },
                        { value: 'Z', label: 'Ženski' },
                      ]}
                    />
                    <Input
                      label="Država"
                      value={formData.drzava}
                      onChange={(e) => handleChange('drzava', e.target.value)}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--spacing-sm)' }}>
                      <Input
                        label="Ulica"
                        value={formData.ulica}
                        onChange={(e) => handleChange('ulica', e.target.value)}
                      />
                      <Input
                        label="Broj"
                        value={formData.broj}
                        onChange={(e) => handleChange('broj', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-lg)' }}>
                    <Button type="submit" isLoading={isLoading} leftIcon={<Save size={18} />}>
                      Sačuvaj
                    </Button>
                    <Button variant="secondary" onClick={() => setIsEditing(false)}>
                      Otkaži
                    </Button>
                  </div>
                </form>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
                  <div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--spacing-xs)' }}>Datum rođenja</div>
                    <div>{new Date(user.datum_rodjenja).toLocaleDateString('sr-RS')}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--spacing-xs)' }}>Pol</div>
                    <div>{user.pol === 'M' ? 'Muški' : 'Ženski'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--spacing-xs)' }}>Država</div>
                    <div>{user.drzava}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--spacing-xs)' }}>Adresa</div>
                    <div>{user.ulica} {user.broj}</div>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Wallet */}
          <Card>
            <CardHeader title="Stanje računa" />
            <CardBody>
              <div style={{ 
                padding: 'var(--spacing-xl)', 
                background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%)',
                borderRadius: 'var(--radius-lg)',
                color: 'white',
                marginBottom: 'var(--spacing-lg)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                  <Wallet size={20} />
                  <span style={{ fontSize: 'var(--font-size-sm)', opacity: 0.9 }}>Trenutno stanje</span>
                </div>
                <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)' }}>
                  {Number(user.stanje_racuna).toFixed(2)} EUR
                </div>
              </div>
              
              <h4 style={{ marginBottom: 'var(--spacing-md)' }}>Uplata sredstava</h4>
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                <Input
                  type="number"
                  placeholder="Unesite iznos"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  min="0"
                  step="0.01"
                />
                <Button onClick={handleDeposit} isLoading={isDepositing}>
                  Uplati
                </Button>
              </div>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--spacing-sm)' }}>
                * Ovo je simulacija uplate za potrebe testiranja.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
