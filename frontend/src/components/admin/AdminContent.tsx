import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { staffRequest } from '../../contexts/StaffAuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { municipalModules, type Attachment, type ContentRow, type ContentSource, type MunicipalGroup } from './municipalModules';
import type { Asset } from './AdminMedia';
import styles from './AdminContent.module.css';

type Official={name:string;role:string};
const groups: Record<MunicipalGroup,string>={news:'News & Updates',tourism:'Tourism',transparency:'Transparency',government:'Local Government',galleries:'Galleries',downloadables:'Downloadables'};
export default function AdminContent({role,group}: {role:'admin'|'editor';group:MunicipalGroup}) {
  const modules=municipalModules.filter(item=>item.group===group);
  const [moduleId,setModuleId]=useState(modules[0].kind+':'+(modules[0].slug || ''));
  const module=modules.find(item=>item.kind+':'+(item.slug || '')===moduleId) || modules[0];
  const [rows,setRows]=useState<ContentRow[]>([]),[sources,setSources]=useState<ContentSource[]>([]);
  const [page,setPage]=useState(1),[pages,setPages]=useState(0),[q,setQ]=useState(''),[publication,setPublication]=useState('');
  const [editing,setEditing]=useState<ContentRow|null>(null),[showForm,setShowForm]=useState(false);
  const [title,setTitle]=useState(''),[slug,setSlug]=useState(module.slug || ''),[source,setSource]=useState('');
  const [fields,setFields]=useState<Record<string,unknown>>({});
  const [attachments,setAttachments]=useState<Attachment[]>([]),[featured,setFeatured]=useState('');
  const [assets,setAssets]=useState<Asset[]>([]),[mediaPage,setMediaPage]=useState(1),[mediaMore,setMediaMore]=useState(false),[selectedAsset,setSelectedAsset]=useState('');
  const [preview,setPreview]=useState<ContentRow|null>(null),[deleting,setDeleting]=useState<ContentRow|null>(null),[code,setCode]=useState('');
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[message,setMessage]=useState(''),[reload,setReload]=useState(0);
  const load=useCallback(async()=>{
    const params=new URLSearchParams({page:String(page),limit:'20',...(q?{q}:{}),...(publication?{publication}:{}),...(module.slug?{slug:module.slug}:{})});
    const [result,options]=await Promise.all([
      staffRequest<{data:ContentRow[];pagination:{totalPages:number}}>(`/api/admin/content/${module.kind}?${params}`),
      staffRequest<{data:ContentSource[]}>('/api/admin/content/sources'),
    ]);
    return {result,options};
  },[module.kind,module.slug,page,q,publication]);
  useEffect(()=>{
    let current=true;setLoading(true);setError('');
    void load().then(({result,options})=>{if(current){setRows(result.data);setPages(result.pagination.totalPages);setSources(options.data);}})
      .catch(reason=>{if(current)setError((reason as Error).message);}).finally(()=>{if(current)setLoading(false);});
    return ()=>{current=false;};
  },[load,reload]);
  useEffect(()=>{
    if (!showForm) return;
    let current=true;
    void staffRequest<{data:Asset[];hasMore:boolean}>(`/api/admin/media?page=${mediaPage}`).then(result=>{
      if(current){setAssets(result.data.filter(item=>item.processing==='ready'));setMediaMore(result.hasMore);}
    }).catch(reason=>{if(current)setError((reason as Error).message);});
    return ()=>{current=false;};
  },[mediaPage,showForm]);
  function clear() {setEditing(null);setTitle('');setSlug(module.slug || '');setSource('');setFields(module.kind==='organizational_chart'?{mayor:{name:'',role:''},level2:[],departments:[]}:Object.fromEntries(module.fields.filter(f=>f.options).map(f=>[f.key,f.options![0]])));setAttachments([]);setFeatured('');setPreview(null);setSelectedAsset('');}
  function edit(row:ContentRow) {setEditing(row);setTitle(row.title);setSlug(row.slug);setSource(row.source_id);const {attachments:_attachments,featuredAssetId:_featured,...body}=row.body;setFields(body);setAttachments(row.body.attachments || []);setFeatured(row.body.featuredAssetId || '');setShowForm(true);setPreview(null);}
  async function act(work:()=>Promise<void>) {setBusy(true);setError('');setMessage('');try{await work();setReload(value=>value+1);}catch(reason){setError((reason as Error).message);}finally{setBusy(false);}}
  async function save(event:FormEvent) {
    event.preventDefault();
    await act(async()=>{
      const body={...fields,attachments,...(featured?{featuredAssetId:featured}:{})};
      await staffRequest(`/api/admin/content/${module.kind}${editing?`/${editing.id}/edit`:''}`,{title,slug,sourceId:source,body,...(editing?{version:editing.version}:{})});
      clear();setShowForm(false);setMessage('Draft saved. Preview and publish when ready.');
    });
  }
  async function change(row:ContentRow,action:string) {await act(async()=>{await staffRequest(`/api/admin/content/${row.kind}/${row.id}/${action}`,{version:row.version});setPreview(null);setMessage(`Content ${action==='publish'?'published':action==='unpublish'?'returned to draft':action==='restore'?'restored to draft':'archived'}.`);});}
  function addAttachment() {const asset=assets.find(a=>a.id===selectedAsset);if(!asset || attachments.some(a=>a.assetId===asset.id))return;setAttachments([...attachments,{assetId:asset.id,caption:asset.title,altText:asset.alt_text || ''}]);setSelectedAsset('');}
  const chart=(key:string,label:string,single=false)=>{
    const values=single?[((fields[key] || {name:'',role:''}) as Official)]:((fields[key] || []) as Official[]);
    return <section className={styles.wide}><h4>{label}</h4>{values.map((official,index)=><div key={index} className={styles.chartRow}>
      {(['name','role'] as const).map(part=><Input key={part} label={`${label} ${index+1} ${part}`} required maxLength={200} value={official[part]} onChange={event=>{const updated=values.map((entry,i)=>i===index?{...entry,[part]:event.target.value}:entry);setFields({...fields,[key]:single?updated[0]:updated});}} />)}
      {!single && <Button type="button" variant="secondary" onClick={()=>setFields({...fields,[key]:values.filter((_,i)=>i!==index)})}>Remove entry</Button>}
    </div>)}{!single && <Button type="button" variant="secondary" disabled={values.length>=100} onClick={()=>setFields({...fields,[key]:[...values,{name:'',role:''}]})}>Add {label.toLowerCase()} entry</Button>}</section>;
  };
  return <section className={styles.root} aria-label={groups[group]}>
    <div className={styles.heading}><div><h2>{groups[group]}</h2><p>{group==='transparency'?'Official reports require a verified, published PDF attachment.':'Prepare accurate municipal content, preview private drafts and publish reviewed records.'}</p></div><Button disabled={busy||loading} onClick={()=>{clear();setShowForm(true);}}>New draft</Button></div>
    {error && <p role="alert" className={styles.error}>{error}</p>}{message && <p role="status" className={styles.notice}>{message}</p>}
    <div className={styles.toolbar}>
      <label className={styles.field}>Section<select value={moduleId} disabled={busy} onChange={event=>{setModuleId(event.target.value);setPage(1);setShowForm(false);setPreview(null);setDeleting(null);}}>{modules.map(item=><option key={item.kind+item.slug} value={item.kind+':'+(item.slug || '')}>{item.label}</option>)}</select></label>
      <label className={styles.field}>Publication<select value={publication} disabled={busy} onChange={event=>{setPublication(event.target.value);setPage(1);}}><option value="">All records</option><option value="draft">Drafts</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
      <Input label="Search titles" type="search" maxLength={100} value={q} disabled={busy} onChange={event=>{setQ(event.target.value);setPage(1);}} />
      <Button variant="secondary" disabled={busy||loading} onClick={()=>setReload(value=>value+1)}>Refresh records</Button>
    </div>
    <div className={showForm?styles.workspace:undefined}>
      {showForm && <form className={styles.form} onSubmit={event=>void save(event)}><h3>{editing?'Edit draft':'Create a draft'} · {module.label}</h3><p className={styles.hint}>Use official source material. Text is published as plain text.</p>
        <fieldset className={styles.fields} disabled={busy}>
          <Input label="Title" required maxLength={200} value={title} onChange={event=>setTitle(event.target.value)} />
          <Input label="Public slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={160} readOnly={!!module.slug} value={slug} onChange={event=>setSlug(event.target.value)} />
          <label className={`${styles.field} ${styles.wide}`}>Source record<select required value={source} onChange={event=>setSource(event.target.value)}><option value="">Choose official source material</option>{sources.map(item=><option key={item.id} value={item.id}>{item.reference} · {item.approved?'Approved':'Awaiting administrator review'}</option>)}</select></label>
          {!sources.length && <p className={`${styles.hint} ${styles.wide}`}>An administrator must register official source material in Source approvals.</p>}
          {module.fields.map(field=><label key={field.key} className={`${styles.field} ${field.multiline?styles.wide:''}`}>{field.label}
            {field.options?<select required={field.required} value={String(fields[field.key] || '')} onChange={event=>setFields({...fields,[field.key]:event.target.value})}><option value="">Choose {field.label.toLowerCase()}</option>{field.options.map(option=><option key={option}>{option}</option>)}</select>:field.multiline?<textarea required={field.required} maxLength={field.max} rows={field.key==='content'?12:4} value={String(fields[field.key] || '')} onChange={event=>setFields({...fields,[field.key]:event.target.value})} />:<input type={field.type || 'text'} required={field.required} maxLength={field.max || 500} value={String(fields[field.key] || '')} onChange={event=>setFields({...fields,[field.key]:event.target.value})} />}
          </label>)}
          {module.kind==='organizational_chart' && <>{chart('mayor','Executive leader',true)}{chart('level2','Second level')}{chart('departments','Department')}</>}
        </fieldset>
        <section className={styles.attachments} aria-label="Media attachments"><h4>Media library attachments</h4><p className={styles.hint}>Upload files in Photos or Documents. Attached files must be published before this record can be published.</p>
          <div className={styles.picker}><label className={styles.field}>Library page {mediaPage}<select value={selectedAsset} disabled={busy} onChange={event=>setSelectedAsset(event.target.value)}><option value="">Choose a ready file</option>{assets.filter(a=>module.kind!=='galleries'||a.kind==='photo').map(asset=><option key={asset.id} value={asset.id}>{asset.title} · {asset.kind} · {asset.publication}</option>)}</select></label><Button type="button" variant="secondary" disabled={!selectedAsset||busy||attachments.length>=50} onClick={addAttachment}>Attach file</Button></div>
          <div className={styles.actions}><Button type="button" variant="secondary" disabled={busy||mediaPage===1} onClick={()=>{setMediaPage(value=>value-1);setSelectedAsset('');}}>Previous library page</Button><Button type="button" variant="secondary" disabled={busy||!mediaMore} onClick={()=>{setMediaPage(value=>value+1);setSelectedAsset('');}}>Next library page</Button></div>
          <label className={styles.field}>Featured photo<select value={featured} disabled={busy} onChange={event=>setFeatured(event.target.value)}><option value="">No featured photo</option>{featured && !assets.some(a=>a.id===featured) && <option value={featured}>Current featured photo</option>}{assets.filter(a=>a.kind==='photo').map(asset=><option key={asset.id} value={asset.id}>{asset.title}</option>)}</select></label>
          {attachments.map((attachment,index)=><div key={attachment.assetId} className={styles.attachment}><Input label={`Attachment ${index+1} caption`} required maxLength={1000} disabled={busy} value={attachment.caption} onChange={event=>setAttachments(attachments.map((a,i)=>i===index?{...a,caption:event.target.value}:a))} /><Input label={`Attachment ${index+1} alternative text (photos)`} maxLength={500} disabled={busy} value={attachment.altText} onChange={event=>setAttachments(attachments.map((a,i)=>i===index?{...a,altText:event.target.value}:a))} /><Button type="button" variant="secondary" disabled={busy} onClick={()=>setAttachments(attachments.filter((_,i)=>i!==index))}>Remove file</Button></div>)}
        </section>
        <div className={styles.actions}><Button type="submit" busy={busy} disabled={!sources.length}>Save draft</Button><Button type="button" variant="secondary" disabled={busy} onClick={()=>{clear();setShowForm(false);}}>Close editor</Button></div>
      </form>}
      <div><h3>{module.label}</h3>{loading?<p role="status">Loading municipal records…</p>:!error&&!rows.length?<p className={styles.empty}>No records found. Create a draft from verified official material.</p>:!error&&<ul className={styles.list}>{rows.map(row=><li key={row.id} className={styles.row}><div className={styles.rowHeading}><h3>{row.title}</h3><span className={styles.badge}>{row.publication}</span></div><p>{row.slug} · Version {row.version} · {new Date(row.updated_at).toLocaleString()}</p><div className={styles.actions}>
        <Button variant="secondary" disabled={busy} onClick={()=>void act(async()=>{const result=await staffRequest<{data:ContentRow[]}>(`/api/admin/content/${row.kind}/${row.id}/preview`);setPreview(result.data[0] || null);})}>Preview</Button>
        {row.publication==='draft' && <><Button variant="secondary" disabled={busy} onClick={()=>edit(row)}>Edit draft</Button><Button disabled={busy} onClick={()=>void change(row,'publish')}>Publish</Button></>}
        {row.publication==='published' && <Button variant="secondary" disabled={busy} onClick={()=>void change(row,'unpublish')}>Unpublish to edit</Button>}
        {row.publication==='archived'?<Button variant="secondary" disabled={busy} onClick={()=>void change(row,'restore')}>Restore draft</Button>:<Button variant="secondary" disabled={busy} onClick={()=>void change(row,'archive')}>Archive</Button>}
        {role==='admin' && <Button variant="danger" disabled={busy} onClick={()=>{setDeleting(row);setCode('');}}>Delete</Button>}
      </div></li>)}</ul>}
      <div className={styles.pagination}><span>Page {page} of {Math.max(1,pages)}</span><div className={styles.actions}><Button variant="secondary" disabled={busy||loading||page===1} onClick={()=>setPage(value=>value-1)}>Previous page</Button><Button variant="secondary" disabled={busy||loading||page>=pages} onClick={()=>setPage(value=>value+1)}>Next page</Button></div></div>
      {preview && <ContentPreview row={preview} onClose={()=>setPreview(null)} />}
      {deleting && <section className={styles.preview} aria-label="Confirm content deletion"><h3>Delete {deleting.title}?</h3><p>The record will leave the website and CMS listings. Audit history and private attachments are retained.</p><Input label="Deletion authenticator code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={event=>setCode(event.target.value)} /><div className={styles.actions}><Button variant="danger" disabled={busy||!/^\d{6}$/.test(code)} onClick={()=>void act(async()=>{const value=code;setCode('');await staffRequest('/api/staff-auth/two-factor/verify-totp',{code:value});await staffRequest(`/api/admin/content/${deleting.kind}/${deleting.id}/delete`,{version:deleting.version});setDeleting(null);setPreview(null);setMessage('Content deleted.');})}>Confirm deletion</Button><Button variant="secondary" disabled={busy} onClick={()=>setDeleting(null)}>Keep record</Button></div></section>}
      </div>
    </div>
  </section>;
}
function ContentPreview({row,onClose}:{row:ContentRow;onClose():void}) {
  return <section className={styles.preview} aria-label="Private content preview"><span className={styles.badge}>Private preview · {row.publication}</span><h3>{row.title}</h3>
    {row.body.featuredAssetId && <img src={`/api/admin/media/${row.body.featuredAssetId}/preview`} alt={row.title} />}
    {Object.entries(row.body).filter(([key])=>!['attachments','featuredAssetId'].includes(key)).map(([key,value])=><div key={key}><strong>{key.replace(/_/g,' ')}</strong>{typeof value==='string'?<p>{value}</p>:<p>{Array.isArray(value)?value.map(entry=>`${entry.name}: ${entry.role}`).join('\n'):(value && typeof value==='object'?`${(value as Official).name}: ${(value as Official).role}`:'')}</p>}</div>)}
    {row.body.attachments?.map(item=><div key={item.assetId}><a href={`/api/admin/media/${item.assetId}/download`}>{item.caption}</a>{item.altText && <img src={`/api/admin/media/${item.assetId}/preview`} alt={item.altText} />}</div>)}
    <Button variant="secondary" onClick={onClose}>Close preview</Button>
  </section>;
}
