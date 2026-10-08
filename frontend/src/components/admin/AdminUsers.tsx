import { useState } from 'react';
import { adminService, roles, AdminApiError, type AdminIdentity, type AdminUser } from '../../services/adminService';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { control, Field, Failure, Pagination, errorMessage, useAdminLoad } from './shared';

export function AdminUsers({ identity }: { identity: AdminIdentity }) {
  const [filters, setFilters] = useState({ q: '', role: '', status: 'active' });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const list = useAdminLoad(signal => adminService.users(new URLSearchParams({ page: String(page), limit: '20', status: filters.status,
    ...(filters.q ? { q: filters.q } : {}), ...(filters.role ? { role: filters.role } : {}) }), signal), [page, filters]);
  const [pending, setPending] = useState<{ user: AdminUser; action: 'role' | 'deactivate' } | null>(null);
  const [role, setRole] = useState('citizen');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [stale, setStale] = useState(false);
  const canManage = (user: AdminUser) => user.id !== identity.user.id && !user.deleted_at &&
    (identity.profile.role === 'super_admin' || !['admin', 'municipal_admin', 'super_admin'].includes(user.role));
  async function confirm() {
    if (!pending || busy || stale) return;
    setBusy(true); setError('');
    try {
      if (pending.action === 'role') await adminService.assignRole(pending.user, role);
      else await adminService.deactivate(pending.user);
      setNotice(pending.action === 'role' ? 'Role updated. Verification remains unchanged.' : 'Account deactivated.');
      setPending(null); list.reload();
    } catch (cause) { setError(errorMessage(cause)); if (cause instanceof AdminApiError && cause.status === 409) setStale(true); }
    finally { setBusy(false); }
  }
  async function reloadTarget() {
    if (!pending) return;
    setBusy(true);
    try {
      const user = await adminService.user(pending.user.id);
      list.reload();
      if (!canManage(user)) { setPending(null); setNotice('The account can no longer be changed.'); return; }
      setPending({ ...pending, user }); setRole(user.role); setStale(false); setError('');
    } catch (cause) { setError(errorMessage(cause)); } finally { setBusy(false); }
  }
  return <section aria-labelledby="users-heading"><h2 id="users-heading" className="text-2xl font-bold">User management</h2>
    <form className="my-5 grid gap-3 sm:grid-cols-4" onSubmit={event => { event.preventDefault(); setFilters({ ...filters, q: search.trim() }); setPage(1); }}>
      <Field label="Search name or email"><input className={control} value={search} maxLength={100} onChange={e => setSearch(e.target.value)} /></Field>
      <Field label="Role filter"><select className={control} value={filters.role} onChange={e => { setFilters({ ...filters, role: e.target.value }); setPage(1); }}><option value="">All roles</option>{roles.map(role => <option key={role}>{role}</option>)}</select></Field>
      <Field label="Account status"><select className={control} value={filters.status} onChange={e => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}>{['active', 'inactive', 'all'].map(status => <option key={status}>{status}</option>)}</select></Field>
      <Button type="submit" className="self-end">Search users</Button>
    </form>
    <Failure message={list.error} />{list.error && <Button onClick={list.reload}>Retry user list</Button>}
    {notice && <p role="status" className="my-3 text-emerald-800">{notice}</p>}
    {list.loading && <p role="status">Loading users…</p>}
    {list.data && <><p className="mb-3">{list.data.pagination.total} matching accounts</p>
      <div className="overflow-x-auto"><table className="w-full text-left"><caption className="sr-only">User accounts and permitted actions</caption><thead><tr>{['Name / email', 'Role', 'Status', 'Actions'].map(label => <th className="p-3" key={label} scope="col">{label}</th>)}</tr></thead>
        <tbody>{list.data.data.map(user => <tr className="border-t border-slate-200" key={user.id}><td className="p-3">{user.full_name || 'Unnamed account'}<div className="text-sm text-slate-600">{user.email}</div></td><td className="p-3">{user.role}</td><td className="p-3">{user.deleted_at ? 'Inactive' : 'Active'}{!user.is_verified && ' · Unverified'}</td><td className="p-3"><div className="flex flex-wrap gap-2">
          {identity.permissions.includes('users:roles') && <Button variant="secondary" disabled={!canManage(user)} onClick={() => { setPending({ user, action: 'role' }); setRole(user.role); setError(''); setStale(false); }}>Assign role</Button>}
          {identity.permissions.includes('users:deactivate') && <Button variant="danger" disabled={!canManage(user)} onClick={() => { setPending({ user, action: 'deactivate' }); setError(''); setStale(false); }}>Deactivate</Button>}
        </div></td></tr>)}</tbody></table></div>
      {!list.data.data.length && <p className="p-4">No users match these filters.</p>}
      <Pagination page={page} pages={list.data.pagination.totalPages} onChange={setPage} /></>}
    <Modal open={!!pending} title={pending?.action === 'role' ? 'Confirm role assignment' : 'Confirm deactivation'} onClose={() => { if (!busy) setPending(null); }}>
      {pending && <><p className="mb-4">{pending.user.full_name || pending.user.email} ({pending.user.email}) — current role: {pending.user.role}.</p>
        {pending.action === 'role' ? <><Field label="New role"><select className={control} disabled={busy || stale} value={role} onChange={e => setRole(e.target.value)}>{roles.map(role => <option key={role}>{role}</option>)}</select></Field><p className="my-3">This changes access permissions but does not verify the account.</p></> : <p>This blocks future authenticated access and preserves account history. Reactivation is not available here.</p>}
        <Failure message={error} />
        <div className="mt-5 flex flex-wrap gap-3"><Button variant="secondary" disabled={busy} onClick={() => setPending(null)}>Cancel</Button>
          {stale ? <Button busy={busy} onClick={() => void reloadTarget()}>Reload latest account</Button> : <Button variant="danger" busy={busy} disabled={pending.action === 'role' && role === pending.user.role} onClick={() => void confirm()}>Confirm {pending.action === 'role' ? 'role change' : 'deactivation'}</Button>}</div>
      </>}
    </Modal>
  </section>;
}
