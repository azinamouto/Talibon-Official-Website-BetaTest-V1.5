import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Newspaper, Briefcase, BarChart3, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { adminService, type AdminIdentity } from '../services/adminService';
import { AdminUsers } from '../components/admin/AdminUsers';
import { AdminReports } from '../components/admin/AdminReports';
import { Button } from '../components/ui/Button';
import { Failure, errorMessage, useAdminLoad } from '../components/admin/shared';

const navigation = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, permission: '' },
  { id: 'users', label: 'Users', icon: Users, permission: 'users:read' },
  { id: 'reports', label: 'Reports', icon: BarChart3, permission: 'reports:read' },
];
function Overview({ preview, identity }: { preview: boolean; identity: AdminIdentity }) {
  // Live widgets use bounded, authorized list counts; mock values never replace failures.
  const counts = useAdminLoad(async signal => {
    if (preview) return [['Users', 128], ['Pages', 12], ['News', 24], ['Services', 8]] as [string, number][];
    return Promise.all([
      ...(identity.permissions.includes('users:read') ? [adminService.users(new URLSearchParams({ limit: '1', status: 'all' }), signal).then(result => ['Users', result.pagination.total] as [string, number])] : []),

    ]);
  }, [preview, identity]);
  return <section><h2 className="text-2xl font-bold">Municipal overview</h2><p className="mt-2 text-slate-600">Manage public information and municipal accounts from one workspace.</p>
    <Failure message={counts.error} />{counts.error && <Button onClick={counts.reload}>Retry overview</Button>}{counts.loading && <p role="status" className="py-6">Loading overview…</p>}
    <div className="my-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{counts.data?.map(([label, value]) => <article key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-5"><h3 className="capitalize text-slate-600">{label}</h3><p className="mt-3 text-3xl font-bold text-emerald-900">{value}</p><p className="mt-1 text-xs text-slate-500">{preview ? 'Sample count' : 'Total records'}</p></article>)}</div>
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5"><h3 className="flex items-center gap-2 font-bold"><ShieldCheck size={20} /> Access follows your role</h3><p className="mt-2">Only permitted sections are available. Changes are checked by the server on every request.</p></div>
  </section>;
}
function DashboardShell({ identity, preview = false }: { identity: AdminIdentity; preview?: boolean }) {
  const [params] = useSearchParams();
  const tab = params.get('tab') ?? 'overview';
  const allowed = navigation.filter(item => !item.permission || identity.permissions.includes(item.permission));
  const selected = allowed.find(item => item.id === tab);
  return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6"><header className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Talibon · Administration</p><h1 className="mt-1 text-3xl font-bold">Admin dashboard</h1></div><span className="rounded-full bg-emerald-100 px-4 py-2 text-sm text-emerald-900">{preview ? 'Layout preview' : identity.profile.role.replaceAll('_', ' ')}</span></header>
    {preview && <p role="status" className="mb-5 rounded-lg bg-amber-50 p-4 text-amber-900">Mock data — Week 7 layout preview. No real records are read or changed.</p>}
    <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]"><nav aria-label="Admin sections" className="flex flex-wrap gap-2 self-start rounded-xl border border-slate-200 bg-white p-3 lg:flex-col">{allowed.map(({ id, label, icon: Icon }) => <Link key={id} to={`?tab=${id}`} aria-current={tab === id ? 'page' : undefined} className={`ui-focus flex min-h-11 items-center gap-3 rounded-lg px-4 py-3 font-medium ${tab === id ? 'bg-emerald-800 text-white' : 'text-slate-700 hover:bg-slate-100'}`}><Icon size={19} />{label}</Link>)}</nav>
      <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 sm:p-7">
        {!selected ? <Failure message="You do not have access to this section." /> : preview && tab !== 'overview' ? <section><h2 className="text-2xl font-bold">{selected.label}</h2><p className="mt-4">Layout preview only. Sign in to use this section with authorized data.</p></section>
          : tab === 'overview' ? <Overview preview={preview} identity={identity} />
          : tab === 'users' ? <AdminUsers identity={identity} />
          : tab === 'reports' ? <AdminReports />
          : null}
      </div>
    </div>
  </main>;
}
const previewIdentity: AdminIdentity = { user: { id: 'preview' }, profile: { role: 'super_admin' }, permissions: ['users:read', 'content:manage', 'reports:read'] };
export function AdminPreview() { return <DashboardShell identity={previewIdentity} preview />; }
export default function SprintAdminDashboard() {
  const { user } = useAuth();
  const [identity, setIdentity] = useState<AdminIdentity | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setIdentity(null); setError('');
    adminService.identity(controller.signal).then(value => {
      if (controller.signal.aborted) return;
      if (!Array.isArray(value.permissions) || !value.permissions.length) setError('Your account has no dashboard permissions.');
      else setIdentity(value);
    }).catch(cause => { if (!controller.signal.aborted) setError(errorMessage(cause)); });
    const invalidate = () => { controller.abort(); setIdentity(null); setError('Access changed or your session expired. Reload permissions to continue.'); };
    window.addEventListener('admin-access-invalidated', invalidate);
    return () => { controller.abort(); window.removeEventListener('admin-access-invalidated', invalidate); };
  }, [user?.id, revision]);
  if (error) return <main className="mx-auto max-w-xl p-6"><Failure message={error} /><Button onClick={() => setRevision(value => value + 1)}>Reload permissions</Button><Link className="ml-4 underline" to="/login">Sign in</Link></main>;
  if (!identity) return <p role="status" className="p-12 text-center">Checking dashboard permissions…</p>;
  return <DashboardShell identity={identity} />;
}
