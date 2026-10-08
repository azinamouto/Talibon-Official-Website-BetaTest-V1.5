import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import FormWizard from '../components/eservices/FormWizard';
import { formSchemas, type FormType } from '../components/eservices/formSchema';
import { submissionService, type Submission, type SubmissionList } from '../services/submissionService';
import SubmissionPaymentStep from '../components/eservices/SubmissionPaymentStep';

export type { CertificateRequest, TimelineEvent } from '../services/certificateService';
const formTypes = Object.keys(formSchemas) as FormType[];
function resolveType(value: string | null): FormType | undefined {
  const normalized = value?.toLowerCase().replace(/[_-]/g, ' ');
  return formTypes.find(type => type.toLowerCase() === normalized || (type === 'Certificate of Indigency' && normalized === 'indigency'));
}
function MySubmissions({ ticket }: { ticket: string | null }) {
  const [list, setList] = useState<SubmissionList | null>(null);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [search, setSearch] = useState(ticket ?? '');
  const [, setParams] = useSearchParams();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { setSearch(ticket ?? ''); }, [ticket]);
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true); setError(''); setSelected(null); setList(null);
    const load = async () => {
      try {
        if (ticket) {
          const result = await submissionService.get(ticket, controller.signal);
          if (!controller.signal.aborted) setSelected(result);
        } else {
          const result = await submissionService.list(page, controller.signal);
          if (!controller.signal.aborted) setList(result);
        }
      } catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Unable to load your submissions.'); }
      finally { if (!controller.signal.aborted) setBusy(false); }
    };
    void load();
    return () => controller.abort();
  }, [ticket, page, refresh]);
  useEffect(() => { if (selected) heading.current?.focus(); }, [selected]);
  return <section className="space-y-6" aria-label="My submissions">
    <h2 className="text-2xl font-bold">My submissions</h2>
    <form className="flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); if (search.trim()) setParams({ track: search.trim() }); }}>
      <div className="min-w-0 flex-1"><Input label="Ticket ID" value={search} maxLength={100} onChange={event => setSearch(event.target.value)} required /></div>
      <Button type="submit" disabled={busy || !search.trim()}>Track submission</Button>
    </form>
    <div className="flex flex-wrap gap-3"><Button variant="secondary" disabled={busy} onClick={() => setRefresh(value => value + 1)}>Refresh status</Button>{ticket && <Link to="/e-services?view=submissions" className="ui-focus self-center underline">All my submissions</Link>}</div>
    {busy && <p role="status">Loading submissions...</p>}
    {error && <p role="alert" className="text-danger">{error}</p>}
    {list && <>
      {list.data.length === 0 ? <p>No applications on this page.</p> : <ul className="space-y-3">{list.data.map(item => <li key={item.id} className="rounded-xl border border-brand-border p-4">
        <Link to={`/e-services?track=${encodeURIComponent(item.ticketId)}`} className="ui-focus block font-bold underline">{item.documentType}<span className="block break-all text-sm font-normal">{item.ticketId}</span></Link>
        <p>Status: {item.status}</p><p className="text-sm text-slate-600">Submitted: {new Date(item.submittedAt).toLocaleString()}</p>
      </li>)}</ul>}
      <nav aria-label="Submission pages" className="flex flex-wrap items-center gap-3"><Button variant="secondary" disabled={page === 1 || busy} onClick={() => setPage(value => value - 1)}>Previous page</Button><span>Page {page}</span><Button variant="secondary" disabled={page * list.pagination.limit >= list.pagination.total || busy} onClick={() => setPage(value => value + 1)}>Next page</Button></nav>
    </>}
    {selected && <article className="space-y-5">
      <h3 ref={heading} tabIndex={-1} className="text-xl font-bold">{selected.documentType} status</h3>
      <p className="break-all">Ticket: {selected.ticketId}</p><p role="status" className="font-bold">Current status: {selected.status}</p>
      <h4 className="font-semibold">Status history</h4>
      {selected.history?.length ? <ol className="space-y-3 border-l-2 border-brand-border pl-4">{selected.history.map(event => <li key={event.id}><p className="font-semibold">{event.status}</p><time dateTime={event.createdAt} className="text-sm text-slate-600">{new Date(event.createdAt).toLocaleString()}</time>{event.remarks && <p className="whitespace-pre-wrap break-words">{event.remarks}</p>}</li>)}</ol> : <p>No status updates yet.</p>}
      <SubmissionPaymentStep key={selected.id} submissionId={selected.id} />
    </article>}
  </section>;
}
export default function EServicesPage() {
  const [params] = useSearchParams();
  const { user, state, isPasswordRecovery } = useAuth();
  const location = useLocation();
  const type = resolveType(params.get('type') ?? params.get('service'));
  const ticket = params.get('track');
  const tracking = params.get('view') === 'submissions' || ticket !== null;
  return <main className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6">
    <header className="space-y-3"><p className="text-sm font-semibold uppercase tracking-wider text-slate-600">Municipality of Talibon</p><h1 className="text-3xl font-bold sm:text-4xl">E-Services & Forms</h1><p>Apply for municipal services and follow your application’s progress.</p><nav aria-label="E-service navigation" className="flex flex-wrap gap-5"><Link className="ui-focus underline font-semibold" to="/e-services">Available services</Link><Link className="ui-focus underline font-semibold" to="/e-services?view=submissions">My submissions</Link><Link className="ui-focus underline" to="/downloads">Downloadable forms</Link></nav></header>
    {type ? <div className="rounded-2xl border border-brand-border bg-white p-5 sm:p-8"><FormWizard key={type + (user?.id ?? 'guest')} documentType={type} /></div> : tracking ? <div className="rounded-2xl border border-brand-border bg-white p-5 sm:p-8">
      {state === 'INITIALIZING' ? <p role="status">Loading your session...</p> : !user || isPasswordRecovery ? <><h2 className="text-xl font-bold">Sign in to view your submissions</h2><Link to="/login" state={{ from: location.pathname + location.search }} className="ui-focus mt-4 inline-block underline">Sign in</Link></> : <MySubmissions key={user.id} ticket={ticket} />}
    </div> : <section aria-label="Available services" className="space-y-6">
      {(params.has('type') || params.has('service')) && <p role="status">This service is not available for online applications. Select a service below or contact the municipal office.</p>}
      <div className="grid gap-4 sm:grid-cols-2">{formTypes.map(type => <Link key={type} to={`/e-services?type=${encodeURIComponent(type)}`} className="ui-focus rounded-2xl border border-brand-border bg-white p-6 hover:border-action"><h2 className="text-xl font-bold">{type}</h2><p className="mt-2 text-slate-600">Complete your application, review your details, and track its status.</p><span className="mt-4 inline-block font-semibold underline">Start application</span></Link>)}</div>
      <p className="rounded-xl border border-brand-border p-5 text-slate-600">Cedula applications use a separate tax and payment service. Please contact the Municipal Treasurer’s Office for assistance while online processing is being prepared.</p>
    </section>}
  </main>;
}
