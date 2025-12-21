import type { ReactNode } from 'react';

interface StatsCardProps {
  icon: ReactNode;
  value: string | number;
  label: string;
  className?: string;
}

export function StatsCard({ icon, value, label, className = '' }: StatsCardProps) {
  return (
    <div className={`stats-card ${className}`}>
      <div className="stats-icon">{icon}</div>
      <div className="stats-content">
        <div className="stats-value">{value}</div>
        <div className="stats-label">{label}</div>
      </div>
    </div>
  );
}
