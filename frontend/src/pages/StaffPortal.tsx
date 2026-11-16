import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { Activity, ArrowRight, CheckCircle2, ExternalLink, FileText, Image, LayoutDashboard, ListCollapse, LogOut, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { staffRequest, useStaffAuth } from '../contexts/StaffAuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import AdminMedia, { type Asset } from '../components/admin/AdminMedia';
import styles from './StaffPortal.module.css';

type StaffAccount = { id: string; email: string; role: 'admin' | 'editor'; active: boolean; version: number };
type StaffEvent = { id: string; source: string; action: string; actorId: string | null; subjectId: string | null; occurredAt: string };
type StaffPage<T> = { data: T[]; pagination: { page: number; limit: number; hasMore: boolean } };
type Module = 'overview' | 'photos' | 'documents' | 'staff' | 'audit';
const contentModules = [
  { id: 'overview', label: 'Dashboard overview', icon: LayoutDashboard },
  { id: 'photos', label: 'Photos', icon: Image },
  { id: 'documents', label: 'Documents', icon: FileText },
] as const;
const administrationModules = [
  { id: 'staff', label: 'Staff management', icon: Users },
  { id: 'audit', label: 'Audit logs', icon: Activity },
] as const;

function DashboardOverview({ openModule }: { openModule(module: Module): void }) {
  const [snapshot, setSnapshot] = useState<{ data: Asset[]; hasMore: boolean } | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let current = true;
    setSnapshot(null); setError('');
    void staffRequest<{ data: Asset[]; hasMore: boolean }>('/api/admin/media?page=1')
      .then(result => { if (current) setSnapshot(result); })
      .catch(() => { if (current) setError('The media overview could not be loaded. Please retry.'); });
    return () => { current = false; };
  }, [reload]);
  const counts = [
    { label: 'Photos on this page', icon: Image, value: snapshot?.data.filter(asset => asset.kind === 'photo').length },
    { label: 'Documents on this page', icon: FileText, value: snapshot?.data.filter(asset => asset.kind === 'document').length },
    { label: 'Published on this page', icon: CheckCircle2, value: snapshot?.data.filter(asset => asset.processing === 'ready' && asset.publication === 'published').length },
  ];
  return <section aria-labelledby="overview-title">
    <div className={styles.panelHeading}>
      <div><p className={styles.eyebrow}>Content management</p><h2 id="overview-title">Dashboard overview</h2><p>Manage the photos and documents shared through the TalGov website.</p></div>
      <Button variant="secondary" onClick={() => setReload(value => value + 1)}><RefreshCw size={16} aria-hidden="true" />Refresh overview</Button>
    </div>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {!snapshot && !error && <p role="status" className={styles.loading}>Loading the media overview…</p>}
    <dl className={styles.stats}>{counts.map(({ label, icon: Icon, value }) => <div key={label} className={styles.stat}>
      <span className={styles.statIcon}><Icon size={20} aria-hidden="true" /></span>
      <dt>{label}</dt><dd>{value ?? '—'}</dd>
    </div>)}</dl>
    <p className={styles.scope}>Library page 1 · Up to 50 recent files. {snapshot?.hasMore ? 'More files are available on the next library pages.' : 'Counts reflect this page, not website-wide totals.'}</p>
    <div className={styles.quickActions}>
      <button className={styles.quickAction} onClick={() => openModule('photos')}><span className={styles.actionIcon}><Image size={24} aria-hidden="true" /></span><span><strong>Manage photos</strong><span>Upload images, add alternative text and review publication.</span></span><ArrowRight size={20} aria-hidden="true" /></button>
      <button className={styles.quickAction} onClick={() => openModule('documents')}><span className={styles.actionIcon}><FileText size={24} aria-hidden="true" /></span><span><strong>Manage documents</strong><span>Organize PDF files and provide authorized downloads.</span></span><ArrowRight size={20} aria-hidden="true" /></button>
    </div>
    <section className={styles.recent} aria-labelledby="recent-title">
      <div className={styles.sectionHeading}><h3 id="recent-title">Recent media</h3><span>From library page 1</span></div>
      {snapshot && (snapshot.data.length ? <ul className={styles.recentList}>{snapshot.data.slice(0, 5).map(asset => <li key={asset.id}>
        <span className={styles.fileIcon}>{asset.kind === 'photo' ? <Image size={20} aria-hidden="true" /> : <FileText size={20} aria-hidden="true" />}</span>
        <div><strong>{asset.title}</strong><p>{asset.kind === 'photo' ? 'Photo' : 'Document'} · {Math.ceil(Number(asset.bytes) / 1024)} KiB</p></div>
        <span className={styles.badge}>{asset.processing === 'ready' ? asset.publication : 'Upload pending'}</span>
      </li>)}</ul> : <div className={styles.empty}><FileText size={32} aria-hidden="true" /><h3>No media on this page</h3><p>Uploaded photos and documents will appear here. New uploads begin as private drafts.</p></div>)}
    </section>
  </section>;
}

