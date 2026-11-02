import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Staff = { id: string; role: 'admin' | 'editor' };
export async function staffRequest<T = unknown>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, { method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store' });
  if (!response.ok) throw new Error(response.status === 401 ? 'Sign in and complete MFA to continue.' : 'Request could not be completed. Please try again.');
  return response.json() as Promise<T>;
}
const Context = createContext<{ staff: Staff | null; loading: boolean; error: string | null; refresh(): Promise<void>; signOut(): Promise<void> } | null>(null);
export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  async function refresh() {
    setError(null);
    try { setStaff(await staffRequest<Staff>('/api/staff/me')); }
    catch (reason) {
      setStaff(null);
      if (!(reason instanceof Error && reason.message === 'Sign in and complete MFA to continue.')) {
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
/** Navbar compatibility contains no provider tokens or citizen identities. */
export function useAuth() {
  const { staff, loading, signOut } = useStaffAuth();
  return { user: staff ? { id: staff.id, email: '', user_metadata: { full_name: 'Staff' } } : null,
    profile: staff ? { ...staff, full_name: 'Staff', is_verified: true } : null,
    state: loading ? 'INITIALIZING' : staff ? 'AUTHENTICATED' : 'UNAUTHENTICATED', signOut };
}
