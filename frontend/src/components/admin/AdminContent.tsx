import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Eye, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { staffRequest } from '../../contexts/StaffAuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { municipalModules, publicContentHref, type Attachment, type ContentRow, type MunicipalGroup } from './municipalModules';
import type { Asset } from './AdminMedia';
import DraftMediaPanel from './DraftMediaPanel';
import EditorActions, { EditorBack } from './EditorActions';
import EditorFields from './EditorFields';
import OfficialEditor, { chartEntries, emptyOfficial, type OfficialEntry } from './OfficialEditor';
import ReportingChart from '../ReportingChart';
import { CmsLink, CmsSkeleton, CmsToast, ErrorNotice } from './CmsControls';
import { errorFields, fieldMessages, StaffRequestError } from '../../lib/staffErrors';
import { isReadyMedia } from '../../lib/mediaUpload';
import { useCmsEditor, type EditorState } from '../../hooks/useCmsEditor';
import styles from './AdminContent.module.css';

type Submission={identity:string;path:string;body:Record<string,unknown>};
const groups:Record<MunicipalGroup,string>={news:'News & Updates',tourism:'Tourism',events:'Events & Festivals',transparency:'Transparency',government:'Local Government',chart:'Organizational Chart',galleries:'Galleries',downloadables:'Downloadables'};
const statusLabels={draft:'Unpublished',published:'Published',archived:'Archived'};
export default function AdminContent({role,group,onEditorStateChange}:{role:'admin'|'editor';group:MunicipalGroup;onEditorStateChange?(state:EditorState):void}) {
  const modules=municipalModules.filter(item=>item.group===group);
  const [moduleId,setModuleId]=useState(modules[0].kind+':'+(modules[0].slug || ''));
  const module=modules.find(item=>item.kind+':'+(item.slug || '')===moduleId) || modules[0];
  const [rows,setRows]=useState<ContentRow[]>([]);
  const [page,setPage]=useState(1),[pages,setPages]=useState(0),[q,setQ]=useState(''),[publication,setPublication]=useState('');
  const [editing,setEditing]=useState<ContentRow|null>(null),[showForm,setShowForm]=useState(false);
  const [title,setTitle]=useState(''),[source,setSource]=useState(''),[fields,setFields]=useState<Record<string,unknown>>({});
  const [attachments,setAttachments]=useState<Attachment[]>([]),[featured,setFeatured]=useState(''),[photoIds,setPhotoIds]=useState<string[]>([]);
  const [uploadBusy,setUploadBusy]=useState(false),[pendingUploads,setPendingUploads]=useState(false),[baseline,setBaseline]=useState(''),[session,setSession]=useState(0);
  const [preview,setPreview]=useState<ContentRow|null>(null),[deleting,setDeleting]=useState<ContentRow|null>(null),[code,setCode]=useState('');
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[message,setMessage]=useState(''),[reload,setReload]=useState(0),[loadError,setLoadError]=useState('');
  const [validation,setValidation]=useState<Record<string,string>>({}),[uncertain,setUncertain]=useState(false),[conflict,setConflict]=useState(false),[published,setPublished]=useState<ContentRow|null>(null);
  const formRef=useRef<HTMLFormElement>(null),activeOperation=useRef(false),submission=useRef<Submission|null>(null);
  const working=busy || uploadBusy,locked=working || uncertain;
  const snapshot=JSON.stringify({kind:module.kind,title,source,fields,attachments,featured});
  const dirty=showForm && (pendingUploads || snapshot!==baseline);
  const {requestDiscard,dialog}=useCmsEditor(dirty,working,onEditorStateChange,uncertain);
  const load=useCallback(async()=>{
    const params=new URLSearchParams({page:String(page),limit:'20',...(q?{q}:{}),...(publication?{publication}:{}),...(module.slug?{slug:module.slug}:{})});
    return staffRequest<{data:ContentRow[];pagination:{totalPages:number}}>('/api/admin/content/'+module.kind+'?'+params);
  },[module.kind,module.slug,page,q,publication]);
  useEffect(()=>{
    let current=true;setLoading(true);setLoadError('');
    const timer=window.setTimeout(()=>void load().then(result=>{if(current){setRows(result.data);setPages(result.pagination.totalPages);}})
      .catch(reason=>{if(current)setLoadError((reason as Error).message);}).finally(()=>{if(current)setLoading(false);}),q?250:0);
    return()=>{current=false;window.clearTimeout(timer);};
  },[load,reload]);
  useEffect(()=>{if(showForm)formRef.current?.querySelector<HTMLInputElement>('input[name="title"]')?.focus();},[showForm,session]);
  useEffect(()=>{if(Object.keys(validation).length)formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();},[validation]);
  function clear() {
    const defaults=module.kind==='organizational_chart'?{nodes:[emptyOfficial()]}:Object.fromEntries(module.fields.filter(field=>field.options && field.required).map(field=>[field.key,field.options![0]]));
    setEditing(null);setTitle('');setSource('');setFields(defaults);setAttachments([]);setPhotoIds([]);setFeatured('');setPreview(null);setPendingUploads(false);setValidation({});setUncertain(false);setConflict(false);submission.current=null;setSession(value=>value+1);
    setBaseline(JSON.stringify({kind:module.kind,title:'',source:'',fields:defaults,attachments:[],featured:''}));
  }
  function edit(row:ContentRow) {
    const {attachments:_attachments,featuredAssetId:_featured,...body}=row.body;
    if(row.kind==='organizational_chart')body.nodes=chartEntries(body);
    const attached=row.body.attachments || [],photo=row.body.featuredAssetId || '',evidence=row.source_id || '';
    setEditing(row);setTitle(row.title);setSource(evidence);setFields(body);setAttachments(attached);setPhotoIds([]);setFeatured(photo);setShowForm(true);setPreview(null);setPendingUploads(false);setValidation({});setUncertain(false);setConflict(false);submission.current=null;setSession(value=>value+1);
    setBaseline(JSON.stringify({kind:module.kind,title:row.title,source:evidence,fields:body,attachments:attached,featured:photo}));
  }
  async function act(work:()=>Promise<void>) {
    if(working || activeOperation.current)return;
    activeOperation.current=true;setBusy(true);setError('');setValidation({});setMessage('');
    try{await work();setReload(value=>value+1);}catch(reason){setError((reason as Error).message);setValidation(errorFields(reason));}finally{activeOperation.current=false;setBusy(false);}
  }
  function input() {
    const values=Object.fromEntries(Object.entries(fields).filter(([key,value])=>{const definition=module.fields.find(field=>field.key===key);return !definition || definition.required || value!=='';}));
    if(group==='news'){delete values.summary;delete values.date;}
    return {title:title.trim(),...(source?{sourceId:source}:editing?{sourceId:null}:{}),body:{...values,attachments,...(featured?{featuredAssetId:featured}:{})},...(module.slug && !editing?{slug:module.slug}:{}),...(editing?{version:editing.version}:{})};
  }
  async function publish(event:FormEvent) {
    event.preventDefault();
    if(pendingUploads){setError('Wait for the files to finish uploading, or retry or remove the failed upload.');return;}
    if(!formRef.current?.reportValidity())return;
    await act(async()=>{
      const content=input(),identity=JSON.stringify({kind:module.kind,id:editing?.id,content});
      if(!submission.current || submission.current.identity!==identity) {
        const ids=[...new Set([...attachments.map(item=>item.assetId),...(featured?[featured]:[])])];
        const assets=await Promise.all(ids.map(id=>staffRequest<Asset>('/api/admin/media/'+id)));
        if(assets.some((asset,index)=>!isReadyMedia(asset) || asset.id!==ids[index]))throw new StaffRequestError(400,{attachments:fieldMessages.attachment_missing});
        submission.current={identity,path:'/api/admin/content/'+module.kind+(editing?'/'+editing.id+'/update':'/publish'),
          body:{...content,submissionId:crypto.randomUUID(),media:assets.map(asset=>({assetId:asset.id,version:asset.version}))}};
      }
      try {
        const result=await staffRequest<{data:ContentRow}>(submission.current.path,submission.current.body);
        clear();setShowForm(false);setPublished(result.data);setMessage('Published successfully.');
      } catch(reason) {
        setConflict(reason instanceof StaffRequestError && reason.status===409 && !!editing);
        if(reason instanceof StaffRequestError && [400,409,413].includes(reason.status)) {
          setUncertain(false);submission.current=null;
        } else if(!(reason instanceof StaffRequestError) || reason.status>=500)setUncertain(true);
        else if(!uncertain)submission.current=null;
        throw reason;
      }
    });
  }
  function previewForm() {
    if(pendingUploads || !formRef.current?.reportValidity())return;
    setPreview({...(editing || {id:'local-preview',kind:module.kind,slug:module.slug || '',publication:'draft',version:1,updated_at:new Date().toISOString()}),title,source_id:source || null,body:input().body});
  }
  async function change(row:ContentRow,action:string) {
    await act(async()=>{await staffRequest('/api/admin/content/'+row.kind+'/'+row.id+'/'+action,{version:row.version});setPreview(null);setMessage(action==='unpublish'?'Removed from the website.':action==='restore'?'Restored for editing.':'Archived.');});
  }
  function addAttachment(asset:Asset) {
    setAttachments(prior=>prior.some(item=>item.assetId===asset.id) || prior.length>=50?prior:[...prior,{assetId:asset.id,caption:asset.title,altText:asset.alt_text || title || asset.title}]);
    if(asset.kind==='photo' && !featured && module.kind!=='organizational_chart')setFeatured(asset.id);
  }
  function changeAttachments(value:Attachment[]) {
    const removed=new Set(attachments.filter(item=>!value.some(next=>next.assetId===item.assetId)).map(item=>item.assetId));
    setAttachments(value);
    if(removed.size)setFields(prior=>({...prior,...Object.fromEntries(['nodes','officials'].filter(key=>Array.isArray(prior[key])).map(key=>[key,(prior[key] as OfficialEntry[]).map(row=>row.photoAssetId && removed.has(row.photoAssetId)?{...row,photoAssetId:undefined}:row)]))}));
  }
  const cancel=()=>requestDiscard(()=>{clear();setShowForm(false);});
  return <section className={styles.root} aria-label={groups[group]}>
    <div className={styles.heading}><div><h2>{showForm?module.label:groups[group]}</h2>{showForm?<p>Enter the details, add files, and publish to the website.</p>:<p>Manage the information shown on the Talibon website.</p>}
      {showForm && dirty && <span className={styles.badge}>Unsaved changes</span>}</div>
      {showForm?<EditorBack busy={working} onBack={cancel}/>:<Button disabled={working||loading} onClick={()=>{clear();setShowForm(true);}}><Plus size={18} aria-hidden="true" />New {group==='news'?'post':'record'}</Button>}
    </div>
    {(error || loadError) && <ErrorNotice message={error || loadError} fields={error?validation:{}} />}<CmsToast message={message} onDismiss={()=>setMessage('')}/>
    {published && message && <p className={styles.notice}><CmsLink href={publicContentHref(published)}>View on website</CmsLink></p>}
    {(modules.length>1 || !showForm) && <div className={styles.toolbar}>
      {modules.length>1 && <label className={styles.field}>{group==='news'?'Post type':'Section'}<select value={moduleId} disabled={locked || (showForm && !!editing)} onChange={event=>{
        const value=event.target.value;
        if(showForm && group==='news'){setModuleId(value);setFields(prior=>{const {category:_category,...rest}=prior;return rest;});}
        else requestDiscard(()=>{setModuleId(value);setPage(1);setShowForm(false);setPendingUploads(false);setPreview(null);setDeleting(null);});
      }}>{modules.map(item=><option key={item.kind+item.slug} value={item.kind+':'+(item.slug || '')}>{item.label}</option>)}</select></label>}
      {!showForm && <><label className={styles.field}>Status<select value={publication} disabled={working} onChange={event=>{setPublication(event.target.value);setPage(1);}}><option value="">All content</option><option value="published">Published</option><option value="draft">Unpublished</option><option value="archived">Archived</option></select></label>
        <Input label="Search titles" type="search" maxLength={100} value={q} disabled={working} onChange={event=>{setQ(event.target.value);setPage(1);}} />
        <Button variant="secondary" disabled={working||loading} onClick={()=>setReload(value=>value+1)}><RefreshCw size={18} aria-hidden="true" />Refresh records</Button></>}
    </div>}
    {showForm?<form ref={formRef} className={styles.form} onSubmit={event=>void publish(event)} aria-busy={working}>
      <fieldset className={styles.fields} disabled={locked}>
        <div className={styles.wide}><Input label={module.titleLabel || 'Title'} name="title" required maxLength={200} value={title} error={validation.title} onChange={event=>setTitle(event.target.value)} /></div>
        <EditorFields definitions={module.fields.filter(field=>!field.advanced && field.options?.length!==1)} values={fields} errors={validation} onChange={setFields}/>
        {module.kind==='organizational_chart' && <OfficialEditor chart value={(fields.nodes || []) as OfficialEntry[]} attachments={attachments.filter(item=>photoIds.includes(item.assetId))} errors={validation} onChange={nodes=>setFields({...fields,nodes})}/>}
        {module.kind==='departments' && <OfficialEditor value={(fields.officials || []) as OfficialEntry[]} attachments={attachments.filter(item=>photoIds.includes(item.assetId))} errors={validation} onChange={officials=>setFields({...fields,officials})}/>}
        {module.fields.some(field=>field.advanced) && <details className={styles.wide} open={module.fields.some(field=>field.advanced && validation[field.key]) || undefined}><summary>Additional details (optional)</summary><div className={styles.fields}><EditorFields definitions={module.fields.filter(field=>field.advanced)} values={fields} errors={validation} onChange={setFields}/></div></details>}
      </fieldset>
      <DraftMediaPanel key={moduleId+':'+session} sourceId={source} title={title} kind={module.kind} attachments={attachments} featured={featured} onAttach={addAttachment} onAttachmentsChange={changeAttachments} onFeaturedChange={setFeatured} onPhotosChange={setPhotoIds} busy={busy || uncertain} onBusyChange={setUploadBusy} onPendingChange={setPendingUploads} fieldErrors={validation}/>
      {source && <p className={styles.hint}>The existing supporting evidence is retained with this record. Add supporting documents using the attachments above.</p>}
      <p className={styles.hint}>Publication date and time are set automatically when you publish.</p>
      {uncertain && <p role="status" className={styles.notice}>We could not confirm publication. Retry to check and finish this same submission.</p>}
      {conflict && editing && <p className={styles.notice}>Reload the latest record before publishing your changes. <Button variant="secondary" disabled={working} onClick={()=>requestDiscard(()=>void act(async()=>{const result=await staffRequest<{data:ContentRow[]}>('/api/admin/content/'+module.kind+'/'+editing.id+'/preview');if(!result.data.length)throw new StaffRequestError(404);edit(result.data[0]);}))}>Reload record</Button></p>}
      <EditorActions busy={working} blocked={pendingUploads} retrying={uncertain} onPreview={previewForm} onCancel={cancel}/>
    </form>:<div>
      {loading?<CmsSkeleton label="Loading municipal records" rows={3}/>:!loadError&&!rows.length?<div className={styles.empty}><p>No content found.</p><Button variant="secondary" onClick={()=>{clear();setShowForm(true);}}><Plus size={18} aria-hidden="true" />Create a record</Button></div>:!loadError&&<ul className={styles.list}>{rows.map(row=><li key={row.id} className={styles.row}>
        <div className={styles.rowHeading}><h3>{row.title}</h3><span className={styles.badge}>{statusLabels[row.publication]}</span></div><p>{row.publication==='published' && row.published_at?'Published '+new Date(row.published_at).toLocaleString():'Updated '+new Date(row.updated_at).toLocaleString()}</p><div className={styles.actions}>
          {row.publication==='published' && <CmsLink href={publicContentHref(row)}>View on website</CmsLink>}
          <Button variant="secondary" disabled={working} onClick={()=>setPreview(row)}><Eye size={18} aria-hidden="true" />Preview</Button>
          {row.publication!=='archived' && <Button variant="secondary" disabled={working} onClick={()=>edit(row)}><Pencil size={18} aria-hidden="true" />Edit</Button>}
          {row.publication==='published' && <Button variant="secondary" disabled={working} onClick={()=>void change(row,'unpublish')}>Unpublish</Button>}
          {row.publication==='archived'?<Button variant="secondary" disabled={working} onClick={()=>void change(row,'restore')}>Restore for editing</Button>:<Button variant="secondary" disabled={working} onClick={()=>void change(row,'archive')}>Archive</Button>}
          {role==='admin' && <Button variant="danger" disabled={working} onClick={()=>{setDeleting(row);setCode('');}}><Trash2 size={18} aria-hidden="true" />Delete</Button>}
        </div></li>)}</ul>}
      {loadError && <Button variant="secondary" disabled={working||loading} onClick={()=>setReload(value=>value+1)}>Retry records</Button>}
      <div className={styles.pagination}><span>Page {page} of {Math.max(1,pages)}</span><div className={styles.actions}><Button variant="secondary" disabled={working||loading||page===1} onClick={()=>setPage(value=>value-1)}>Previous page</Button><Button variant="secondary" disabled={working||loading||page>=pages} onClick={()=>setPage(value=>value+1)}>Next page</Button></div></div>
    </div>}
    {preview && <Modal open title="Preview" onClose={()=>setPreview(null)}><ContentPreview row={preview} onClose={()=>setPreview(null)}/></Modal>}
    {deleting && <Modal open title="Delete content?" onClose={()=>{if(!working)setDeleting(null);}}><p>{deleting.title}</p><p>Content will leave the website. Audit history and private attachments are retained.</p>{error && <ErrorNotice message={error} fields={validation}/>}<Input label="Deletion authenticator code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={event=>setCode(event.target.value)}/><div className={styles.editorActions}><Button variant="danger" disabled={working||!/^\d{6}$/.test(code)} onClick={()=>void act(async()=>{const value=code;setCode('');await staffRequest('/api/staff-auth/two-factor/verify-totp',{code:value});await staffRequest('/api/admin/content/'+deleting.kind+'/'+deleting.id+'/delete',{version:deleting.version});setDeleting(null);setMessage('Content deleted.');})}>Confirm deletion</Button><Button variant="secondary" disabled={working} onClick={()=>setDeleting(null)}>Keep record</Button></div></Modal>}
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
    {Array.isArray(row.body.nodes) && <ReportingChart privatePreview nodes={row.body.nodes as OfficialEntry[]}/>}
    {Array.isArray(row.body.officials) && <div><strong>Officials</strong>{(row.body.officials as OfficialEntry[]).map(official=><div key={official.id}><p>{official.name}</p><p>{official.role}</p>{official.office && <p>{official.office}</p>}</div>)}</div>}
    {Object.entries(row.body).filter(([key])=>!['attachments','featuredAssetId','nodes','officials'].includes(key)).map(([key,value])=><div key={key}><strong>{definitions.find(field=>field.key===key)?.label || key.replace(/_/g,' ')}</strong><PreviewValue value={value}/></div>)}
    {row.body.attachments?.map(item=><div key={item.assetId}><a href={`/api/admin/media/${item.assetId}/download`}>{item.caption}</a>{media[item.assetId]?.kind==='photo' && <img src={`/api/admin/media/${item.assetId}/preview`} alt={item.altText || media[item.assetId]!.alt_text}/>}{Object.hasOwn(media,item.assetId) && !media[item.assetId] && <p className={styles.hint}>Attachment unavailable.</p>}</div>)}
    <Button variant="secondary" onClick={onClose}>Close preview</Button>
  </section>;
}
