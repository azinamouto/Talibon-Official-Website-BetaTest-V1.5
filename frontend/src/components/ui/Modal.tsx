import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}
/** Native modal dialog supplies focus containment, inert background and Escape support. */
export function Modal({ open, title, onClose, children }: ModalProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    if (!open || !element) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);
  return createPortal(<dialog ref={dialog} aria-labelledby={titleId} aria-modal="true"
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onKeyDown={(event) => {
      if (event.key !== 'Tab') return;
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
      )).filter(element => element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}
    className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-panel bg-white p-panel text-ink shadow-xl backdrop:bg-slate-950/60">
    <div className="mb-4 flex items-start justify-between gap-4">
      <h2 id={titleId} className="text-xl font-bold">{title}</h2>
      <Button variant="secondary" onClick={onClose} aria-label={`Close ${title}`}>Close</Button>
    </div>
    {children}
  </dialog>, document.body);
}
