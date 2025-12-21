interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const sizeClass = size === 'sm' ? 'spinner-sm' : size === 'lg' ? 'spinner-lg' : '';
  return <div className={`spinner ${sizeClass} ${className}`} />;
}

interface LoadingPageProps {
  message?: string;
}

export function LoadingPage({ message = 'Učitavanje...' }: LoadingPageProps) {
  return (
    <div className="empty-state">
      <Spinner size="lg" />
      <p style={{ marginTop: 'var(--spacing-md)', color: 'var(--text-secondary)' }}>
        {message}
      </p>
    </div>
  );
}
