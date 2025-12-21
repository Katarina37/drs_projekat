import type { ReactNode, CSSProperties } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function Card({ children, className = '', style }: CardProps) {
  return (
    <div className={`card ${className}`} style={style}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export function CardHeader({ title, subtitle, action, className = '' }: CardHeaderProps) {
  return (
    <div className={`card-header ${className}`}>
      <div>
        <h3 className="card-title">{title}</h3>
        {subtitle && <p className="page-subtitle" style={{ margin: 0 }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

interface CardBodyProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function CardBody({ children, className = '', style }: CardBodyProps) {
  return (
    <div className={`card-body ${className}`} style={style}>
      {children}
    </div>
  );
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return <div className={`card-footer ${className}`}>{children}</div>;
}
