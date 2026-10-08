import { useEffect, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { adminService, type ContentKind, type ContentRecord } from '../../services/adminService';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { control, Field, Failure, Pagination, errorMessage, useAdminLoad } from './shared';

function ContentEditor({ kind, record, onClose, onSaved }: { kind: ContentKind; record: Partial<ContentRecord>; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ title: record.title ?? record.name ?? '', slug: record.slug ?? '', content: record.content ?? record.description ?? '', summary: record.summary ?? '', category: record.category ?? 'ARTICLE', office_responsible: record.office_responsible ?? '' });
  const [initial] = useState(JSON.stringify(form));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dirty = JSON.stringify(form) !== initial;
  const blocker = useBlocker(dirty || busy);
  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (!busy && window.confirm('Discard unsaved changes and leave this page?')) blocker.proceed();
      else blocker.reset();
    }
  }, [blocker, busy]);
  useEffect(() => {
    if (!dirty && !busy) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, busy]);
  const close = () => { if (!busy && (!dirty || window.confirm('Discard unsaved changes?'))) onClose(); };
  async function save(publish: boolean) {
    if (busy) return;
    if (!form.title.trim() || !form.content.trim() || (kind === 'news' && !form.summary.trim()) || (kind === 'services' && !form.office_responsible.trim())) { setError('Complete all required fields with non-blank text.'); return; }
    setBusy(true); setError('');
    const status = publish ? (kind === 'services' ? 'available' : 'published') : record.status ?? (kind === 'services' ? 'coming-soon' : 'draft');
    const body = kind === 'services'
      ? { name: form.title.trim(), slug: form.slug, description: form.content, office_responsible: form.office_responsible.trim(), status }
      : { title: form.title.trim(), slug: form.slug, content: form.content, status, ...(kind === 'news' ? { summary: form.summary.trim(), category: form.category } : {}) };
    try { await adminService.saveContent(kind, record.id, body); onSaved(); }
    catch (cause) { setError(errorMessage(cause)); } finally { setBusy(false); }
  }
  const input = (key: keyof typeof form, maxLength: number, multiline = false) => {
    const props = { className: control, value: form[key], required: true, maxLength, disabled: busy, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: e.target.value }) };
    return multiline ? <textarea {...props} rows={6} /> : <input {...props} pattern={key === 'slug' ? '[a-z0-9]+(-[a-z0-9]+)*' : undefined} />;
  };
  return <Modal open title={`${record.id ? 'Edit' : 'Create'} ${kind}`} onClose={close}>
    <form className="grid max-h-[70vh] gap-4 overflow-y-auto p-1" onSubmit={event => { event.preventDefault(); void save((event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'publish'); }}>
      <Failure message={error} />
      <Field label={kind === 'services' ? 'Service name' : 'Title'}>{input('title', 200)}</Field>
      <Field label="Slug">{input('slug', 160)}<span className="font-normal">Lowercase letters, numbers and single hyphens.</span></Field>
      <Field label={kind === 'services' ? 'Description' : 'Content'}>{input('content', 100000, true)}</Field>
      {kind === 'news' && <><Field label="Summary">{input('summary', 2000, true)}</Field><Field label="Category"><select className={control} value={form.category} disabled={busy} onChange={e => setForm({ ...form, category: e.target.value })}>{['ARTICLE', 'UPDATE', 'ANNOUNCEMENT'].map(value => <option key={value}>{value}</option>)}</select></Field></>}
      {kind === 'services' && <Field label="Responsible department ID">{input('office_responsible', 100)}<span className="font-normal">Use an existing municipal department ID.</span></Field>}
      <p className="text-sm">{record.status ? `Current status: ${record.status}. Save keeps this status.` : kind === 'services' ? 'Save creates a coming-soon service. Publish makes it available.' : 'Save creates a draft.'}</p>
      <div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={busy} onClick={close}>Cancel</Button><Button type="submit" value="save" busy={busy}>Save</Button><Button type="submit" value="publish" busy={busy}>Save and publish</Button></div>
    </form>
  </Modal>;
}
export function AdminContent({ kind }: { kind: ContentKind }) {
  const [page, setPage] = useState(1);
  const list = useAdminLoad(signal => adminService.content(kind, page, signal), [kind, page]);
  const [editing, setEditing] = useState<Partial<ContentRecord> | null>(null);
  const [deleting, setDeleting] = useState<ContentRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function remove() {
    if (!deleting || busy) return;
    setBusy(true); setError('');
    try { await adminService.deleteContent(kind, deleting.id); setDeleting(null); setNotice('Content deleted.'); if (list.data?.data.length === 1 && page > 1) setPage(page - 1); else list.reload(); }
    catch (cause) { setError(errorMessage(cause)); } finally { setBusy(false); }
  }
  return <section><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-bold capitalize">{kind}</h2><Button onClick={() => setEditing({})}>Create {kind}</Button></div>
    <Failure message={list.error} />{list.error && <Button onClick={list.reload}>Retry content list</Button>}
    {notice && <p role="status" className="my-4 text-emerald-800">{notice}</p>}
    {list.loading && <p role="status" className="py-6">Loading content…</p>}
    {list.data && <><ul className="my-5 divide-y divide-slate-200">{list.data.data.map(record => <li key={record.id} className="flex flex-wrap items-center justify-between gap-4 py-4"><div className="min-w-0 break-words"><h3 className="font-bold">{record.title ?? record.name}</h3><p className="text-sm text-slate-600">{record.slug} · {record.status}</p></div><div className="flex gap-2"><Button variant="secondary" onClick={() => setEditing(record)}>Edit</Button><Button variant="danger" onClick={() => { setDeleting(record); setError(''); }}>Delete</Button></div></li>)}</ul>
      {!list.data.data.length && <p>No content yet.</p>}<Pagination page={page} pages={list.data.pagination.totalPages} onChange={setPage} /></>}
    {editing && <ContentEditor kind={kind} record={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); setNotice('Content saved.'); list.reload(); }} />}
    <Modal open={!!deleting} title="Confirm content deletion" onClose={() => { if (!busy) setDeleting(null); }}><p>Delete “{deleting?.title ?? deleting?.name}”? It will no longer appear on the public website.</p><Failure message={error} /><div className="mt-4 flex gap-3"><Button variant="secondary" disabled={busy} onClick={() => setDeleting(null)}>Cancel</Button><Button variant="danger" busy={busy} onClick={() => void remove()}>Confirm deletion</Button></div></Modal>
  </section>;
}
