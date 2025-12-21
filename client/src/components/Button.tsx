import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';
  
  return (
    <button
      className={`btn btn-${variant} ${sizeClass} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="spinner spinner-sm" />
      ) : (
        leftIcon
      )}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
  icon: ReactNode;
  label: string;
}

export function IconButton({
  variant = 'ghost',
  size = 'md',
  icon,
  label,
  className = '',
  ...props
}: IconButtonProps) {
  const sizeClass = size === 'sm' ? 'btn-sm' : '';
  
  return (
    <button
      className={`btn btn-${variant} btn-icon ${sizeClass} ${className}`}
      aria-label={label}
      title={label}
      {...props}
    >
      {icon}
    </button>
  );
}
