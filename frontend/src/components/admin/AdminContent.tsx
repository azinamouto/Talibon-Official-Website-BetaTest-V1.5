import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { staffRequest } from '../../contexts/StaffAuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { municipalModules, type Attachment, type ContentRow, type ContentSource, type MunicipalGroup } from './municipalModules';
import type { Asset } from './AdminMedia';
import DraftMediaPanel from './DraftMediaPanel';
import { CmsLink, CmsSkeleton, ErrorNotice, ReviewedSelect } from './CmsControls';
import { errorFields, fieldMessages, StaffRequestError } from '../../lib/staffErrors';
import { useCmsEditor, type EditorState } from '../../hooks/useCmsEditor';
import styles from './AdminContent.module.css';

type Official={name:string;role:string};
const groups: Record<MunicipalGroup,string>={news:'News & Updates',tourism:'Tourism',transparency:'Transparency',government:'Local Government',galleries:'Galleries',downloadables:'Downloadables'};
export default function AdminContent({role,group,onEditorStateChange}: {role:'admin'|'editor';group:MunicipalGroup;onEditorStateChange?(state:EditorState):void}) {
  const modules=municipalModules.filter(item=>item.group===group);
  const [moduleId,setModuleId]=useState(modules[0].kind+':'+(modules[0].slug || ''));
  const module=modules.find(item=>item.kind+':'+(item.slug || '')===moduleId) || modules[0];
  const [rows,setRows]=useState<ContentRow[]>([]),[sources,setSources]=useState<ContentSource[]>([]);
  const [page,setPage]=useState(1),[pages,setPages]=useState(0),[q,setQ]=useState(''),[publication,setPublication]=useState('');
  const [editing,setEditing]=useState<ContentRow|null>(null),[showForm,setShowForm]=useState(false);
  const [title,setTitle]=useState(''),[slug,setSlug]=useState(module.slug || ''),[source,setSource]=useState('');
  const [fields,setFields]=useState<Record<string,unknown>>({});
  const [attachments,setAttachments]=useState<Attachment[]>([]),[featured,setFeatured]=useState('');
  const [uploadBusy,setUploadBusy]=useState(false),[pendingUploads,setPendingUploads]=useState(false),[baseline,setBaseline]=useState(''),[session,setSession]=useState(0);
  const [preview,setPreview]=useState<ContentRow|null>(null),[deleting,setDeleting]=useState<ContentRow|null>(null),[code,setCode]=useState('');
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[message,setMessage]=useState(''),[reload,setReload]=useState(0);
  const [loadError,setLoadError]=useState('');
  const [validation,setValidation]=useState<Record<string,string>>({});
  const working=busy || uploadBusy;
  const dirty=showForm && (pendingUploads || JSON.stringify({title,slug,source,fields,attachments,featured})!==baseline);
  const {requestDiscard,dialog}=useCmsEditor(dirty,working,onEditorStateChange);
  const load=useCallback(async()=>{
    const params=new URLSearchParams({page:String(page),limit:'20',...(q?{q}:{}),...(publication?{publication}:{}),...(module.slug?{slug:module.slug}:{})});
    const [result,options]=await Promise.all([
      staffRequest<{data:ContentRow[];pagination:{totalPages:number}}>(`/api/admin/content/${module.kind}?${params}`),
      staffRequest<{data:ContentSource[]}>('/api/admin/content/sources'),
    ]);
    return {result,options};
  },[module.kind,module.slug,page,q,publication]);
  useEffect(()=>{
    let current=true;setLoading(true);setLoadError('');
    void load().then(({result,options})=>{if(current){setRows(result.data);setPages(result.pagination.totalPages);setSources(options.data);}})
      .catch(reason=>{if(current)setLoadError((reason as Error).message);}).finally(()=>{if(current)setLoading(false);});
    return ()=>{current=false;};
  },[load,reload]);
  function clear() {
    const defaults=module.kind==='organizational_chart'?{mayor:{name:'',role:''},level2:[],departments:[]}:Object.fromEntries(module.fields.filter(f=>f.options).map(f=>[f.key,f.options![0]]));
    setEditing(null);setTitle('');setSlug(module.slug || '');setSource('');setFields(defaults);setAttachments([]);setFeatured('');setPreview(null);setPendingUploads(false);setValidation({});setSession(value=>value+1);
    setBaseline(JSON.stringify({title:'',slug:module.slug || '',source:'',fields:defaults,attachments:[],featured:''}));
  }
  function edit(row:ContentRow) {
    setEditing(row);setTitle(row.title);setSlug(row.slug);setSource(row.source_id);const {attachments:_attachments,featuredAssetId:_featured,...body}=row.body;
    const attached=row.body.attachments || [],photo=row.body.featuredAssetId || '';
    setFields(body);setAttachments(attached);setFeatured(photo);setShowForm(true);setPreview(null);setPendingUploads(false);setValidation({});setSession(value=>value+1);
    setBaseline(JSON.stringify({title:row.title,slug:row.slug,source:row.source_id,fields:body,attachments:attached,featured:photo}));
  }
  async function act(work:()=>Promise<void>) {if(working)return;setBusy(true);setError('');setValidation({});setMessage('');try{await work();setReload(value=>value+1);}catch(reason){setError((reason as Error).message);setValidation(errorFields(reason));}finally{setBusy(false);}}
  async function save(event:FormEvent) {
    event.preventDefault();
    if(pendingUploads){setError('Upload the queued files or remove them before saving this draft.');return;}
    await act(async()=>{
      const selected=sources.find(item=>item.id===source);
      if(!selected)throw new StaffRequestError(400,{sourceId:fieldMessages.source_missing});
      if(!selected.approved && (!!selected.reviewed_at || selected.approval_status==='rejected'))throw new StaffRequestError(400,{sourceId:fieldMessages.source_unapproved});
      const values=Object.fromEntries(Object.entries(fields).filter(([key,value])=>{const definition=module.fields.find(field=>field.key===key);return !definition || definition.required || value!=='';}));
      const body={...values,attachments,...(featured?{featuredAssetId:featured}:{})};
      await staffRequest(`/api/admin/content/${module.kind}${editing?`/${editing.id}/edit`:''}`,{title,slug,sourceId:source,body,...(editing?{version:editing.version}:{})});
      clear();setShowForm(false);setMessage('Draft saved. Preview and publish when ready.');
    });
  }
  async function change(row:ContentRow,action:string) {await act(async()=>{await staffRequest(`/api/admin/content/${row.kind}/${row.id}/${action}`,{version:row.version});setPreview(null);setMessage(`Content ${action==='publish'?'published':action==='unpublish'?'returned to draft':action==='restore'?'restored to draft':'archived'}.`);});}
  function addAttachment(asset:Asset) {setAttachments(prior=>prior.some(item=>item.assetId===asset.id) || prior.length>=50?prior:[...prior,{assetId:asset.id,caption:asset.title,altText:asset.alt_text || ''}]);}
  const chart=(key:string,label:string,single=false)=>{
    const values=single?[((fields[key] || {name:'',role:''}) as Official)]:((fields[key] || []) as Official[]);
    return <section className={styles.wide}><h4>{label}</h4>{values.map((official,index)=><div key={index} className={styles.chartRow}>
      {(['name','role'] as const).map(part=>{const field=`${key}${single?'':`.${index}`}.${part}`;return <Input key={part} label={`${label} ${index+1} ${part}`} name={field} error={validation[field]} required maxLength={200} value={official[part]} onChange={event=>{const updated=values.map((entry,i)=>i===index?{...entry,[part]:event.target.value}:entry);setFields({...fields,[key]:single?updated[0]:updated});}} />;})}
      {!single && <Button type="button" variant="secondary" onClick={()=>setFields({...fields,[key]:values.filter((_,i)=>i!==index)})}>Remove entry</Button>}
    </div>)}{!single && <Button type="button" variant="secondary" disabled={values.length>=100} onClick={()=>setFields({...fields,[key]:[...values,{name:'',role:''}]})}>Add {label.toLowerCase()} entry</Button>}</section>;
  };
  return <section className={styles.root} aria-label={groups[group]}>
    <div className={styles.heading}><div><h2>{groups[group]}</h2><p>{group==='transparency'?'Official reports require a verified, published PDF attachment.':'Prepare accurate municipal content, preview private drafts and publish reviewed records.'}</p></div><Button disabled={working||loading} onClick={()=>requestDiscard(()=>{clear();setShowForm(true);})}>New draft</Button></div>
    {(error || loadError) && <ErrorNotice message={error || loadError} fields={error?validation:{}} />}{message && <p role="status" className={styles.notice}>{message}</p>}
    <div className={styles.toolbar}>
      <label className={styles.field}>Section<select value={moduleId} disabled={working} onChange={event=>{const value=event.target.value;requestDiscard(()=>{setModuleId(value);setPage(1);setShowForm(false);setPendingUploads(false);setPreview(null);setDeleting(null);});}}>{modules.map(item=><option key={item.kind+item.slug} value={item.kind+':'+(item.slug || '')}>{item.label}</option>)}</select></label>
      <label className={styles.field}>Publication<select value={publication} disabled={working} onChange={event=>{setPublication(event.target.value);setPage(1);}}><option value="">All records</option><option value="draft">Drafts</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
      <Input label="Search titles" type="search" maxLength={100} value={q} disabled={working} onChange={event=>{setQ(event.target.value);setPage(1);}} />
      <Button variant="secondary" disabled={working||loading} onClick={()=>setReload(value=>value+1)}>Refresh records</Button>
    </div>
    <div className={showForm?styles.workspace:undefined}>
      {showForm && <form className={styles.form} onSubmit={event=>void save(event)} aria-busy={working}><h3>{editing?'Edit draft':'Create a draft'} · {module.label}</h3><p className={styles.hint}>Use official source material. Text is published as plain text.</p>
        <p className={styles.workflow}>Save draft → Preview → Publish attached files → Publish record</p>
        {dirty && <p role="status" className={styles.hint}>Unsaved changes{pendingUploads?' · Files are queued for upload':''}</p>}
        <fieldset className={styles.fields} disabled={working}>
          <Input label="Title" name="title" required maxLength={200} value={title} error={validation.title} onChange={event=>setTitle(event.target.value)} />
          <Input label="Public slug" name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={160} readOnly={!!module.slug} value={slug} error={validation.slug} hint="Use lowercase words separated by hyphens for the website address." onChange={event=>setSlug(event.target.value)} />
          <div className={styles.wide}><ReviewedSelect label="Source record" name="sourceId" allowPending choices={sources.map(item=>({...item,label:item.reference}))} disabled={working} value={source} error={validation.sourceId} onChange={setSource} hint="Approved sources can be published. Pending sources can be used for private drafts while an administrator reviews them." />{role==='admin' && <CmsLink className={styles.approvalLink} href="/cms?tab=sources">Open Source approvals</CmsLink>}</div>
          {!sources.length && <p className={`${styles.hint} ${styles.wide}`}>An administrator must register official source material in Source approvals.</p>}
          {module.fields.map(field=>{
            const id=`cms-${module.kind}-${field.key}`,props={id,name:field.key,required:field.required,'aria-invalid':!!validation[field.key],'aria-describedby':validation[field.key]?`${id}-error`:undefined};
            return <div key={field.key} className={`${styles.field} ${field.multiline?styles.wide:''}`}><label htmlFor={id}>{field.label}</label>
              {field.options?<select {...props} value={String(fields[field.key] || '')} onChange={event=>setFields({...fields,[field.key]:event.target.value})}><option value="">Choose {field.label.toLowerCase()}</option>{field.options.map(option=><option key={option}>{option}</option>)}</select>:field.multiline?<textarea {...props} maxLength={field.max} rows={field.key==='content'?12:4} value={String(fields[field.key] || '')} onChange={event=>setFields({...fields,[field.key]:event.target.value})} />:<input {...props} type={field.type || 'text'} maxLength={field.max || 500} value={String(fields[field.key] || '')} onChange={event=>setFields({...fields,[field.key]:event.target.value})} />}
              {validation[field.key] && <span id={`${id}-error`} className={styles.fieldError}>{validation[field.key]}</span>}
            </div>;
          })}
          {module.kind==='organizational_chart' && <>{chart('mayor','Executive leader',true)}{chart('level2','Second level')}{chart('departments','Department')}</>}
        </fieldset>
        <DraftMediaPanel key={`${moduleId}:${session}`} sourceId={source} role={role} kind={module.kind} attachments={attachments} featured={featured} onAttach={addAttachment} onAttachmentsChange={setAttachments} onFeaturedChange={setFeatured} busy={busy} onBusyChange={setUploadBusy} onPendingChange={setPendingUploads} fieldErrors={validation} />
        {pendingUploads && <p className={styles.hint}>Upload the queued files or remove them before saving. Uploaded attachments are kept when you save this draft.</p>}
        <div className={styles.actions}><Button type="submit" busy={working} disabled={!sources.length || pendingUploads}>Save draft</Button><Button type="button" variant="secondary" disabled={working} onClick={()=>requestDiscard(()=>{clear();setShowForm(false);})}>Close editor</Button></div>
      </form>}
      <div><h3>{module.label}</h3>{loading?<CmsSkeleton label="Loading municipal records" rows={3} />:!loadError&&!rows.length?<div className={styles.empty}><p>No records found. Create a draft from verified official material.</p><Button variant="secondary" disabled={working} onClick={()=>requestDiscard(()=>{clear();setShowForm(true);})}>Create a draft</Button></div>:!loadError&&<ul className={styles.list}>{rows.map(row=><li key={row.id} className={styles.row}><div className={styles.rowHeading}><h3>{row.title}</h3><span className={styles.badge}>{row.publication}</span></div><p>{row.slug} · Version {row.version} · {new Date(row.updated_at).toLocaleString()}</p><div className={styles.actions}>
        <Button variant="secondary" disabled={working} onClick={()=>void act(async()=>{const result=await staffRequest<{data:ContentRow[]}>(`/api/admin/content/${row.kind}/${row.id}/preview`);setPreview(result.data[0] || null);})}>Preview</Button>
        {row.publication==='draft' && <><Button variant="secondary" disabled={working} onClick={()=>requestDiscard(()=>edit(row))}>Edit draft</Button><Button disabled={working||dirty} onClick={()=>void change(row,'publish')}>Publish</Button></>}
        {row.publication==='published' && <Button variant="secondary" disabled={working} onClick={()=>void change(row,'unpublish')}>Unpublish to edit</Button>}
        {row.publication==='archived'?<Button variant="secondary" disabled={working} onClick={()=>void change(row,'restore')}>Restore draft</Button>:<Button variant="secondary" disabled={working} onClick={()=>void change(row,'archive')}>Archive</Button>}
        {role==='admin' && <Button variant="danger" disabled={working} onClick={()=>{setDeleting(row);setCode('');}}>Delete</Button>}
      </div></li>)}</ul>}
      <div className={styles.pagination}><span>Page {page} of {Math.max(1,pages)}</span><div className={styles.actions}><Button variant="secondary" disabled={working||loading||page===1} onClick={()=>setPage(value=>value-1)}>Previous page</Button><Button variant="secondary" disabled={working||loading||page>=pages} onClick={()=>setPage(value=>value+1)}>Next page</Button></div></div>
      {preview && <ContentPreview row={preview} onClose={()=>setPreview(null)} />}
      {deleting && <section className={styles.preview} aria-label="Confirm content deletion"><h3>Delete {deleting.title}?</h3><p>The record will leave the website and CMS listings. Audit history and private attachments are retained.</p><Input label="Deletion authenticator code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={event=>setCode(event.target.value)} /><div className={styles.actions}><Button variant="danger" disabled={working||!/^\d{6}$/.test(code)} onClick={()=>void act(async()=>{const value=code;setCode('');await staffRequest('/api/staff-auth/two-factor/verify-totp',{code:value});await staffRequest(`/api/admin/content/${deleting.kind}/${deleting.id}/delete`,{version:deleting.version});setDeleting(null);setPreview(null);setMessage('Content deleted.');})}>Confirm deletion</Button><Button variant="secondary" disabled={working} onClick={()=>setDeleting(null)}>Keep record</Button></div></section>}
      </div>
    </div>
    {dialog}
  </section>;
}
function ContentPreview({row,onClose}:{row:ContentRow;onClose():void}) {
  const [media,setMedia]=useState<Record<string,Asset|null>>({});
  const ids=(row.body.attachments || []).map(item=>item.assetId).join(',');
  useEffect(()=>{
    let current=true;setMedia({});if(!ids)return;
    void Promise.allSettled(ids.split(',').map(id=>staffRequest<Asset>(`/api/admin/media/${id}`))).then(results=>{if(current)setMedia(Object.fromEntries(results.map((result,index)=>[ids.split(',')[index],result.status==='fulfilled' && result.value?.id?result.value:null])));});
    return()=>{current=false;};
  },[ids,row.version]);
  return <section className={styles.preview} aria-label="Private content preview"><span className={styles.badge}>Private preview · {row.publication}</span><h3>{row.title}</h3>
    {row.body.featuredAssetId && <img src={`/api/admin/media/${row.body.featuredAssetId}/preview`} alt={row.body.attachments?.find(item=>item.assetId===row.body.featuredAssetId)?.altText || row.title} />}
    {Object.entries(row.body).filter(([key])=>!['attachments','featuredAssetId'].includes(key)).map(([key,value])=><div key={key}><strong>{key.replace(/_/g,' ')}</strong>{typeof value==='string'?<p>{value}</p>:<p>{Array.isArray(value)?value.map(entry=>`${entry.name}: ${entry.role}`).join('\n'):(value && typeof value==='object'?`${(value as Official).name}: ${(value as Official).role}`:'')}</p>}</div>)}
    {row.body.attachments?.map(item=><div key={item.assetId}><a href={`/api/admin/media/${item.assetId}/download`}>{item.caption}</a>{media[item.assetId]?.kind==='photo' && <img src={`/api/admin/media/${item.assetId}/preview`} alt={item.altText || media[item.assetId]!.alt_text} />}{!Object.hasOwn(media,item.assetId)?<CmsSkeleton label="Loading preview attachment" rows={1} />:!media[item.assetId] && <p className={styles.hint}>This attachment is unavailable. Refresh the library before publishing.</p>}</div>)}
    <Button variant="secondary" onClick={onClose}>Close preview</Button>
  </section>;
}
