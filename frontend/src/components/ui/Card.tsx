import type { HTMLAttributes } from 'react';
export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`rounded-panel border border-slate-200 bg-white p-panel text-ink shadow-sm ${className}`} />;
}
