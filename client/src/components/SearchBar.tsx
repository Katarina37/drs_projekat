import { Search } from 'lucide-react';
import type { InputHTMLAttributes } from 'react';

interface SearchBarProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onSearch?: (value: string) => void;
}

export function SearchBar({ onSearch, className = '', ...props }: SearchBarProps) {
  return (
    <div className={`search-bar ${className}`}>
      <Search size={18} className="search-bar-icon" />
      <input
        type="search"
        className="input"
        onChange={(e) => onSearch?.(e.target.value)}
        {...props}
      />
    </div>
  );
}
