import type { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  busy?: boolean;
}
const variants = {
  primary: 'bg-action text-white hover:bg-action-hover',
  secondary: 'border border-control bg-white text-ink hover:bg-surface',
  danger: 'bg-danger text-white hover:bg-danger-hover',
};
export function Button({ variant = 'primary', busy = false, disabled, type = 'button', className = '', children, ...props }: ButtonProps) {
  return <button {...props} type={type} disabled={disabled || busy} aria-busy={busy || undefined}
    className={`ui-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-4 py-2 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}>
    {children}
  </button>;
}
