import { Bell, Wallet } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { IconButton } from '..';

interface TopHeaderProps {
  title: string;
}

export function TopHeader({ title }: TopHeaderProps) {
  const { user } = useAuth();

  return (
    <header className="top-header">
      <div className="top-header-left">
        <h1 className="page-title">{title}</h1>
      </div>
      <div className="top-header-right">
        {user && (
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 'var(--spacing-sm)',
              padding: 'var(--spacing-xs) var(--spacing-md)',
              background: 'var(--color-gray-100)',
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)'
            }}
          >
            <Wallet size={16} style={{ color: 'var(--color-primary)' }} />
            <span>{Number(user.stanje_racuna).toFixed(2)} EUR</span>
          </div>
        )}
        <IconButton
          icon={<Bell size={20} />}
          label="Notifikacije"
          variant="ghost"
        />
      </div>
    </header>
  );
}
