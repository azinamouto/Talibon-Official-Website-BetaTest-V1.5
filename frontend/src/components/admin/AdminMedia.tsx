import { useEffect, useState } from 'react';
import { staffRequest } from '../../contexts/StaffAuthContext';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import styles from './AdminMedia.module.css';

export type Asset = { id: string; title: string; description: string; alt_text: string; category_id: string; source_id: string; upload_id?: string; kind: string; mime: string; bytes: number; processing: string; publication: string; version: number };
type Options = { categories: { id: string; title: string; kind: string; approved: boolean }[]; sources: { id: string; reference: string; approved: boolean }[] };
const empty = { title: '', description: '', altText: '', categoryId: '', sourceId: '' };
export default function AdminMedia({ role, kind }: { role: 'admin' | 'editor'; kind?: 'photo' | 'document' }) {
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
  const [uploadStage,setUploadStage] = useState<'reading' | 'uploading' | null>(null);
  const [loading,setLoading] = useState(true);
  const [page,setPage] = useState(1);
  const [hasMore,setHasMore] = useState(false);
  const [preview,setPreview] = useState<{ url: string; title: string; mime: string } | null>(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);
  async function load(isCurrent: () => boolean = () => true) {
    const [result,choices] = await Promise.all([
      staffRequest<{ data: Asset[]; hasMore: boolean }>(`/api/admin/media?page=${page}`), staffRequest<Options>('/api/admin/media/options'),
    ]);
    if (isCurrent()) { setAssets(result.data); setHasMore(result.hasMore); setOptions(choices); }
  }
  useEffect(() => { let current = true; setLoading(true); setError(''); void load(() => current).catch(() => { if (current) setError('Media is unavailable. Please retry.'); }).finally(() => { if (current) setLoading(false); }); return () => { current = false; }; }, [page]);
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
      const accepted = kind === 'photo' ? ['image/jpeg', 'image/png', 'image/webp'] : kind === 'document' ? ['application/pdf'] : ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!accepted.includes(file.type)) throw new Error(kind === 'photo' ? 'Choose a JPEG, PNG or WebP photo.' : kind === 'document' ? 'Choose a PDF document.' : 'Choose a supported photo or PDF document.');
      setUploadStage('reading');
      try {
        const base64 = await new Promise<string>((resolve,reject) => {
          const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = () => reject(new Error('Could not read file.')); reader.readAsDataURL(file);
        });
        setUploadStage('uploading');
        await staffRequest('/api/admin/media/uploads', { ...form, uploadId, filename: file.name, mime: file.type, base64 });
      } finally { setUploadStage(null); }
    }
    reset(); setMessage('Media saved. New uploads remain private drafts.');
  }
  async function show(asset: Asset) {
    const response = await fetch(`/api/admin/media/${asset.id}/preview`, { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) throw new Error('Preview could not be loaded. Refresh your session and retry.');
    setPreview({ url: URL.createObjectURL(await response.blob()), title: asset.title, mime: asset.mime });
  }
  const field = (key: keyof typeof empty) => ({ value: form[key], onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form,[key]: event.target.value }) });
  const visibleAssets = kind ? assets.filter(asset => asset.kind === kind) : assets;
  const categories = kind ? options.categories.filter(category => category.kind === kind) : options.categories;
  const heading = kind === 'photo' ? 'Photos' : kind === 'document' ? 'Documents' : 'Photos and documents';
  return <section aria-labelledby="media-title" className={styles.root}>
    <div className={styles.heading}><div><p className={styles.eyebrow}>Content library</p><h2 id="media-title">{heading}</h2><p>Private drafts, reviewed publication and secure downloads. {kind === 'photo' ? 'JPEG, PNG and WebP images' : kind === 'document' ? 'Passive PDF documents' : 'JPEG, PNG, WebP and passive PDF files'}, up to 2 MiB.</p></div>
      <Button variant="secondary" disabled={busy || loading} onClick={() => void act(async () => {})}>Refresh media</Button>
    </div>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {message && <p role="status" className={styles.notice}>{message}</p>}
    {uploadStage && <div className={styles.progress}><p role="status">{uploadStage === 'reading' ? 'Reading file…' : 'Uploading and verifying file…'}</p><progress aria-label="File upload progress" /></div>}
    <div className={styles.workspace}>
      <form className={styles.upload} onSubmit={event => { event.preventDefault(); void act(save); }}>
        <div className={styles.uploadHeading}><h3>{editing ? 'Edit metadata' : 'Upload a file'}</h3><p>{editing ? 'Keep file details clear and accurate.' : 'New uploads are saved as private drafts.'}</p></div>
        <fieldset disabled={busy || loading} className={styles.fields}>
          {!editing && <label className={styles.fileField}>File<input key={fileKey} aria-label="File" type="file" accept={kind === 'photo' ? '.jpg,.jpeg,.png,.webp' : kind === 'document' ? '.pdf' : '.jpg,.jpeg,.png,.webp,.pdf'} required onChange={event => { setFile(event.target.files?.[0] || null); if (!resuming) setUploadId(crypto.randomUUID()); }} /></label>}
          <Input label="Title" required maxLength={200} {...field('title')} />
          <Input label="Description" maxLength={4000} {...field('description')} />
          {kind !== 'document' && <Input label="Alternative text (required to publish photos)" maxLength={500} {...field('altText')} />}
          <label className={styles.selectField}>Category<select aria-label="Category" required {...field('categoryId')}>
            <option value="">Choose a category</option>{categories.map(category => <option key={category.id} value={category.id}>{category.title} ({category.kind}){category.approved ? '' : ' — unapproved'}</option>)}
          </select></label>
          {!editing && <label className={styles.selectField}>Source record<select aria-label="Source record" required {...field('sourceId')}>
            <option value="">Choose an existing source</option>{options.sources.map(source => <option key={source.id} value={source.id}>{source.reference}{source.approved ? '' : ' — unapproved'}</option>)}
          </select></label>}
          {!categories.length && <p className={styles.hint}>No {kind === 'photo' ? 'photo ' : kind === 'document' ? 'document ' : ''}categories are configured. An operator must supply reviewed category and source records.</p>}
          {!options.sources.length && <p className={styles.hint}>No source records are configured. An operator must supply verified source records before uploading.</p>}
          <div className={styles.formActions}><Button type="submit" disabled={busy || !categories.length || (!editing && !options.sources.length)}>{busy ? 'Saving…' : editing ? 'Save metadata' : 'Upload private draft'}</Button><Button type="button" variant="secondary" onClick={reset}>Clear form</Button></div>
        </fieldset>
      </form>
      <div className={styles.library}>
        <div className={styles.libraryHeading}><h3>{kind === 'photo' ? 'Photo library' : kind === 'document' ? 'Document library' : 'Media library'}</h3><span>Library page {page}</span></div>
        <p className={styles.scope}>{kind ? 'Showing ' + (kind === 'photo' ? 'photos' : 'documents') + ' on this library page. Pages include both photos and documents.' : 'Up to 50 files per library page.'}</p>
        {loading ? <p role="status" className={styles.hint}>Loading media…</p> : !error && !visibleAssets.length && <div className={styles.empty}><h3>No {kind === 'photo' ? 'photos' : kind === 'document' ? 'documents' : 'media'} on this library page</h3><p>{hasMore ? 'Check the next library page for more files.' : 'Add a private draft using the upload form.'}</p></div>}
        {!loading && !error && <ul className={styles.assets}>
          {visibleAssets.map(asset => <li key={asset.id}>
            <div className={styles.assetHeading}><div><h3>{asset.title}</h3><p>{asset.kind === 'photo' ? 'Photo' : 'Document'} · {Math.ceil(Number(asset.bytes)/1024)} KiB</p></div><span className={styles.badge}>{asset.processing === 'ready' ? asset.publication : 'Upload pending'}</span></div>
            {asset.description && <p className={styles.description}>{asset.description}</p>}
            <div className={styles.assetActions}>
              {asset.processing === 'pending' && asset.upload_id && <Button variant="secondary" disabled={busy} onClick={() => { reset(); setResuming(true); setUploadId(asset.upload_id!); setForm({title:asset.title,description:asset.description,altText:asset.alt_text,categoryId:asset.category_id,sourceId:asset.source_id}); setMessage('Choose the original file to resume this upload.'); }}>Resume upload</Button>}
              <Button variant="secondary" disabled={busy || asset.processing !== 'ready'} onClick={() => void act(() => show(asset))}>Preview</Button>
              {asset.processing === 'ready' && <a className={styles.download} href={'/api/admin/media/' + asset.id + '/download'}>Download</a>}
              <Button variant="secondary" disabled={busy} onClick={() => { setEditing(asset); setForm({ title: asset.title,description: asset.description,altText: asset.alt_text,categoryId: asset.category_id,sourceId: '' }); }}>Edit metadata</Button>
              <Button variant="secondary" disabled={busy || asset.processing !== 'ready'} onClick={() => void act(async () => { await staffRequest('/api/admin/media/' + asset.id + '/' + (asset.publication === 'published' ? 'unpublish' : 'publish'), { version: asset.version }); setMessage('Publication updated.'); })}>{asset.publication === 'published' ? 'Unpublish' : 'Publish'}</Button>
              {role === 'admin' && <Button variant="danger" disabled={busy} onClick={() => { setDeleting(asset); setCode(''); }}>Delete</Button>}
            </div>
          </li>)}
        </ul>}
        <div className={styles.pagination}><Button variant="secondary" disabled={busy || loading || page === 1} onClick={() => setPage(page-1)}>Previous media page</Button><Button variant="secondary" disabled={busy || loading || !hasMore} onClick={() => setPage(page+1)}>Next media page</Button></div>
        {preview && <section aria-label="File preview" className={styles.preview}><h3>{preview.title}</h3>{preview.mime.startsWith('image/') ? <img src={preview.url} alt={preview.title} /> : <div><p>Download the validated PDF to view it.</p><a className={styles.download} href={preview.url} download={preview.title + '.pdf'}>Download PDF</a></div>}<Button variant="secondary" onClick={() => setPreview(null)}>Close preview</Button></section>}
        {deleting && <section aria-label="Confirm deletion" className={styles.deletion}><h3>Delete {deleting.title}?</h3><p>This removes publication and CMS access. The private file is retained for operator recovery.</p><Input label="Deletion authenticator code" autoComplete="one-time-code" inputMode="numeric" maxLength={6} value={code} onChange={event => setCode(event.target.value)} /><div className={styles.assetActions}><Button variant="danger" disabled={busy || !/^\d{6}$/.test(code)} onClick={() => void act(async () => { const value=code; setCode(''); await staffRequest('/api/staff-auth/two-factor/verify-totp',{code:value}); await staffRequest('/api/admin/media/' + deleting.id + '/delete',{version:deleting.version}); setDeleting(null); setPreview(null); setMessage('Media deleted from the CMS.'); })}>Confirm deletion</Button><Button variant="secondary" onClick={() => setDeleting(null)}>Keep file</Button></div></section>}
      </div>
    </div>
  </section>;
}
