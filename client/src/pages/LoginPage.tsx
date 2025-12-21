import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { addToast } = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    if (!email) {
      newErrors.email = 'Email je obavezan';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Unesite validnu email adresu';
    }
    
    if (!password) {
      newErrors.password = 'Lozinka je obavezna';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setIsLoading(true);
    
    try {
      const response = await login({ email, password });
      
      if (response.success) {
        addToast({
          type: 'success',
          title: 'Dobrodošli!',
          message: 'Uspešno ste se prijavili.',
        });
        navigate('/dashboard');
      } else {
        addToast({
          type: 'error',
          title: 'Greška pri prijavi',
          message: response.message || 'Pogrešan email ili lozinka.',
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
        <div className="input-group">
          <label className="input-label required">Email adresa</label>
          <div style={{ position: 'relative' }}>
            <Mail 
              size={18} 
              style={{ 
                position: 'absolute', 
                left: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: 'var(--text-tertiary)'
              }} 
            />
            <input
              type="email"
              className={`input ${errors.email ? 'input-error' : ''}`}
              style={{ paddingLeft: '40px' }}
              placeholder="vas@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {errors.email && <span className="input-error-message">{errors.email}</span>}
        </div>

        <div className="input-group">
          <label className="input-label required">Lozinka</label>
          <div style={{ position: 'relative' }}>
            <Lock 
              size={18} 
              style={{ 
                position: 'absolute', 
                left: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: 'var(--text-tertiary)'
              }} 
            />
            <input
              type={showPassword ? 'text' : 'password'}
              className={`input ${errors.password ? 'input-error' : ''}`}
              style={{ paddingLeft: '40px', paddingRight: '40px' }}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ 
                position: 'absolute', 
                right: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: 'var(--text-tertiary)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && <span className="input-error-message">{errors.password}</span>}
        </div>

        <Button
          type="submit"
          isLoading={isLoading}
          style={{ width: '100%', marginTop: 'var(--spacing-sm)' }}
        >
          Prijavi se
        </Button>
      </form>

      <div className="auth-footer">
        Nemate nalog?{' '}
        <Link to="/register">Registrujte se</Link>
      </div>
    </div>
  );
}
