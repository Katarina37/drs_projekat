import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button, Input, Select } from '../components';

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
  });
  const [isLoading, setIsLoading] = useState(false);
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
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setIsLoading(true);
    
    try {
      const { confirmPassword, ...registerData } = formData;
      const response = await register({
        ...registerData,
        pol: registerData.pol as 'M' | 'Z',
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
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Greška',
        message: 'Došlo je do greške. Pokušajte ponovo.',
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

        <Button
          type="submit"
          isLoading={isLoading}
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
