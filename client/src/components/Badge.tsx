import type { ReactNode } from 'react';
import { FlightStatus, UserRole } from '../types';

interface BadgeProps {
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'gray';
  children: ReactNode;
  className?: string;
}

export function Badge({ variant = 'gray', children, className = '' }: BadgeProps) {
  return (
    <span className={`badge badge-${variant} ${className}`}>
      {children}
    </span>
  );
}

// Status badge component
interface StatusBadgeProps {
  status: FlightStatus;
}

export function FlightStatusBadge({ status }: StatusBadgeProps) {
  const config: Record<FlightStatus, { variant: BadgeProps['variant']; label: string }> = {
    [FlightStatus.CEKA_ODOBRENJE]: { variant: 'warning', label: 'Čeka odobrenje' },
    [FlightStatus.ODOBREN]: { variant: 'success', label: 'Odobren' },
    [FlightStatus.ODBIJEN]: { variant: 'error', label: 'Odbijen' },
    [FlightStatus.U_TOKU]: { variant: 'info', label: 'U toku' },
    [FlightStatus.ZAVRSEN]: { variant: 'gray', label: 'Završen' },
    [FlightStatus.OTKAZAN]: { variant: 'error', label: 'Otkazan' },
  };

  const { variant, label } = config[status] || { variant: 'gray', label: status };

  return <Badge variant={variant}>{label}</Badge>;
}

// Role badge component
interface RoleBadgeProps {
  role: UserRole;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const config: Record<UserRole, { variant: BadgeProps['variant']; label: string }> = {
    [UserRole.KORISNIK]: { variant: 'gray', label: 'Korisnik' },
    [UserRole.MENADZER]: { variant: 'info', label: 'Menadžer' },
    [UserRole.ADMINISTRATOR]: { variant: 'primary', label: 'Administrator' },
  };

  const { variant, label } = config[role] || { variant: 'gray', label: role };

  return <Badge variant={variant}>{label}</Badge>;
}
