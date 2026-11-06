import { useEffect, useState } from 'react';
import { staffRequest } from '../../contexts/StaffAuthContext';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

type Asset = { id: string; title: string; description: string; alt_text: string; category_id: string; source_id: string; upload_id?: string; kind: string; mime: string; bytes: number; processing: string; publication: string; version: number };
type Options = { categories: { id: string; title: string; kind: string; approved: boolean }[]; sources: { id: string; reference: string; approved: boolean }[] };
const empty = { title: '', description: '', altText: '', categoryId: '', sourceId: '' };
export default function AdminMedia({ role }: { role: 'admin' | 'editor' }) {
  const [assets,setAssets] = useState<Asset[]>([]);
  const [options,setOptions] = useState<Options>({ categories: [], sources: [] });
  const [form,setForm] = useState(empty);
  const [file,setFile] = useState<File | null>(null);
  const [uploadId,setUploadId] = useState<string>(() => crypto.randomUUID());
  const [editing,setEditing] = useState<Asset | null>(null);
  const [resuming,setResuming] = useState(false);
  const [fileKey,setFileKey] = useState(0);
  const [deleting,setDeleting] = useState<Asset | null>(null);
  const [code,setCode] = useState('');
  const [message,setMessage] = useState('');
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  const [loading,setLoading] = useState(true);
  const [page,setPage] = useState(1);
  const [hasMore,setHasMore] = useState(false);
  const [preview,setPreview] = useState<{ url: string; title: string; mime: string } | null>(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);
  async function load() {
    const [result,choices] = await Promise.all([
      staffRequest<{ data: Asset[]; hasMore: boolean }>(`/api/admin/media?page=${page}`), staffRequest<Options>('/api/admin/media/options'),
    ]);
    setAssets(result.data); setHasMore(result.hasMore); setOptions(choices);
  }
  useEffect(() => { setLoading(true); void load().catch(() => setError('Media is unavailable. Retry when storage is configured.')).finally(() => setLoading(false)); }, [page]);
  async function act(work: () => Promise<void>) {
    setBusy(true); setError(''); setMessage('');
    try { await work(); await load(); }
    catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  }
  function reset() { setEditing(null); setResuming(false); setFileKey(key=>key+1); setForm(empty); setFile(null); setUploadId(crypto.randomUUID()); }
  async function save() {
    if (editing) {
      const { sourceId: _source, ...metadata } = form;
      await staffRequest(`/api/admin/media/${editing.id}/edit`, { ...metadata, version: editing.version });
    } else {
      if (!file || !file.size || file.size > 2 * 1024 * 1024) throw new Error('Choose a file up to 2 MiB.');
      const base64 = await new Promise<string>((resolve,reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = () => reject(new Error('Could not read file.')); reader.readAsDataURL(file);
      });
      await staffRequest('/api/admin/media/uploads', { ...form, uploadId, filename: file.name, mime: file.type, base64 });
    }
    reset(); setMessage('Media saved. New uploads remain private drafts.');
  }
  async function show(asset: Asset) {
    const response = await fetch(`/api/admin/media/${asset.id}/preview`, { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) throw new Error('Preview could not be loaded. Refresh your session and retry.');
    setPreview({ url: URL.createObjectURL(await response.blob()), title: asset.title, mime: asset.mime });
  }
  const field = (key: keyof typeof empty) => ({ value: form[key], onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form,[key]: event.target.value }) });
  return <section aria-labelledby="media-title" className="space-y-5 border-t border-control pt-6">
    <div><h2 id="media-title" className="text-2xl font-bold">Photos and documents</h2><p className="mt-2 text-sm">Private drafts, reviewed publication and secure downloads. JPEG, PNG, WebP and passive PDF files, up to 2 MiB.</p></div>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {message && <p role="status">{message}</p>}
    <Button variant="secondary" disabled={busy} onClick={() => void act(load)}>Refresh media</Button>
    <form className="space-y-4" onSubmit={event => { event.preventDefault(); void act(save); }}>
      <h3 className="text-lg font-semibold">{editing ? 'Edit metadata' : 'Upload a file'}</h3>
      <fieldset disabled={busy || loading} className="space-y-4">
        {!editing && <label className="block">File<input key={fileKey} aria-label="File" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" required className="mt-2 block min-h-11 w-full" onChange={event => { setFile(event.target.files?.[0] || null); if (!resuming) setUploadId(crypto.randomUUID()); }} /></label>}
        <Input label="Title" required maxLength={200} {...field('title')} />
        <Input label="Description" maxLength={4000} {...field('description')} />
        <Input label="Alternative text (required to publish photos)" maxLength={500} {...field('altText')} />
        <label className="block">Category<select aria-label="Category" required className="mt-2 block min-h-11 w-full rounded-control border border-control bg-white px-3 focus-visible:outline-2" {...field('categoryId')}>
          <option value="">Choose a category</option>{options.categories.map(category => <option key={category.id} value={category.id}>{category.title} ({category.kind}){category.approved ? '' : ' — unapproved'}</option>)}
        </select></label>
        {!editing && <label className="block">Source record<select aria-label="Source record" required className="mt-2 block min-h-11 w-full rounded-control border border-control bg-white px-3 focus-visible:outline-2" {...field('sourceId')}>
          <option value="">Choose an existing source</option>{options.sources.map(source => <option key={source.id} value={source.id}>{source.reference}{source.approved ? '' : ' — unapproved'}</option>)}
        </select></label>}
        {!options.categories.length && <p>No categories are configured. An operator must supply reviewed category and source records.</p>}
        <div className="flex flex-wrap gap-2"><Button type="submit" disabled={busy || !options.categories.length}>{busy ? 'Saving…' : editing ? 'Save metadata' : 'Upload private draft'}</Button><Button type="button" variant="secondary" onClick={reset}>Clear form</Button></div>
      </fieldset>
    </form>
    {loading ? <p role="status">Loading media…</p> : !assets.length && <p>No media on this page.</p>}
    <ul className="divide-y divide-gray-200">
      {assets.map(asset => <li key={asset.id} className="space-y-3 py-5">
        <div><h3 className="break-words text-lg font-semibold">{asset.title}</h3><p className="text-sm">{asset.kind} · {Math.ceil(Number(asset.bytes)/1024)} KiB · {asset.processing === 'ready' ? asset.publication : 'Upload pending — retry the original file'}</p></div>
        <div className="flex flex-wrap gap-2">
          {asset.processing === 'pending' && asset.upload_id && <Button variant="secondary" disabled={busy} onClick={() => { reset(); setResuming(true); setUploadId(asset.upload_id!); setForm({title:asset.title,description:asset.description,altText:asset.alt_text,categoryId:asset.category_id,sourceId:asset.source_id}); setMessage('Choose the original file to resume this upload.'); }}>Resume upload</Button>}
          <Button variant="secondary" disabled={busy || asset.processing !== 'ready'} onClick={() => void act(() => show(asset))}>Preview</Button>
          {asset.processing === 'ready' && <a className="inline-flex min-h-11 items-center px-3 underline focus-visible:outline-2" href={`/api/admin/media/${asset.id}/download`}>Download</a>}
          <Button variant="secondary" disabled={busy} onClick={() => { setEditing(asset); setForm({ title: asset.title,description: asset.description,altText: asset.alt_text,categoryId: asset.category_id,sourceId: '' }); }}>Edit metadata</Button>
          <Button variant="secondary" disabled={busy || asset.processing !== 'ready'} onClick={() => void act(async () => { await staffRequest(`/api/admin/media/${asset.id}/${asset.publication === 'published' ? 'unpublish' : 'publish'}`, { version: asset.version }); setMessage('Publication updated.'); })}>{asset.publication === 'published' ? 'Unpublish' : 'Publish'}</Button>
          {role === 'admin' && <Button variant="danger" disabled={busy} onClick={() => { setDeleting(asset); setCode(''); }}>Delete</Button>}
        </div>
      </li>)}
    </ul>
    <div className="flex gap-2"><Button variant="secondary" disabled={busy || page === 1} onClick={() => setPage(page-1)}>Previous media page</Button><Button variant="secondary" disabled={busy || !hasMore} onClick={() => setPage(page+1)}>Next media page</Button></div>
    {preview && <section aria-label="File preview" className="space-y-3 border-t pt-4"><h3 className="font-semibold">{preview.title}</h3>{preview.mime.startsWith('image/') ? <img src={preview.url} alt={preview.title} className="max-h-96 max-w-full object-contain" /> : <iframe title="PDF preview" src={preview.url} className="h-96 w-full" />}<Button variant="secondary" onClick={() => setPreview(null)}>Close preview</Button></section>}
    {deleting && <section aria-label="Confirm deletion" className="space-y-3 border-t pt-4"><h3 className="font-semibold">Delete {deleting.title}?</h3><p>This removes publication and CMS access. The private file is retained for operator recovery.</p><Input label="Deletion authenticator code" autoComplete="one-time-code" inputMode="numeric" maxLength={6} value={code} onChange={event => setCode(event.target.value)} /><div className="flex flex-wrap gap-2"><Button variant="danger" disabled={busy || !/^\d{6}$/.test(code)} onClick={() => void act(async () => { const value=code; setCode(''); await staffRequest('/api/staff-auth/two-factor/verify-totp',{code:value}); await staffRequest(`/api/admin/media/${deleting.id}/delete`,{version:deleting.version}); setDeleting(null); setPreview(null); setMessage('Media deleted from the CMS.'); })}>Confirm deletion</Button><Button variant="secondary" onClick={() => setDeleting(null)}>Keep file</Button></div></section>}
  </section>;
}
