import { useEffect, useState } from 'react';
import { staffRequest } from '../../contexts/StaffAuthContext';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import styles from './AdminMedia.module.css';
import { CmsLink, CmsSkeleton, ErrorNotice, FileDropzone, MediaThumbnail, ReviewedSelect, UploadIndicator } from './CmsControls';
import { errorFields, fieldMessages, StaffRequestError } from '../../lib/staffErrors';
import { fileKind, simpleFilename, uploadPrivateMedia, validateUploadFile, type UploadMetadata, type UploadProgress } from '../../lib/mediaUpload';
import { useCmsEditor, type EditorState } from '../../hooks/useCmsEditor';

export type Asset = { id: string; title: string; description: string; alt_text: string; category_id: string; source_id: string; upload_id?: string; can_resume?: boolean; original_filename?: string; kind: string; mime: string; bytes: number; processing: string; publication: string; version: number };
export type MediaOptions = { categories: { id: string; title: string; kind: string; approved: boolean; approval_status?:'approved'|'pending'|'rejected' }[]; sources: { id: string; reference: string; approved: boolean; reviewed_at?:string|null; approval_status?:'approved'|'pending'|'rejected' }[] };
const empty = { title: '', description: '', altText: '', categoryId: '', sourceId: '' };
export default function AdminMedia({ role, kind, onEditorStateChange }: { role: 'admin' | 'editor'; kind?: 'photo' | 'document'; onEditorStateChange?(state:EditorState):void }) {
  const [assets,setAssets] = useState<Asset[]>([]);
  const [options,setOptions] = useState<MediaOptions>({ categories: [], sources: [] });
  const [form,setForm] = useState(empty);
  const [file,setFile] = useState<File | null>(null);
  const [uploadId,setUploadId] = useState<string>(() => crypto.randomUUID());
  const [editing,setEditing] = useState<Asset | null>(null);
  const [resuming,setResuming] = useState<Asset | null>(null);
  const [fileKey,setFileKey] = useState(0);
  const [deleting,setDeleting] = useState<Asset | null>(null);
  const [code,setCode] = useState('');
  const [message,setMessage] = useState('');
  const [error,setError] = useState('');
  const [loadError,setLoadError] = useState('');
  const [busy,setBusy] = useState(false);
  const [uploadStage,setUploadStage] = useState<UploadProgress | null>(null);
  const [filename,setFilename] = useState(''),[retryMetadata,setRetryMetadata]=useState<UploadMetadata|null>(null),[baseline,setBaseline]=useState(JSON.stringify(empty));
  const [validation,setValidation]=useState<Record<string,string>>({}),[query,setQuery]=useState('');
  const [visibility,setVisibility]=useState(''),[libraryCategory,setLibraryCategory]=useState(''),[readyOnly,setReadyOnly]=useState(false);
  const [loading,setLoading] = useState(true);
  const [page,setPage] = useState(1);
  const [hasMore,setHasMore] = useState(false);
  const [preview,setPreview] = useState<{ url: string; title: string; mime: string } | null>(null);
  const dirty=!!file || JSON.stringify(form)!==baseline;
  const {requestDiscard,dialog}=useCmsEditor(dirty,busy,onEditorStateChange);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);
  async function load(isCurrent: () => boolean = () => true) {
    const [result,choices] = await Promise.all([
      staffRequest<{ data: Asset[]; hasMore: boolean }>(`/api/admin/media?${new URLSearchParams({page:String(page),...(kind?{kind}:{}),...(query?{q:query}:{}),...(visibility?{publication:visibility}:{}),...(libraryCategory?{categoryId:libraryCategory}:{}),...(readyOnly?{ready:'true'}:{})})}`), staffRequest<MediaOptions>('/api/admin/media/options'),
    ]);
    if (isCurrent()) { setAssets(result.data); setHasMore(result.hasMore); setOptions(choices); }
  }
  useEffect(() => { let current = true; setLoading(true); setLoadError(''); const timer=window.setTimeout(()=>void load(() => current).catch(() => { if (current) setLoadError('Media is unavailable. Please retry.'); }).finally(() => { if (current) setLoading(false); }),query?250:0); return () => { current = false;window.clearTimeout(timer); }; }, [page,query,kind,visibility,libraryCategory,readyOnly]);
  async function act(work: () => Promise<void>) {
    if(busy)return;setBusy(true); setError(''); setValidation({}); setMessage('');
    try { await work();setLoadError('');try{await load();}catch{setLoadError('The media library could not be refreshed. Use Refresh media to retry.');} }
    catch (reason) { setError((reason as Error).message);setValidation(errorFields(reason)); }
    finally { setBusy(false); }
  }
  function reset() { setEditing(null); setResuming(null); setFileKey(key=>key+1); setForm(empty); setFile(null); setUploadId(crypto.randomUUID());setFilename('');setRetryMetadata(null);setBaseline(JSON.stringify(empty));setValidation({}); }
  async function save() {
    if (editing) {
      const { sourceId: _source, ...metadata } = form;
      await staffRequest(`/api/admin/media/${editing.id}/edit`, { ...metadata, version: editing.version });
    } else {
      if (!file) throw new StaffRequestError(400,{file:validation.file || fieldMessages.file_size});
      validateUploadFile(file,kind,filename);
      const metadata=retryMetadata || {...form,filename};
      const category=options.categories.find(item=>item.id===metadata.categoryId);
      if(!category)throw new StaffRequestError(400,{categoryId:fieldMessages.category_missing});
      if(!category.approved)throw new StaffRequestError(400,{categoryId:'Choose an approved category before uploading.'});
      if(category.kind!==fileKind(file))throw new StaffRequestError(400,{categoryId:fieldMessages.category_kind});
      const source=options.sources.find(item=>item.id===metadata.sourceId);
      if(!source)throw new StaffRequestError(400,{sourceId:fieldMessages.source_missing});
      if(!source.approved && (source.reviewed_at || source.approval_status==='rejected'))throw new StaffRequestError(400,{sourceId:fieldMessages.source_unapproved});
      try {
        await uploadPrivateMedia(file,metadata,uploadId,setUploadStage);
      } catch(reason) {
        if(!(reason instanceof StaffRequestError) || reason.status>=500 || reason.status===409)setRetryMetadata(metadata);
        throw reason;
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
  const currentKind=editing?.kind || resuming?.kind || kind || (file?fileKind(file):undefined);
  const metadataLocked=!!retryMetadata || !!resuming;
  const categories = currentKind ? options.categories.filter(category => category.kind === currentKind) : options.categories;
  const heading = kind === 'photo' ? 'Photos' : kind === 'document' ? 'Documents' : 'Photos and documents';
  return <section aria-labelledby="media-title" className={styles.root}>
    <div className={styles.heading}><div><p className={styles.eyebrow}>Content library</p><h2 id="media-title">{heading}</h2><p>Private drafts, reviewed publication and secure downloads. {kind === 'photo' ? 'JPEG, PNG and WebP images' : kind === 'document' ? 'Passive PDF documents' : 'JPEG, PNG, WebP and passive PDF files'}, up to 2 MiB.</p></div>
      <Button variant="secondary" disabled={busy || loading} onClick={() => void act(async () => {})}>Refresh media</Button>
    </div>
    {(error || loadError) && <ErrorNotice message={error || loadError} fields={error?validation:{}} />}
    {message && <p role="status" className={styles.notice}>{message}</p>}
    {uploadStage && <UploadIndicator progress={uploadStage} />}
    <div className={styles.workspace}>
      <form className={styles.upload} onSubmit={event => { event.preventDefault(); void act(save); }}>
        <div className={styles.uploadHeading}><h3>{editing ? 'Edit metadata' : 'Upload a file'}</h3><p>{editing ? 'Keep file details clear and accurate.' : 'New uploads are saved as private drafts.'}</p></div>
        <fieldset disabled={busy || loading} className={styles.fields}>
          {!editing && <FileDropzone inputKey={fileKey} kind={kind} disabled={busy || loading || (!!retryMetadata && !resuming)} onFiles={files=>{
            const selected=files[0];if(!selected)return;
            const uploadFilename=resuming?.original_filename || simpleFilename(selected.name);
            try{validateUploadFile(selected,resuming ? resuming.kind as 'photo'|'document' : kind,uploadFilename);setFile(selected);setFilename(uploadFilename);setError('');setValidation({});if(!resuming){setUploadId(crypto.randomUUID());if(options.categories.find(category=>category.id===form.categoryId)?.kind!==fileKind(selected))setForm(prior=>({...prior,categoryId:''}));}}
            catch(reason){setFile(null);setFilename('');setError((reason as Error).message);setValidation(errorFields(reason));}
          }} />}
          {file && <><MediaThumbnail file={file} /><Input label="Upload filename" maxLength={110} value={filename} readOnly={metadataLocked} error={validation.filename} hint={filename!==file.name?'A compatible upload filename is used. The file contents stay the same.':undefined} onChange={event=>setFilename(event.target.value)} /></>}
          <Input label="Title" name="title" required maxLength={200} readOnly={metadataLocked} error={validation.title} {...field('title')} />
          <Input label="Description" name="description" maxLength={4000} readOnly={metadataLocked} error={validation.description} {...field('description')} />
          {currentKind !== 'document' && <Input label="Alternative text (required to publish photos)" maxLength={500} readOnly={metadataLocked} error={validation.altText} {...field('altText')} />}
          <ReviewedSelect label="Category" value={form.categoryId} onChange={categoryId=>setForm(prior=>({...prior,categoryId}))} choices={categories.map(category=>({...category,label:`${category.title} (${category.kind})`}))} disabled={busy || loading || metadataLocked} error={validation.categoryId} hint="The category must match the selected file. Only approved categories can be chosen." />
          {!editing && <ReviewedSelect label="Source record" value={form.sourceId} onChange={sourceId=>setForm(prior=>({...prior,sourceId}))} choices={options.sources.map(source=>({...source,label:source.reference}))} allowPending disabled={busy || loading || metadataLocked} error={validation.sourceId} hint="Pending sources may be used for private drafts. Source approval is required before publication." />}
          {role==='admin' && <CmsLink className={styles.download} href="/cms?tab=sources">Open Source approvals</CmsLink>}
          {resuming && <p className={styles.hint}>Choose the original file. Recovery keeps its original filename and details. If the file differs, choose the correct file and retry.</p>}
          {retryMetadata && <p className={styles.hint}>The upload could not be confirmed. Retry with the same file and details to recover it without a duplicate. The file may already exist as a private library draft.</p>}
          {!categories.length && <p className={styles.hint}>No {kind === 'photo' ? 'photo ' : kind === 'document' ? 'document ' : ''}categories are configured. An operator must supply reviewed category and source records.</p>}
          {!!categories.length && !categories.some(category=>category.approved) && <p className={styles.hint}>No approved categories are available for this file type. Ask an administrator to arrange category review before uploading.</p>}
          {!options.sources.length && <p className={styles.hint}>No source records are configured. An operator must supply verified source records before uploading.</p>}
          <div className={styles.formActions}><Button type="submit" disabled={busy || !categories.some(category=>category.approved) || (!editing && !options.sources.length)}>{busy ? 'Saving…' : editing ? 'Save metadata' : 'Upload private draft'}</Button><Button type="button" variant="secondary" onClick={()=>requestDiscard(reset)}>Clear form</Button></div>
        </fieldset>
      </form>
      <div className={styles.library}>
        <div className={styles.libraryHeading}><h3>{kind === 'photo' ? 'Photo library' : kind === 'document' ? 'Document library' : 'Media library'}</h3><span>Library page {page}</span></div>
        <p className={styles.scope}>{kind ? 'Showing ' + (kind === 'photo' ? 'photos' : 'documents') + '. Up to 50 matching files per page.' : 'Up to 50 matching files per library page.'}</p>
        <Input label="Search library files" type="search" maxLength={100} value={query} disabled={busy} onChange={event=>{setQuery(event.target.value);setPage(1);}} />
        <div className={styles.formActions}><label>Visibility<select className="block min-h-11 border p-2 bg-white" value={visibility} disabled={busy} onChange={event=>{setVisibility(event.target.value);setPage(1);}}><option value="">All files</option><option value="draft">Private drafts</option><option value="published">Published</option></select></label><label>Library category<select className="block min-h-11 border p-2 bg-white" value={libraryCategory} disabled={busy} onChange={event=>{setLibraryCategory(event.target.value);setPage(1);}}><option value="">All categories</option>{options.categories.filter(category=>!kind || category.kind===kind).map(category=><option key={category.id} value={category.id}>{category.title}</option>)}</select></label><label className="flex items-center gap-2 min-h-11"><input type="checkbox" checked={readyOnly} disabled={busy} onChange={event=>{setReadyOnly(event.target.checked);setPage(1);}}/>Ready files only</label></div>
        {loading ? <CmsSkeleton label="Loading media" rows={3} variant="cards" /> : !loadError && !visibleAssets.length && <div className={styles.empty}><h3>No {kind === 'photo' ? 'photos' : kind === 'document' ? 'documents' : 'media'} on this library page</h3><p>{query?'Clear your search or upload a new private draft.':hasMore ? 'Check the next library page for more files.' : 'Add a private draft using the upload form, or upload directly inside a content editor.'}</p></div>}
        {!loading && !loadError && <ul className={styles.assets}>
          {visibleAssets.map(asset => <li key={asset.id}>
            {asset.processing==='ready' && <MediaThumbnail asset={asset} />}
            <div className={styles.assetHeading}><div><h3>{asset.title}</h3><p>{asset.kind === 'photo' ? 'Photo' : 'Document'} · {Math.ceil(Number(asset.bytes)/1024)} KiB</p></div><span className={styles.badge}>{asset.processing === 'ready' ? asset.publication : 'Upload pending'}</span></div>
            {asset.description && <p className={styles.description}>{asset.description}</p>}
            <div className={styles.assetActions}>
              {asset.processing === 'pending' && asset.can_resume && asset.upload_id && <Button variant="secondary" disabled={busy} onClick={() => requestDiscard(() => { const details={title:asset.title,description:asset.description,altText:asset.alt_text,categoryId:asset.category_id,sourceId:asset.source_id};reset();setResuming(asset);setUploadId(asset.upload_id!);setFilename(asset.original_filename || '');setForm(details);setBaseline(JSON.stringify(details));setMessage('Choose the original file to resume this upload.'); })}>Resume upload</Button>}
              <Button variant="secondary" disabled={busy || asset.processing !== 'ready'} onClick={() => void act(() => show(asset))}>Preview</Button>
              {asset.processing === 'ready' && <a className={styles.download} href={'/api/admin/media/' + asset.id + '/download'}>Download</a>}
              <Button variant="secondary" disabled={busy || asset.processing !== 'ready'} onClick={() => requestDiscard(() => { const details={title:asset.title,description:asset.description,altText:asset.alt_text,categoryId:asset.category_id,sourceId:''};reset();setEditing(asset);setForm(details);setBaseline(JSON.stringify(details)); })}>Edit metadata</Button>
              <Button variant="secondary" disabled={busy || asset.processing !== 'ready'} onClick={() => void act(async () => { await staffRequest('/api/admin/media/' + asset.id + '/' + (asset.publication === 'published' ? 'unpublish' : 'publish'), { version: asset.version }); setMessage('Publication updated.'); })}>{asset.publication === 'published' ? 'Unpublish' : 'Publish'}</Button>
              {role === 'admin' && <Button variant="danger" disabled={busy} onClick={() => { setDeleting(asset); setCode(''); }}>Delete</Button>}
            </div>
            {asset.processing === 'pending' && !asset.can_resume && <p className={styles.hint}>Only the original uploader can resume this private upload with the same file.</p>}
          </li>)}
        </ul>}
        <div className={styles.pagination}><Button variant="secondary" disabled={busy || loading || page === 1} onClick={() => setPage(page-1)}>Previous media page</Button><Button variant="secondary" disabled={busy || loading || !hasMore} onClick={() => setPage(page+1)}>Next media page</Button></div>
        {preview && <section aria-label="File preview" className={styles.preview}><h3>{preview.title}</h3>{preview.mime.startsWith('image/') ? <img src={preview.url} alt={preview.title} /> : <div><p>Download the validated PDF to view it.</p><a className={styles.download} href={preview.url} download={preview.title + '.pdf'}>Download PDF</a></div>}<Button variant="secondary" onClick={() => setPreview(null)}>Close preview</Button></section>}
        {deleting && <section aria-label="Confirm deletion" className={styles.deletion}><h3>Delete {deleting.title}?</h3><p>This removes publication and CMS access. The private file is retained for operator recovery.</p><Input label="Deletion authenticator code" autoComplete="one-time-code" inputMode="numeric" maxLength={6} value={code} onChange={event => setCode(event.target.value)} /><div className={styles.assetActions}><Button variant="danger" disabled={busy || !/^\d{6}$/.test(code)} onClick={() => void act(async () => { const value=code; setCode(''); await staffRequest('/api/staff-auth/two-factor/verify-totp',{code:value}); await staffRequest('/api/admin/media/' + deleting.id + '/delete',{version:deleting.version}); setDeleting(null); setPreview(null); setMessage('Media deleted from the CMS.'); })}>Confirm deletion</Button><Button variant="secondary" onClick={() => setDeleting(null)}>Keep file</Button></div></section>}
      </div>
    </div>
    {dialog}
  </section>;
}
