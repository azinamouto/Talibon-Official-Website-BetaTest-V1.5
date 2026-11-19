import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { StaffRequestError, staffResponseError } from '../lib/staffErrors';

type Staff = { id: string; role: 'admin' | 'editor' };
function isStaff(value: unknown): value is Staff {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === 'string' && (record.role === 'admin' || record.role === 'editor');
}
export async function staffRequest<T = unknown>(path: string, body?: unknown): Promise<T> {
  let response: Response;
  try { response = await fetch(path, { method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store' }); }
  catch { throw new StaffRequestError(503); }
  if (!response.ok) {
    throw staffResponseError(response.status,await response.json().catch(() => null));
  }
  try { return await response.json() as T; }
  catch { throw new StaffRequestError(503); }
}
const Context = createContext<{ staff: Staff | null; loading: boolean; error: string | null; refresh(): Promise<void>; signOut(): Promise<void> } | null>(null);
export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  async function refresh() {
    setError(null);
    try {
      const current = await staffRequest<unknown>('/api/staff/me');
      if (!isStaff(current)) throw new Error('Invalid staff session response.');
      setStaff(current);
    }
    catch (reason) {
      setStaff(null);
      if (!(reason instanceof StaffRequestError && reason.status === 401)) {
        setError('Staff authentication is unavailable. Please retry.');
      }
    }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);
  async function signOut() { await staffRequest('/api/staff-auth/sign-out', {}); setStaff(null); }
  return <Context.Provider value={{ staff, loading, error, refresh, signOut }}>{children}</Context.Provider>;
}
export function useStaffAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('StaffAuthProvider is required');
  return value;
}
