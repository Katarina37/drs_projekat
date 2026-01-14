import { useState, type FormEvent, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button, Input, Select } from '../components';

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

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { addToast } = useToast();
  
  const [formData, setFormData] = useState({
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
    stanje_racuna: '',
    profilna_slika: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.ime) newErrors.ime = 'Ime je obavezno';
    if (!formData.prezime) newErrors.prezime = 'Prezime je obavezno';
    if (!formData.email) {
      newErrors.email = 'Email je obavezan';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Unesite validnu email adresu';
    }
    if (!formData.password) {
      newErrors.password = 'Lozinka je obavezna';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Lozinka mora imati najmanje 6 karaktera';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Lozinke se ne poklapaju';
    }
    if (!formData.datum_rodjenja) newErrors.datum_rodjenja = 'Datum rođenja je obavezan';
    if (!formData.pol) newErrors.pol = 'Pol je obavezan';
    if (!formData.drzava) newErrors.drzava = 'Država je obavezna';
    if (!formData.ulica) newErrors.ulica = 'Ulica je obavezna';
    if (!formData.broj) newErrors.broj = 'Broj je obavezan';
    if (formData.stanje_racuna === '') {
      newErrors.stanje_racuna = 'Stanje računa je obavezno';
    } else if (Number.isNaN(Number(formData.stanje_racuna)) || Number(formData.stanje_racuna) < 0) {
      newErrors.stanje_racuna = 'Unesite validan iznos';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setFormData((prev) => ({ ...prev, profilna_slika: '' }));
      return;
    }

    // Provjeri veličinu fajla (max 5 MB originalni fajl)
    if (file.size > 5 * 1024 * 1024) {
      addToast({
        type: 'error',
        title: 'Greška',
        message: 'Slika je prevelika. Maksimalna veličina je 5 MB.',
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setIsLoading(true);
    
    try {
      const { confirmPassword, ...registerData } = formData;
      const response = await register({
        ime: registerData.ime,
        prezime: registerData.prezime,
        email: registerData.email,
        password: registerData.password,
        datum_rodjenja: registerData.datum_rodjenja,
        pol: registerData.pol as 'M' | 'Z',
        drzava: registerData.drzava,
        ulica: registerData.ulica,
        broj: registerData.broj,
        stanje_racuna: Number(registerData.stanje_racuna),
        profilna_slika: registerData.profilna_slika || undefined,
      });
      
      if (response.success) {
        addToast({
          type: 'success',
          title: 'Uspešna registracija!',
          message: 'Sada se možete prijaviti.',
        });
        navigate('/login');
      } else {
        addToast({
          type: 'error',
          title: 'Greška pri registraciji',
          message: response.message || 'Došlo je do greške.',
        });
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      addToast({
        type: 'error',
        title: 'Greška',
        message: error?.response?.data?.message || 'Došlo je do greške. Pokušajte ponovo.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-form-row">
          <Input
            label="Ime"
            required
            value={formData.ime}
            onChange={(e) => handleChange('ime', e.target.value)}
            error={errors.ime}
            placeholder="Vaše ime"
          />
          <Input
            label="Prezime"
            required
            value={formData.prezime}
            onChange={(e) => handleChange('prezime', e.target.value)}
            error={errors.prezime}
            placeholder="Vaše prezime"
          />
        </div>

        <Input
          label="Email"
          type="email"
          required
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          error={errors.email}
          placeholder="vas@email.com"
        />

        <div className="auth-form-row">
          <Input
            label="Lozinka"
            type="password"
            required
            value={formData.password}
            onChange={(e) => handleChange('password', e.target.value)}
            error={errors.password}
            placeholder="••••••••"
          />
          <Input
            label="Potvrda lozinke"
            type="password"
            required
            value={formData.confirmPassword}
            onChange={(e) => handleChange('confirmPassword', e.target.value)}
            error={errors.confirmPassword}
            placeholder="••••••••"
          />
        </div>

        <div className="auth-form-row">
          <Input
            label="Datum rođenja"
            type="date"
            required
            value={formData.datum_rodjenja}
            onChange={(e) => handleChange('datum_rodjenja', e.target.value)}
            error={errors.datum_rodjenja}
          />
          <Select
            label="Pol"
            required
            value={formData.pol}
            onChange={(e) => handleChange('pol', e.target.value)}
            error={errors.pol}
            placeholder="Izaberite pol"
            options={[
              { value: 'M', label: 'Muški' },
              { value: 'Z', label: 'Ženski' },
            ]}
          />
        </div>

        <Input
          label="Država"
          required
          value={formData.drzava}
          onChange={(e) => handleChange('drzava', e.target.value)}
          error={errors.drzava}
          placeholder="Srbija"
        />

        <div className="auth-form-row">
          <Input
            label="Ulica"
            required
            value={formData.ulica}
            onChange={(e) => handleChange('ulica', e.target.value)}
            error={errors.ulica}
            placeholder="Glavna ulica"
          />
          <Input
            label="Broj"
            required
            value={formData.broj}
            onChange={(e) => handleChange('broj', e.target.value)}
            error={errors.broj}
            placeholder="123"
          />
        </div>

        <div className="auth-form-row">
          <Input
            label="Stanje računa"
            type="number"
            required
            value={formData.stanje_racuna}
            onChange={(e) => handleChange('stanje_racuna', e.target.value)}
            error={errors.stanje_racuna}
            placeholder="0.00"
            min="0"
            step="0.01"
          />
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
                  : 'Opcionalno (max 5 MB)'
            }
          />
        </div>

        {/* Prikaz učitane slike */}
        {formData.profilna_slika && (
          <div style={{ marginBottom: 'var(--spacing-md)', textAlign: 'center' }}>
            <img 
              src={formData.profilna_slika} 
              alt="Profilna slika" 
              style={{ 
                maxWidth: '150px', 
                maxHeight: '150px', 
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-medium)'
              }} 
            />
            <button 
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, profilna_slika: '' }))}
              style={{
                display: 'block',
                margin: 'var(--spacing-xs) auto 0',
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
          </div>
        )}

        <Button
          type="submit"
          isLoading={isLoading || isImageLoading}
          disabled={isImageLoading}
          style={{ width: '100%', marginTop: 'var(--spacing-sm)' }}
        >
          Registruj se
        </Button>
      </form>

      <div className="auth-footer">
        Već imate nalog?{' '}
        <Link to="/login">Prijavite se</Link>
      </div>
    </div>
  );
}