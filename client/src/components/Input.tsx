import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
  required?: boolean;
}

export function Input({
  label,
  error,
  helper,
  required,
  className = '',
  id,
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  
  return (
    <div className="input-group">
      {label && (
        <label htmlFor={inputId} className={`input-label ${required ? 'required' : ''}`}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`input ${error ? 'input-error' : ''} ${className}`}
        {...props}
      />
      {error && <span className="input-error-message">{error}</span>}
      {helper && !error && <span className="input-helper">{helper}</span>}
    </div>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helper?: string;
  required?: boolean;
  options: Array<{ value: string | number; label: string }>;
  placeholder?: string;
}

export function Select({
  label,
  error,
  helper,
  required,
  options,
  placeholder,
  className = '',
  id,
  ...props
}: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
  
  return (
    <div className="input-group">
      {label && (
        <label htmlFor={selectId} className={`input-label ${required ? 'required' : ''}`}>
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`input select ${error ? 'input-error' : ''} ${className}`}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <span className="input-error-message">{error}</span>}
      {helper && !error && <span className="input-helper">{helper}</span>}
    </div>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helper?: string;
  required?: boolean;
}

export function Textarea({
  label,
  error,
  helper,
  required,
  className = '',
  id,
  ...props
}: TextareaProps) {
  const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');
  
  return (
    <div className="input-group">
      {label && (
        <label htmlFor={textareaId} className={`input-label ${required ? 'required' : ''}`}>
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`input ${error ? 'input-error' : ''} ${className}`}
        {...props}
      />
      {error && <span className="input-error-message">{error}</span>}
      {helper && !error && <span className="input-helper">{helper}</span>}
    </div>
  );
}
