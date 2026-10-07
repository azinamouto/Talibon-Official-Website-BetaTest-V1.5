import { useId, type InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}
export function Input({ label, hint, error, id, className = '', 'aria-describedby': describedBy, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const description = [describedBy, hint && `${inputId}-hint`, error && `${inputId}-error`].filter(Boolean).join(' ') || undefined;
  return <div className="space-y-2 text-left">
    <label htmlFor={inputId} className="block text-base font-semibold text-ink">{label}</label>
    <input {...props} id={inputId} aria-invalid={error ? true : props['aria-invalid']} aria-describedby={description}
      className={`ui-focus min-h-11 w-full rounded-control border border-control bg-white px-3 py-2 text-base text-ink placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-60 ${className}`} />
    {hint && <p id={`${inputId}-hint`} className="text-sm text-muted">{hint}</p>}
    {error && <p id={`${inputId}-error`} className="text-sm text-danger">{error}</p>}
  </div>;
}
