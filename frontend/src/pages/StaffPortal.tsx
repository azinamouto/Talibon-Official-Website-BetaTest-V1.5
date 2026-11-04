import { Navigate } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { staffRequest, useStaffAuth } from '../contexts/StaffAuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import AdminMedia from '../components/admin/AdminMedia';

type StaffAccount = {
  id: string;
  email: string;
  role: 'admin' | 'editor';
  active: boolean;
  version: number;
};
type StaffEvent = {
  id: string;
  source: string;
  action: string;
  actorId: string | null;
  subjectId: string | null;
  occurredAt: string;
};
type StaffPage<T> = { data: T[]; pagination: { page: number; limit: number; hasMore: boolean } };

export default function StaffPortal() {
  const { staff, loading, error, refresh, signOut } = useStaffAuth();
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [accounts, setAccounts] = useState<StaffAccount[]>([]);
  const [events, setEvents] = useState<StaffEvent[]>([]);
  const [staffPage, setStaffPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const [staffHasMore, setStaffHasMore] = useState(false);
  const [auditHasMore, setAuditHasMore] = useState(false);
  const loadAdminData = useCallback(async () => {
    const [staffResult, auditResult] = await Promise.all([
      staffRequest<StaffPage<StaffAccount>>(`/api/staff?limit=50&page=${staffPage}`),
      staffRequest<StaffPage<StaffEvent>>(`/api/staff/audit?limit=50&page=${auditPage}`),
    ]);
    setAccounts(staffResult.data);
    setStaffHasMore(staffResult.pagination.hasMore);
    setEvents(auditResult.data);
    setAuditHasMore(auditResult.pagination.hasMore);
  }, [staffPage, auditPage]);
  useEffect(() => {
    if (staff?.role === 'admin') void loadAdminData().catch(() => setMessage('Could not load staff access records.'));
  }, [loadAdminData, staff]);
  if (loading) return <p role="status">Checking staff access…</p>;
  if (error) return <main className="mx-auto max-w-3xl space-y-4 p-8">
    <p role="alert">{error}</p><Button onClick={()=>void refresh()}>Retry</Button>
  </main>;
  if (!staff) return <Navigate to="/staff/login" replace />;
  async function act(account: StaffAccount, action: 'activate' | 'deactivate' | 'revoke' | 'role') {
    const authenticatorCode=code.trim();
    setCode('');
    if (!/^\d{6}$/.test(authenticatorCode)) { setMessage('Enter a current authenticator code to confirm this action.'); return; }
    try {
      await staffRequest('/api/staff-auth/two-factor/verify-totp', { code: authenticatorCode });
      const body = action === 'role'
        ? { version: account.version, role: account.role === 'admin' ? 'editor' : 'admin' }
        : action === 'revoke' ? {} : { version: account.version };
      await staffRequest(`/api/staff/${encodeURIComponent(account.id)}/${action}`, body);
      if (account.id === staff.id) await refresh();
      else await loadAdminData();
      setMessage('Staff access action completed.');
    }
    catch (error) { setMessage((error as Error).message); }
  }
  return <main className="mx-auto max-w-3xl space-y-5 p-8">
    <h1 className="text-3xl font-bold">Staff workspace</h1><p>Signed in as {staff.role}.</p>
    <AdminMedia role={staff.role} />
    {staff.role === 'admin' && <section className="space-y-4"><h2 className="text-xl font-bold">Staff access</h2>
      <Input label="Current authenticator code" autoComplete="one-time-code" inputMode="numeric" maxLength={6} value={code} onChange={e=>setCode(e.target.value)} />
      <ul className="space-y-3">
        {accounts.map(account => <li key={account.id} className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-control p-4">
          <div><p className="font-semibold">{account.email}</p><p>{account.role} · {account.active ? 'Active' : 'Inactive'}</p></div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={()=>void act(account, 'role')}>Make {account.role === 'admin' ? 'editor' : 'admin'}</Button>
            <Button variant="secondary" onClick={()=>void act(account, account.active ? 'deactivate' : 'activate')}>
              {account.active ? 'Deactivate' : 'Activate'}
            </Button>
            <Button variant="danger" onClick={()=>void act(account, 'revoke')}>Revoke sessions</Button>
          </div>
        </li>)}
      </ul>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={staffPage === 1} onClick={()=>setStaffPage(page=>page - 1)}>Previous staff page</Button>
        <Button variant="secondary" disabled={!staffHasMore} onClick={()=>setStaffPage(page=>page + 1)}>Next staff page</Button>
      </div>
      <h2 className="pt-4 text-xl font-bold">Staff audit</h2>
      <ul className="space-y-2">
        {events.map(event => <li key={`${event.source}-${event.id}`} className="rounded-control border border-control p-3">
          <p className="font-semibold">{event.action} · {event.source}</p>
          <p className="break-all text-sm">Actor: {event.actorId || 'System'} · Subject: {event.subjectId || 'Not recorded'}</p>
          <time className="text-sm" dateTime={event.occurredAt}>{new Date(event.occurredAt).toLocaleString()}</time>
        </li>)}
      </ul>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={auditPage === 1} onClick={()=>setAuditPage(page=>page - 1)}>Previous audit page</Button>
        <Button variant="secondary" disabled={!auditHasMore} onClick={()=>setAuditPage(page=>page + 1)}>Next audit page</Button>
      </div>
    </section>}
    {message && <p role="status">{message}</p>}
    <Button onClick={()=>void signOut().catch(()=>setMessage('Could not confirm sign out. Please retry.'))}>Sign out</Button>
  </main>;
}
