import { useEffect, useState, type DependencyList, type ReactNode } from 'react';
import { Button } from '../ui/Button';

export const control = 'ui-focus min-h-11 w-full rounded-control border border-control bg-white px-3 py-2 text-ink';
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-1 text-sm font-semibold">{label}{children}</label>;
}
export function Failure({ message }: { message: string }) { return message ? <p role="alert" className="my-4 rounded-lg bg-red-50 p-4 text-red-800">{message}</p> : null; }
export function errorMessage(error: unknown) { return error instanceof Error ? error.message : 'The request failed. Please try again.'; }
export function useAdminLoad<T>(loader: (signal: AbortSignal) => Promise<T>, deps: DependencyList) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setData(null); setError('');
    loader(controller.signal).then(value => { if (!controller.signal.aborted) setData(value); })
      .catch(cause => { if (!controller.signal.aborted) setError(errorMessage(cause)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
    // Callers supply all loader inputs as dependencies.
  }, [...deps, revision]);
  return { data, error, loading, reload: () => setRevision(value => value + 1) };
}
export function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (page: number) => void }) {
  return <div className="mt-4 flex flex-wrap items-center gap-3"><Button variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</Button>
    <span>Page {page} of {Math.max(1, pages)}</span><Button variant="secondary" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</Button></div>;
}
