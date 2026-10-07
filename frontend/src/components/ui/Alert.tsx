import type { HTMLAttributes } from 'react';
import type { NoticeTone } from '../../contexts/UIContext';
const tones = {
  info: 'border-blue-700 bg-blue-50 text-blue-900',
  success: 'border-green-700 bg-green-50 text-green-900',
  error: 'border-red-700 bg-red-50 text-red-900',
};
export function Alert({ tone = 'info', className = '', children, ...props }: HTMLAttributes<HTMLDivElement> & { tone?: NoticeTone }) {
  return <div {...props} role={tone === 'error' ? 'alert' : 'status'}
    className={`rounded-control border p-4 text-base ${tones[tone]} ${className}`}>{children}</div>;
}
