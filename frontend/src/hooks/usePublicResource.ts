import { useEffect, useState } from 'react';

export function usePublicResource<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: string | null }>({ data: null, loading: true, error: null });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ data: null, loading: true, error: null });
    load(controller.signal).then(data => {
      if (!controller.signal.aborted) setState({ data, loading: false, error: null });
    }).catch(error => {
      if (!controller.signal.aborted) setState({ data: null, loading: false, error: error?.status === 429 ? error.message : 'Unable to load content. Please try again.' });
    });
    return () => controller.abort();
  }, [load, attempt]);
  return { ...state, retry: () => setAttempt(value => value + 1) };
}
