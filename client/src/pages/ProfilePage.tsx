import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
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
import type { User } from '../types';

// Funkcija za kompresiju slike
const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Smanji dimenzije ako je slika prevelika
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Konvertuj u base64 sa kompresijom
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

type ProfileFormData = {
  ime: string;
  prezime: string;
  email: string;
  password: string;
  confirmPassword: string;
  datum_rodjenja: string;
  pol: 'M' | 'Z' | '';
  drzava: string;
  ulica: string;
  broj: string;
  profilna_slika: string;
};

const emptyFormData: ProfileFormData = {
  ime: '',
  prezime: '',
  email: '',
  password: '',
  confirmPassword: '',
  datum_rodjenja: '',
  pol: '',
  drzava: '',
  ulica: '',
  broj: '',
  profilna_slika: '',
};

const buildFormData = (currentUser: User | null): ProfileFormData => ({
  ...emptyFormData,
  ime: currentUser?.ime || '',
  prezime: currentUser?.prezime || '',
  email: currentUser?.email || '',
  datum_rodjenja: currentUser?.datum_rodjenja || '',
  pol: currentUser?.pol || '',
  drzava: currentUser?.drzava || '',
  ulica: currentUser?.ulica || '',
  broj: currentUser?.broj || '',
  profilna_slika: currentUser?.profilna_slika || '',
});

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { addToast } = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);

  const [formData, setFormData] = useState<ProfileFormData>(() => buildFormData(user));

  useEffect(() => {
    if (!user || isEditing) return;
    setFormData(buildFormData(user));
  }, [user, isEditing]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setFormData((prev) => ({ ...prev, profilna_slika: '' }));
      return;
    }

    // Provjeri veličinu fajla (max 10 MB originalni fajl)
    if (file.size > 10 * 1024 * 1024) {
      addToast({
        type: 'error',
        title: 'Greška',
        message: 'Slika je prevelika. Maksimalna veličina je 10 MB.',
      });
      e.target.value = ''; // Reset input
      return;
    }

    // Provjeri tip fajla
    if (!file.type.startsWith('image/')) {
      addToast({
        type: 'error',
        title: 'Greška',
        message: 'Molimo izaberite sliku.',
      });
      e.target.value = '';
      return;
    }

    setIsImageLoading(true);
    try {
      // Kompresuj sliku
      const compressedBase64 = await compressImage(file, 800, 0.7);
      setFormData((prev) => ({ ...prev, profilna_slika: compressedBase64 }));
    } catch (error) {
      console.error('Error compressing image:', error);
      addToast({
        type: 'error',
        title: 'Greška',
        message: 'Došlo je do greške pri obradi slike.',
      });
      e.target.value = '';
    } finally {
      setIsImageLoading(false);
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.email) {
      addToast({
        type: 'error',
        title: 'Greška',
        message: 'Email je obavezan.',
      });
      return;
    }

    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      addToast({
        type: 'error',
        title: 'Greška',
        message: 'Unesite validnu email adresu.',
      });
      return;
    }

    if (formData.password) {
      if (formData.password.length < 6) {
        addToast({
          type: 'error',
          title: 'Greška',
          message: 'Lozinka mora imati najmanje 6 karaktera.',
        });
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        addToast({
          type: 'error',
          title: 'Greška',
          message: 'Lozinke se ne poklapaju.',
        });
        return;
      }
    }

    setIsLoading(true);
    try {
      const updatePayload = {
        ime: formData.ime || undefined,
        prezime: formData.prezime || undefined,
        email: formData.email || undefined,
        password: formData.password || undefined,
        datum_rodjenja: formData.datum_rodjenja || undefined,
        pol: formData.pol === '' ? undefined : formData.pol,
        drzava: formData.drzava || undefined,
        ulica: formData.ulica || undefined,
        broj: formData.broj || undefined,
        profilna_slika: formData.profilna_slika || undefined,
      };
      
      const response = await usersApi.update(user.id, updatePayload);

      if (!response.success || !response.data) {
        addToast({
          type: 'error',
          title: 'Greška',
          message: response.message || 'Nije moguće sačuvati promene.',
        });
        return;
      }

      const updatedUser = response.data;
      updateUser(updatedUser);
      setFormData(buildFormData(updatedUser));
      addToast({
        type: 'success',
        title: 'Profil ažuriran',
        message: 'Vaši podaci su uspešno sačuvani.',
      });
      setIsEditing(false);
    } catch (error: any) {
      console.error('Update error:', error);
      addToast({
        type: 'error',
        title: 'Greška',
        message: error?.response?.data?.message || 'Došlo je do greške.',
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
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Greška',
        message: error?.response?.data?.message || 'Došlo je do greške.',
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
                  src={isEditing ? (formData.profilna_slika || user.profilna_slika) : user.profilna_slika}
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
                      label="Email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
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
                    <div>
                      <Input
                        label="Profilna slika"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        disabled={isImageLoading}
                        helper={
                          isImageLoading 
                            ? 'Učitavanje...' 
                            : formData.profilna_slika 
                              ? 'Slika je učitana'
                              : 'Opcionalno (max 10 MB)'
                        }
                      />
                      {formData.profilna_slika && (
                        <button 
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, profilna_slika: '' }))}
                          style={{
                            marginTop: 'var(--spacing-xs)',
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--color-error)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            textDecoration: 'underline'
                          }}
                        >
                          Ukloni sliku
                        </button>
                      )}
                    </div>
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
                    <Input
                      label="Nova lozinka"
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      placeholder="••••••••"
                    />
                    <Input
                      label="Potvrda lozinke"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleChange('confirmPassword', e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  
                  <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-lg)' }}>
                    <Button 
                      type="submit" 
                      isLoading={isLoading} 
                      disabled={isImageLoading}
                      leftIcon={<Save size={18} />}
                    >
                      Sačuvaj
                    </Button>
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={() => {
                        setFormData(buildFormData(user));
                        setIsEditing(false);
                      }}
                    >
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
                  style={{ flex: 1 }}
                />
                <Button
                  onClick={handleDeposit}
                  isLoading={isDepositing}
                  disabled={!depositAmount || isDepositing}
                >
                  Uplati
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
