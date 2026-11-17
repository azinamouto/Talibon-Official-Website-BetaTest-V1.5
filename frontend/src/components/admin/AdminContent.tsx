import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Eye, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { staffRequest } from '../../contexts/StaffAuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { municipalModules, type Attachment, type ContentRow, type ContentSource, type MunicipalGroup } from './municipalModules';
import type { Asset } from './AdminMedia';
import DraftMediaPanel from './DraftMediaPanel';
import EditorActions, { EditorBack } from './EditorActions';
import EditorFields from './EditorFields';
import { CmsLink, CmsSkeleton, ErrorNotice, ReviewedSelect } from './CmsControls';
import { errorFields, fieldMessages, StaffRequestError } from '../../lib/staffErrors';
import { useCmsEditor, type EditorState } from '../../hooks/useCmsEditor';
import styles from './AdminContent.module.css';

type Official={name:string;role:string};
type Publication={row:ContentRow;media:{assetId:string;version:number}[];update:boolean};
const groups: Record<MunicipalGroup,string>={news:'News & Updates',tourism:'Tourism',events:'Events & Festivals',transparency:'Transparency',government:'Local Government',galleries:'Galleries',downloadables:'Downloadables'};
export default function AdminContent({role,group,onEditorStateChange}:{role:'admin'|'editor';group:MunicipalGroup;onEditorStateChange?(state:EditorState):void}) {
  const modules=municipalModules.filter(item=>item.group===group);
  const [moduleId,setModuleId]=useState(modules[0].kind+':'+(modules[0].slug || ''));
  const module=modules.find(item=>item.kind+':'+(item.slug || '')===moduleId) || modules[0];
  const [rows,setRows]=useState<ContentRow[]>([]),[sources,setSources]=useState<ContentSource[]>([]);
  const [page,setPage]=useState(1),[pages,setPages]=useState(0),[q,setQ]=useState(''),[publication,setPublication]=useState('');
  const [editing,setEditing]=useState<ContentRow|null>(null),[showForm,setShowForm]=useState(false);
  const [title,setTitle]=useState(''),[source,setSource]=useState(''),[fields,setFields]=useState<Record<string,unknown>>({});
  const [attachments,setAttachments]=useState<Attachment[]>([]),[featured,setFeatured]=useState('');
  const [uploadBusy,setUploadBusy]=useState(false),[pendingUploads,setPendingUploads]=useState(false),[baseline,setBaseline]=useState(''),[session,setSession]=useState(0);
  const [preview,setPreview]=useState<ContentRow|null>(null),[confirmation,setConfirmation]=useState<Publication|null>(null),[deleting,setDeleting]=useState<ContentRow|null>(null),[code,setCode]=useState('');
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[message,setMessage]=useState(''),[reload,setReload]=useState(0),[loadError,setLoadError]=useState('');
  const [validation,setValidation]=useState<Record<string,string>>({});
  const formRef=useRef<HTMLFormElement>(null);
  const working=busy || uploadBusy;
  const snapshot=JSON.stringify({title,source,fields,attachments,featured});
  const dirty=showForm && (pendingUploads || snapshot!==baseline);
  const {requestDiscard,dialog}=useCmsEditor(dirty,working,onEditorStateChange);
  const load=useCallback(async()=>{
    const params=new URLSearchParams({page:String(page),limit:'20',...(q?{q}:{}),...(publication?{publication}:{}),...(module.slug?{slug:module.slug}:{})});
    const [result,options]=await Promise.all([
      staffRequest<{data:ContentRow[];pagination:{totalPages:number}}>(`/api/admin/content/${module.kind}?${params}`),
      staffRequest<{data:ContentSource[]}>('/api/admin/content/sources'),
    ]);return {result,options};
  },[module.kind,module.slug,page,q,publication]);
  useEffect(()=>{
    let current=true;setLoading(true);setLoadError('');
    const timer=window.setTimeout(()=>void load().then(({result,options})=>{if(current){setRows(result.data);setPages(result.pagination.totalPages);setSources(options.data);}})
      .catch(reason=>{if(current)setLoadError((reason as Error).message);}).finally(()=>{if(current)setLoading(false);}),q?250:0);
    return()=>{current=false;window.clearTimeout(timer);};
  },[load,reload]);
  useEffect(()=>{if(showForm)formRef.current?.querySelector<HTMLInputElement>('input[name="title"]')?.focus();},[showForm,session]);
  useEffect(()=>{if(Object.keys(validation).length)formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();},[validation]);
  function clear() {
    const defaults=module.kind==='organizational_chart'?{mayor:{name:'',role:''},level2:[],departments:[]}:Object.fromEntries(module.fields.filter(field=>field.options && field.required).map(field=>[field.key,field.options![0]]));
    setEditing(null);setTitle('');setSource('');setFields(defaults);setAttachments([]);setFeatured('');setPreview(null);setPendingUploads(false);setValidation({});setSession(value=>value+1);
    setBaseline(JSON.stringify({title:'',source:'',fields:defaults,attachments:[],featured:''}));
  }
  function edit(row:ContentRow) {
    const {attachments:_attachments,featuredAssetId:_featured,...body}=row.body;
    const attached=row.body.attachments || [],photo=row.body.featuredAssetId || '';
    setEditing(row);setTitle(row.title);setSource(row.source_id);setFields(body);setAttachments(attached);setFeatured(photo);setShowForm(true);setPreview(null);setPendingUploads(false);setValidation({});setSession(value=>value+1);
    setBaseline(JSON.stringify({title:row.title,source:row.source_id,fields:body,attachments:attached,featured:photo}));
  }
  async function act(work:()=>Promise<void>) {
    if(working)return;setBusy(true);setError('');setValidation({});setMessage('');
    try{await work();setReload(value=>value+1);}catch(reason){setError((reason as Error).message);setValidation(errorFields(reason));}finally{setBusy(false);}
  }
  function input() {
    const selected=sources.find(item=>item.id===source);
    if(!selected)throw new StaffRequestError(400,{sourceId:fieldMessages.source_missing});
    if(!selected.approved && (!!selected.reviewed_at || selected.approval_status==='rejected'))throw new StaffRequestError(400,{sourceId:fieldMessages.source_unapproved});
    const values=Object.fromEntries(Object.entries(fields).filter(([key,value])=>{const definition=module.fields.find(field=>field.key===key);return !definition || definition.required || value!=='';}));
    return {title,sourceId:source,body:{...values,attachments,...(featured?{featuredAssetId:featured}:{})},...(module.slug && !editing?{slug:module.slug}:{}),...(editing?{version:editing.version}:{})};
  }
  async function persist() {
    if(editing && !dirty)return editing;
    const result=await staffRequest<{data:ContentRow}>(`/api/admin/content/${module.kind}${editing?`/${editing.id}/edit`:''}`,input());
    setEditing(result.data);setBaseline(snapshot);return result.data;
  }
  function valid() {return !pendingUploads && !!formRef.current?.reportValidity();}
  async function save(event:FormEvent) {
    event.preventDefault();if(pendingUploads){setError('Upload or remove the queued files before saving.');return;}
    await act(async()=>{await persist();setShowForm(false);setMessage('Draft saved.');});
  }
  async function previewForm() {
    if(!valid())return;
    await act(async()=>{
      if(editing?.publication==='published')setPreview({...editing,...input(),source_id:source,body:input().body});
      else {const row=await persist();const result=await staffRequest<{data:ContentRow[]}>(`/api/admin/content/${row.kind}/${row.id}/preview`);setPreview(result.data[0] || row);}
    });
  }
  async function prepare(row:ContentRow,update=false) {
    const selected=sources.find(item=>item.id===row.source_id);
    if(!selected?.approved)throw new StaffRequestError(400,{sourceId:fieldMessages.source_unapproved});
    const ids=[...new Set([...(row.body.attachments || []).map(item=>item.assetId),...(row.body.featuredAssetId?[row.body.featuredAssetId]:[])])];
    const assets=await Promise.all(ids.map(id=>staffRequest<Asset>(`/api/admin/media/${id}`)));
    if(assets.some(asset=>!asset?.id || asset.processing!=='ready'))throw new StaffRequestError(400,{attachments:fieldMessages.attachment_missing});
    setConfirmation({row,media:assets.map(asset=>({assetId:asset.id,version:asset.version})),update});
  }
  async function publishForm() {
    if(!valid())return;
    await act(async()=>{const row=editing?.publication==='published'?{...editing,title,source_id:source,body:input().body}:await persist();await prepare(row,editing?.publication==='published');});
  }
  async function confirmPublish() {
    if(!confirmation)return;
    await act(async()=>{
      const {row,media,update}=confirmation;
      await staffRequest(`/api/admin/content/${row.kind}/${row.id}/${update?'update':'publish'}`,update?{...input(),media}:{version:row.version,media});
      setConfirmation(null);setPreview(null);setShowForm(false);clear();setMessage(update?'Content updated.':'Content published.');
    });
  }
  async function change(row:ContentRow,action:string) {await act(async()=>{await staffRequest(`/api/admin/content/${row.kind}/${row.id}/${action}`,{version:row.version});setPreview(null);setMessage(`Content ${action==='unpublish'?'returned to draft':action==='restore'?'restored to draft':'archived'}.`);});}
  function addAttachment(asset:Asset) {setAttachments(prior=>prior.some(item=>item.assetId===asset.id) || prior.length>=50?prior:[...prior,{assetId:asset.id,caption:asset.title,altText:asset.alt_text || ''}]);}
  const chart=(key:string,label:string,single=false)=>{
    const values=single?[((fields[key] || {name:'',role:''}) as Official)]:((fields[key] || []) as Official[]);
    return <section className={styles.wide}><h4>{label}</h4>{values.map((official,index)=><div key={index} className={styles.chartRow}>
      {(['name','role'] as const).map(part=>{const field=`${key}${single?'':`.${index}`}.${part}`;return <Input key={part} label={`${label} ${index+1} ${part}`} name={field} error={validation[field]} required maxLength={200} value={official[part]} onChange={event=>{const updated=values.map((entry,i)=>i===index?{...entry,[part]:event.target.value}:entry);setFields({...fields,[key]:single?updated[0]:updated});}} />;})}
      {!single && <Button variant="secondary" onClick={()=>setFields({...fields,[key]:values.filter((_,i)=>i!==index)})}>Remove entry</Button>}
    </div>)}{!single && <Button variant="secondary" disabled={values.length>=100} onClick={()=>setFields({...fields,[key]:[...values,{name:'',role:''}]})}>Add {label.toLowerCase()} entry</Button>}</section>;
  };
  const cancel=()=>requestDiscard(()=>{clear();setShowForm(false);});
  return <section className={styles.root} aria-label={groups[group]}>
    <div className={styles.heading}><div><h2>{showForm?module.label:groups[group]}</h2>{showForm && <span className={styles.badge}>{editing?.publication==='published'?'Published':'Draft'}{dirty?' - Unsaved changes':''}</span>}</div>
      {showForm?<EditorBack busy={working} onBack={cancel}/>:<Button disabled={working||loading} onClick={()=>{clear();setShowForm(true);}}><Plus size={18} aria-hidden="true" />New draft</Button>}
    </div>
    {(error || loadError) && <ErrorNotice message={error || loadError} fields={error?validation:{}} />}{message && <p role="status" className={styles.notice}>{message}</p>}
    <div className={styles.toolbar}>
      <label className={styles.field}>{group==='news'?'Content type':'Section'}<select value={moduleId} disabled={working} onChange={event=>{const value=event.target.value;requestDiscard(()=>{setModuleId(value);setPage(1);setShowForm(false);setPendingUploads(false);setPreview(null);setDeleting(null);});}}>{modules.map(item=><option key={item.kind+item.slug} value={item.kind+':'+(item.slug || '')}>{item.label}</option>)}</select></label>
      {!showForm && <><label className={styles.field}>Status<select value={publication} disabled={working} onChange={event=>{setPublication(event.target.value);setPage(1);}}><option value="">All content</option><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
        <Input label="Search titles" type="search" maxLength={100} value={q} disabled={working} onChange={event=>{setQ(event.target.value);setPage(1);}} />
        <Button variant="secondary" disabled={working||loading} onClick={()=>setReload(value=>value+1)}><RefreshCw size={18} aria-hidden="true" />Refresh records</Button></>}
    </div>
    {showForm?<form ref={formRef} className={styles.form} onSubmit={event=>void save(event)} aria-busy={working}>
      <fieldset className={styles.fields} disabled={working}>
        <div className={styles.wide}><Input label={module.titleLabel || 'Title'} name="title" required maxLength={200} value={title} error={validation.title} onChange={event=>setTitle(event.target.value)} /></div>
        <EditorFields definitions={module.fields.filter(field=>!field.advanced)} values={fields} errors={validation} onChange={setFields}/>
        {module.kind==='organizational_chart' && <>{chart('mayor','Executive leader',true)}{chart('level2','Second level')}{chart('departments','Department')}</>}
        {module.fields.some(field=>field.advanced) && <details className={styles.wide} open={module.fields.some(field=>field.advanced && validation[field.key]) || undefined}><summary>Additional details</summary><div className={styles.fields}><EditorFields definitions={module.fields.filter(field=>field.advanced)} values={fields} errors={validation} onChange={setFields}/></div></details>}
        <section className={styles.wide} aria-label="Verification"><ReviewedSelect label="Official material" name="sourceId" allowPending choices={sources.map(item=>({...item,label:item.reference}))} disabled={working} value={source} error={validation.sourceId} onChange={setSource} hint="Administrator approval is required before publication."/>
          {!sources.length && <p className={styles.hint}>An administrator must register official source material in Source approvals.</p>}
          {role==='admin' && <CmsLink className={styles.approvalLink} href="/cms?tab=sources">Open Source approvals</CmsLink>}
        </section>
      </fieldset>
      <DraftMediaPanel key={`${moduleId}:${session}`} sourceId={source} role={role} kind={module.kind} attachments={attachments} featured={featured} onAttach={addAttachment} onAttachmentsChange={setAttachments} onFeaturedChange={setFeatured} busy={busy} onBusyChange={setUploadBusy} onPendingChange={setPendingUploads} fieldErrors={validation}/>
      <EditorActions busy={working} blocked={!sources.length || pendingUploads} published={editing?.publication==='published'} onPreview={()=>void previewForm()} onPublish={()=>void publishForm()} onCancel={cancel}/>
    </form>:<div>
      {loading?<CmsSkeleton label="Loading municipal records" rows={3}/>:!loadError&&!rows.length?<div className={styles.empty}><p>No content found.</p><Button variant="secondary" onClick={()=>{clear();setShowForm(true);}}><Plus size={18} aria-hidden="true" />Create a draft</Button></div>:!loadError&&<ul className={styles.list}>{rows.map(row=><li key={row.id} className={styles.row}>
        <div className={styles.rowHeading}><h3>{row.title}</h3><span className={styles.badge}>{row.publication}</span></div><p>Updated {new Date(row.updated_at).toLocaleString()}</p><div className={styles.actions}>
          <Button variant="secondary" disabled={working} onClick={()=>void act(async()=>{const result=await staffRequest<{data:ContentRow[]}>(`/api/admin/content/${row.kind}/${row.id}/preview`);setPreview(result.data[0] || null);})}><Eye size={18} aria-hidden="true" />Preview</Button>
          {row.publication!=='archived' && <Button variant="secondary" disabled={working} onClick={()=>edit(row)}><Pencil size={18} aria-hidden="true" />{row.publication==='draft'?'Edit draft':'Edit'}</Button>}
          {row.publication==='draft' && <Button disabled={working} onClick={()=>void act(()=>prepare(row))}>Publish</Button>}
          {row.publication==='published' && <Button variant="secondary" disabled={working} onClick={()=>void change(row,'unpublish')}>Unpublish</Button>}
          {row.publication==='archived'?<Button variant="secondary" disabled={working} onClick={()=>void change(row,'restore')}>Restore draft</Button>:<Button variant="secondary" disabled={working} onClick={()=>void change(row,'archive')}>Archive</Button>}
          {role==='admin' && <Button variant="danger" disabled={working} onClick={()=>{setDeleting(row);setCode('');}}><Trash2 size={18} aria-hidden="true" />Delete</Button>}
        </div></li>)}</ul>}
      {loadError && <Button variant="secondary" disabled={working||loading} onClick={()=>setReload(value=>value+1)}>Retry records</Button>}
      <div className={styles.pagination}><span>Page {page} of {Math.max(1,pages)}</span><div className={styles.actions}><Button variant="secondary" disabled={working||loading||page===1} onClick={()=>setPage(value=>value-1)}>Previous page</Button><Button variant="secondary" disabled={working||loading||page>=pages} onClick={()=>setPage(value=>value+1)}>Next page</Button></div></div>
    </div>}
    {preview && <Modal open title="Preview" onClose={()=>setPreview(null)}><ContentPreview row={preview} onClose={()=>setPreview(null)}/></Modal>}
    {confirmation && <Modal open title={confirmation.update?'Update published content?':'Publish content?'} onClose={()=>{if(!working)setConfirmation(null);}}><p className={styles.confirmTitle}>{confirmation.row.title}</p>
      {!!confirmation.media.length && <p>Attached photos and PDFs will be public with this content. Official material and file categories must be approved.</p>}
      <div className={styles.editorActions}><Button busy={working} onClick={()=>void confirmPublish()}>{confirmation.update?'Confirm update':'Confirm publication'}</Button><Button variant="secondary" disabled={working} onClick={()=>setConfirmation(null)}>Keep editing</Button></div>
    </Modal>}
    {deleting && <Modal open title="Delete content?" onClose={()=>{if(!working)setDeleting(null);}}><p>{deleting.title}</p><p>Content will leave the website and CMS. Audit history and private attachments are retained.</p><Input label="Deletion authenticator code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={event=>setCode(event.target.value)}/><div className={styles.editorActions}><Button variant="danger" disabled={working||!/^\d{6}$/.test(code)} onClick={()=>void act(async()=>{const value=code;setCode('');await staffRequest('/api/staff-auth/two-factor/verify-totp',{code:value});await staffRequest(`/api/admin/content/${deleting.kind}/${deleting.id}/delete`,{version:deleting.version});setDeleting(null);setMessage('Content deleted.');})}>Confirm deletion</Button><Button variant="secondary" disabled={working} onClick={()=>setDeleting(null)}>Keep record</Button></div></Modal>}
    {dialog}
  </section>;
}
function PreviewValue({value}:{value:unknown}) {
  if(typeof value==='string')return <p>{value}</p>;
  if(Array.isArray(value))return <ul>{value.map((entry,index)=><li key={index}><PreviewValue value={entry}/></li>)}</ul>;
  if(value && typeof value==='object')return <p>{Object.values(value).filter(entry=>typeof entry==='string').join(' - ')}</p>;
  return null;
}
function ContentPreview({row,onClose}:{row:ContentRow;onClose():void}) {
  const [media,setMedia]=useState<Record<string,Asset|null>>({});
  const ids=(row.body.attachments || []).map(item=>item.assetId).join(',');
  useEffect(()=>{
    let current=true;setMedia({});if(!ids)return;
    void Promise.allSettled(ids.split(',').map(id=>staffRequest<Asset>(`/api/admin/media/${id}`))).then(results=>{if(current)setMedia(Object.fromEntries(results.map((result,index)=>[ids.split(',')[index],result.status==='fulfilled' && result.value?.id?result.value:null])));});return()=>{current=false;};
  },[ids,row.version]);
  const definitions=municipalModules.find(module=>module.kind===row.kind)?.fields || [];
  return <section className={styles.preview} aria-label="Private content preview"><span className={styles.badge}>Private preview</span><h3>{row.title}</h3>
    {row.body.featuredAssetId && <img src={`/api/admin/media/${row.body.featuredAssetId}/preview`} alt={row.body.attachments?.find(item=>item.assetId===row.body.featuredAssetId)?.altText || row.title}/>}
    {Object.entries(row.body).filter(([key])=>!['attachments','featuredAssetId'].includes(key)).map(([key,value])=><div key={key}><strong>{definitions.find(field=>field.key===key)?.label || key.replace(/_/g,' ')}</strong><PreviewValue value={value}/></div>)}
    {row.body.attachments?.map(item=><div key={item.assetId}><a href={`/api/admin/media/${item.assetId}/download`}>{item.caption}</a>{media[item.assetId]?.kind==='photo' && <img src={`/api/admin/media/${item.assetId}/preview`} alt={item.altText || media[item.assetId]!.alt_text}/>}{Object.hasOwn(media,item.assetId) && !media[item.assetId] && <p className={styles.hint}>Attachment unavailable.</p>}</div>)}
    <Button variant="secondary" onClick={onClose}>Close preview</Button>
  </section>;
}