export default function StaffPortal() {
  const { staff, loading, error, refresh, signOut } = useStaffAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [accounts, setAccounts] = useState<StaffAccount[]>([]);
  const [events, setEvents] = useState<StaffEvent[]>([]);
  const [staffPage, setStaffPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const [staffHasMore, setStaffHasMore] = useState(false);
  const [auditHasMore, setAuditHasMore] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [adminBusy, setAdminBusy] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [reload, setReload] = useState(0);
  const modules = staff?.role === 'admin' ? [...contentModules, ...administrationModules] : [...contentModules];
  const requestedTab = searchParams.get('tab') || 'overview';
  const activeTab: Module = modules.find(module => module.id === requestedTab)?.id || 'overview';
  useEffect(() => {
    if (!loading && staff && requestedTab !== activeTab) setSearchParams({ tab: activeTab }, { replace: true });
  }, [loading, staff, requestedTab, activeTab, setSearchParams]);
  const loadAdminData = useCallback(async (isCurrent: () => boolean = () => true) => {
    if (activeTab === 'staff') {
      const result = await staffRequest<StaffPage<StaffAccount>>('/api/staff?limit=50&page=' + staffPage);
      if (isCurrent()) { setAccounts(result.data); setStaffHasMore(result.pagination.hasMore); }
    } else if (activeTab === 'audit') {
      const result = await staffRequest<StaffPage<StaffEvent>>('/api/staff/audit?limit=50&page=' + auditPage);
      if (isCurrent()) { setEvents(result.data); setAuditHasMore(result.pagination.hasMore); }
    }
  }, [activeTab, staffPage, auditPage]);
  useEffect(() => {
    if (staff?.role !== 'admin' || (activeTab !== 'staff' && activeTab !== 'audit')) return;
    let current = true;
    setAdminLoading(true); setAdminError('');
    void loadAdminData(() => current)
      .catch(() => { if (current) setAdminError('Could not load staff access records. Please retry.'); })
      .finally(() => { if (current) setAdminLoading(false); });
    return () => { current = false; };
  }, [loadAdminData, staff?.role, staff?.id, activeTab, reload]);
  function openModule(module: Module) { setCode(''); setMessage(''); setSearchParams({ tab: module }); }
  if (loading) return <main className={styles.shell}><p role="status" className={styles.loading}>Checking staff access…</p></main>;
  if (error) return <main className={styles.shell}><div className={styles.panel}><p role="alert" className={styles.error}>{error}</p><Button onClick={() => void refresh()}>Retry</Button></div></main>;
  if (!staff) return <Navigate to="/staff/login" replace />;
  async function act(account: StaffAccount, action: 'activate' | 'deactivate' | 'revoke' | 'role') {
    const authenticatorCode = code.trim(); setCode('');
    if (!/^\d{6}$/.test(authenticatorCode)) { setMessage('Enter a current authenticator code to confirm this action.'); return; }
    setAdminBusy(true); setMessage('');
    try {
      await staffRequest('/api/staff-auth/two-factor/verify-totp', { code: authenticatorCode });
      const body = action === 'role' ? { version: account.version, role: account.role === 'admin' ? 'editor' : 'admin' }
        : action === 'revoke' ? {} : { version: account.version };
      await staffRequest('/api/staff/' + encodeURIComponent(account.id) + '/' + action, body);
      if (account.id === staff!.id) await refresh(); else await loadAdminData();
      setMessage('Staff access action completed.');
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Staff access action could not be completed.'); }
    finally { setAdminBusy(false); }
  }
  async function exit() {
    setSigningOut(true);
    try { await signOut(); } catch { setMessage('Could not confirm sign out. Please retry.'); }
    finally { setSigningOut(false); }
  }
  const navigation = (items: typeof contentModules | typeof administrationModules) => items.map(({ id, label, icon: Icon }) => <button
    key={id} className={styles.navItem + (activeTab === id ? ' ' + styles.navActive : '')}
    aria-label={label} aria-current={activeTab === id ? 'page' : undefined}
    disabled={adminBusy || signingOut} onClick={() => openModule(id)} title={collapsed ? label : undefined}>
    <Icon size={20} aria-hidden="true" /><span className={styles.navLabel}>{label}</span>
  </button>);
  return <main className={styles.shell + (collapsed ? ' ' + styles.collapsed : '')}>
    <header className={styles.header}>
      <div className={styles.brand}><img src="/images/talibon-official-seal.png" alt="Municipality of Talibon official seal" width="56" height="56" />
        <div><p className={styles.eyebrow}>TalGov · Local Government of Talibon, Bohol</p><h1>CMS Administration</h1>
          <div className={styles.identity}><span><ShieldCheck size={15} aria-hidden="true" />Staff session verified</span><span className={styles.role}>{staff.role === 'admin' ? 'Administrator' : 'Editor'}</span></div>
        </div>
      </div>
      <div className={styles.headerActions}><Link to="/" className={styles.websiteLink}><ExternalLink size={16} aria-hidden="true" />View website</Link>
        <Button variant="secondary" busy={signingOut} disabled={adminBusy} onClick={() => void exit()}><LogOut size={16} aria-hidden="true" />{signingOut ? 'Signing out…' : 'Sign out'}</Button>
      </div>
    </header>
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.navHeading}><span className={styles.navLabel}>CMS navigation</span><button className={styles.collapseButton} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed} aria-controls="cms-navigation" onClick={() => setCollapsed(value => !value)}><ListCollapse size={20} aria-hidden="true" /></button></div>
        <nav id="cms-navigation" aria-label="CMS navigation"><p className={styles.navGroup + ' ' + styles.navLabel}>Content library</p><div className={styles.navItems}>{navigation(contentModules)}</div>
          {staff.role === 'admin' && <div className={styles.adminNavigation}><p className={styles.navGroup + ' ' + styles.navLabel}>Administration</p><div className={styles.navItems}>{navigation(administrationModules)}</div></div>}
        </nav>
        <div className={styles.sidebarNote}><ShieldCheck size={18} aria-hidden="true" /><p className={styles.navLabel}>Photos and documents.<br />Reviewed before publication.</p></div>
      </aside>
      <div className={styles.panel}>
        {message && <p role="status" className={styles.notice}>{message}</p>}
        {activeTab === 'overview' && <DashboardOverview openModule={openModule} />}
        {(activeTab === 'photos' || activeTab === 'documents') && <AdminMedia key={activeTab} role={staff.role} kind={activeTab === 'photos' ? 'photo' : 'document'} />}
        {staff.role === 'admin' && (activeTab === 'staff' || activeTab === 'audit') && <>
          <div className={styles.panelHeading}><div><p className={styles.eyebrow}>Administration · Admin only</p><h2>{activeTab === 'staff' ? 'Staff management' : 'Audit logs'}</h2><p>{activeTab === 'staff' ? 'Review staff roles, active access and sessions.' : 'Review recorded authentication and administrative activity.'}</p></div>
            <Button variant="secondary" disabled={adminLoading || adminBusy} onClick={() => setReload(value => value + 1)}><RefreshCw size={16} aria-hidden="true" />Refresh records</Button>
          </div>
          {adminError && <p role="alert" className={styles.error}>{adminError}</p>}
          {adminLoading && <p role="status" className={styles.loading}>Loading access records…</p>}
          {activeTab === 'staff' && <>
            <div className={styles.mfaPanel}><ShieldCheck size={22} aria-hidden="true" /><div><h3>Confirm access changes</h3><p>A current authenticator code is required before changing a role, activating access or revoking sessions.</p><Input label="Current authenticator code" autoComplete="one-time-code" inputMode="numeric" maxLength={6} disabled={adminBusy} value={code} onChange={event => setCode(event.target.value)} /></div></div>
            {!adminLoading && !adminError && (accounts.length ? <ul className={styles.accountList}>{accounts.map(account => <li key={account.id}>
              <div><strong>{account.email}</strong><p>{account.role} · {account.active ? 'Active' : 'Inactive'}</p></div>
              <div className={styles.accountActions}><Button variant="secondary" disabled={adminBusy} onClick={() => void act(account, 'role')}>Make {account.role === 'admin' ? 'editor' : 'admin'}</Button>
                <Button variant="secondary" disabled={adminBusy} onClick={() => void act(account, account.active ? 'deactivate' : 'activate')}>{account.active ? 'Deactivate' : 'Activate'}</Button>
                <Button variant="danger" disabled={adminBusy} onClick={() => void act(account, 'revoke')}>Revoke sessions</Button>
              </div>
            </li>)}</ul> : <div className={styles.empty}><Users size={30} aria-hidden="true" /><h3>No staff records on this page</h3><p>Only existing authorized website staff accounts are listed here.</p></div>)}
            <div className={styles.pagination}><span>Staff page {staffPage}</span><div><Button variant="secondary" disabled={adminLoading || adminBusy || staffPage === 1} onClick={() => setStaffPage(page => page - 1)}>Previous staff page</Button><Button variant="secondary" disabled={adminLoading || adminBusy || !staffHasMore} onClick={() => setStaffPage(page => page + 1)}>Next staff page</Button></div></div>
          </>}
          {activeTab === 'audit' && <>
            {!adminLoading && !adminError && (events.length ? <ul className={styles.auditList}>{events.map(event => <li key={event.source + '-' + event.id}>
              <div><strong>{event.action}</strong><p>{event.source}</p></div>
              <div><span>Actor</span><p>{event.actorId || 'System'}</p></div><div><span>Subject</span><p>{event.subjectId || 'Not recorded'}</p></div>
              <time dateTime={event.occurredAt}>{new Date(event.occurredAt).toLocaleString()}</time>
            </li>)}</ul> : <div className={styles.empty}><Activity size={30} aria-hidden="true" /><h3>No audit records on this page</h3><p>Recorded activity will appear here as staff use the CMS.</p></div>)}
            <div className={styles.pagination}><span>Audit page {auditPage}</span><div><Button variant="secondary" disabled={adminLoading || auditPage === 1} onClick={() => setAuditPage(page => page - 1)}>Previous audit page</Button><Button variant="secondary" disabled={adminLoading || !auditHasMore} onClick={() => setAuditPage(page => page + 1)}>Next audit page</Button></div></div>
          </>}
        </>}
      </div>
    </div>
  </main>;
}
