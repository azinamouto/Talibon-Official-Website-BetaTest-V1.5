import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical, Trash2 } from 'lucide-react';
import { staffRequest } from '../../contexts/StaffAuthContext';
import { errorFields } from '../../lib/staffErrors';
import { fileKind, simpleFilename, uploadPrivateMedia, validateUploadFile, type UploadMetadata, type UploadProgress } from '../../lib/mediaUpload';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { Asset } from './AdminMedia';
import type { Attachment } from './municipalModules';
import { CmsSkeleton, ErrorNotice, FileDropzone, MediaThumbnail, UploadIndicator } from './CmsControls';
import styles from './DraftMediaPanel.module.css';
type QueuedFile={id:string;file:File;auto:boolean;error?:string;fields?:Record<string,string>;attempt?:UploadMetadata};
export default function DraftMediaPanel({sourceId='',title='',kind,attachments,featured,onAttach,onAttachmentsChange,onFeaturedChange,onPhotosChange,busy,onBusyChange,onPendingChange,fieldErrors={}}:{
  sourceId?:string;title?:string;role?:'admin'|'editor';kind:string;attachments:Attachment[];featured:string;onAttach(asset:Asset):void;
  onAttachmentsChange(value:Attachment[]):void;onFeaturedChange(value:string):void;onPhotosChange?(ids:string[]):void;busy:boolean;onBusyChange(value:boolean):void;onPendingChange(value:boolean):void;fieldErrors?:Record<string,string>;
}) {
  const mediaKind=['downloadables','transparency_reports'].includes(kind)?'document' as const:['galleries','tourism_spots','tourism_delicacies','organizational_chart'].includes(kind)?'photo' as const:undefined;
  const [queue,setQueue]=useState<QueuedFile[]>([]),[uploading,setUploading]=useState(''),[progress,setProgress]=useState<UploadProgress|null>(null);
  const activeUpload=useRef(false);
  const [assets,setAssets]=useState<Asset[]>([]),[known,setKnown]=useState<Record<string,Asset|null>>({});
  const [page,setPage]=useState(1),[hasMore,setHasMore]=useState(false),[search,setSearch]=useState(''),[filter,setFilter]=useState(mediaKind || ''),[libraryOpen,setLibraryOpen]=useState(false);
  const [loading,setLoading]=useState(false),[libraryError,setLibraryError]=useState(''),[error,setError]=useState(''),[fields,setErrorFields]=useState<Record<string,string>>({}),[reload,setReload]=useState(0);
  const disabled=busy || !!uploading;
  useEffect(()=>{onPhotosChange?.(attachments.filter(item=>known[item.assetId]?.kind==='photo').map(item=>item.assetId));},[attachments,known,onPhotosChange]);
  useEffect(()=>{onPendingChange(queue.length>0);},[queue.length,onPendingChange]);
  useEffect(()=>{
    if(!libraryOpen)return;let current=true;setLoading(true);setLibraryError('');
    const timer=window.setTimeout(()=>{
      const params=new URLSearchParams({page:String(page),ready:'true',...(filter?{kind:filter}:{}),...(search?{q:search}:{})});
      void staffRequest<{data:Asset[];hasMore:boolean}>('/api/admin/media?'+params).then(result=>{
        if(!current)return;setAssets(result.data);setHasMore(result.hasMore);setKnown(prior=>({...prior,...Object.fromEntries(result.data.map(asset=>[asset.id,asset]))}));
      }).catch(reason=>{if(current)setLibraryError((reason as Error).message);}).finally(()=>{if(current)setLoading(false);});
    },search?250:0);
    return()=>{current=false;window.clearTimeout(timer);};
  },[libraryOpen,page,search,filter,reload]);
  const ids=[...new Set([...attachments.map(item=>item.assetId),...(featured?[featured]:[])])];
  const missing=ids.filter(id=>!Object.hasOwn(known,id)).join(',');
  useEffect(()=>{
    if(!missing)return;let current=true;
    void Promise.allSettled(missing.split(',').map(async id=>[id,await staffRequest<Asset>('/api/admin/media/'+id)] as const)).then(results=>{
      if(!current)return;setKnown(prior=>({...prior,...Object.fromEntries(results.map((result,index)=>result.status==='fulfilled' && result.value[1]?.id ? result.value : [missing.split(',')[index],null]))}));
    });return()=>{current=false;};
  },[missing,reload]);
  function choose(files:File[]) {
    setError('');setErrorFields({});const added:QueuedFile[]=[];
    for(const file of files) {
      try {validateUploadFile(file,mediaKind);} catch(reason){setError((reason as Error).message);setErrorFields(errorFields(reason));continue;}
      if([...queue,...added].some(item=>item.file.name===file.name && item.file.size===file.size && item.file.lastModified===file.lastModified))continue;
      if(attachments.length+queue.length+added.length>=50){setError('You can attach up to 50 files. Remove a file before adding another.');break;}
      added.push({id:crypto.randomUUID(),file,auto:true});
    }
    setQueue(prior=>[...prior,...added]);
  }
  async function upload(item:QueuedFile) {
    if(busy || activeUpload.current)return;
    activeUpload.current=true;
    const fileTitle=(item.file.name.replace(/\.[^.]+$/,'').trim() || 'Attachment').slice(0,200);
    const metadata=item.attempt || {title:fileTitle,description:'',altText:fileKind(item.file)==='photo'?(title.trim() || fileTitle).slice(0,500):'',...(sourceId?{sourceId}:{}),filename:simpleFilename(item.file.name)};
    setUploading(item.id);onBusyChange(true);setError('');setQueue(prior=>prior.map(entry=>entry.id===item.id?{...entry,auto:false,error:undefined,fields:{},attempt:metadata}:entry));
    try {
      const asset=await uploadPrivateMedia(item.file,metadata,item.id,setProgress);
      setKnown(prior=>({...prior,[asset.id]:asset}));onAttach(asset);setQueue(prior=>prior.filter(entry=>entry.id!==item.id));setReload(value=>value+1);
    } catch(reason) {
      setQueue(prior=>prior.map(entry=>entry.id===item.id?{...entry,error:(reason as Error).message,fields:errorFields(reason),attempt:metadata}:entry));
    } finally {activeUpload.current=false;setUploading('');setProgress(null);onBusyChange(false);}
  }
  useEffect(()=>{
    if(busy || activeUpload.current)return;
    const next=queue.find(item=>item.auto);if(next)void upload(next);
  },[queue,uploading,busy]);
  function reorder(from:number,to:number) {
    if(disabled || from<0 || to<0 || to>=attachments.length || from===to)return;
    const next=[...attachments];const [moved]=next.splice(from,1);next.splice(to,0,moved);onAttachmentsChange(next);
  }
  const publicationHint=mediaKind==='document'?'Attach a PDF to publish this document.':kind==='galleries'?'Add at least one photo to publish this album.':'Images and documents are optional.';
  return <section className={styles.root} aria-label="Media attachments">
    <div><h4>{mediaKind==='document'?'PDF attachment':mediaKind==='photo'?'Photos':'Images and documents'}</h4><p className={styles.hint}>{publicationHint} Selected files upload here and are published with the record.</p></div>
    {error && <ErrorNotice message={error} fields={fields}/>}
    {fieldErrors.attachments && <p className={styles.fieldError}>{fieldErrors.attachments}</p>}
    <FileDropzone label="Choose files" kind={mediaKind} multiple disabled={disabled || attachments.length+queue.length>=50} onFiles={choose}/>
    {queue.map((item,index)=><article key={item.id} className={styles.uploadCard} aria-label={'Selected file '+(index+1)}>
      <MediaThumbnail file={item.file}/><div className={styles.details}><h5>{item.file.name}</h5><p className={styles.hint}>{Math.ceil(item.file.size/1024)} KB</p>
        {item.error && <ErrorNotice message={item.error} fields={item.fields}/>}
        {uploading===item.id && progress && <UploadIndicator progress={progress}/>}
        {item.error && <p className={styles.hint}>Retry keeps this same file and upload to avoid duplicates.</p>}
        <div className={styles.actions}>{item.error && <Button type="button" disabled={disabled} onClick={()=>void upload(item)}>Retry upload</Button>}
          <Button type="button" variant="secondary" disabled={busy || uploading===item.id} onClick={()=>setQueue(prior=>prior.filter(entry=>entry.id!==item.id))}>Remove file</Button></div>
      </div>
    </article>)}
    <section aria-label="Attached files" className={styles.attached}><h4>Attached files ({attachments.length})</h4>
      {attachments.length>0 && <p role="status">{attachments.length} {attachments.length===1?'file':'files'} attached.</p>}
      {attachments.map((attachment,index)=>{
        const asset=known[attachment.assetId];
        return <article key={attachment.assetId} className={styles.attachmentCard} onDragOver={event=>{if(event.dataTransfer.types.includes('application/x-talgov-attachment'))event.preventDefault();}} onDrop={event=>{const id=event.dataTransfer.getData('application/x-talgov-attachment');if(!id)return;event.preventDefault();reorder(attachments.findIndex(item=>item.assetId===id),index);}}>
          {asset?<MediaThumbnail asset={asset}/>:!Object.hasOwn(known,attachment.assetId)?<CmsSkeleton label="Loading attachment details" rows={1}/>:<p className={styles.warning}>This file is unavailable. Refresh the files or remove the attachment.</p>}
          <div className={styles.details}><strong>{asset?.title || attachment.caption}</strong>{asset && <span className={styles.badge}>{asset.publication==='published'?'Published':'Ready to publish'}{featured===asset.id?' · Cover photo':''}</span>}
            <Input label={'Attachment '+(index+1)+' caption'} name={'attachments.'+index+'.caption'} required maxLength={1000} disabled={disabled} value={attachment.caption} error={fieldErrors['attachments.'+index+'.caption']} onChange={event=>onAttachmentsChange(attachments.map((entry,i)=>i===index?{...entry,caption:event.target.value}:entry))}/>
            {(!asset || asset.kind==='photo') && <Input label={'Attachment '+(index+1)+' photo description'} name={'attachments.'+index+'.altText'} required={asset?.kind==='photo'} maxLength={500} disabled={disabled} value={attachment.altText} error={fieldErrors['attachments.'+index+'.altText']} hint="Describe the photo for people using screen readers." onChange={event=>onAttachmentsChange(attachments.map((entry,i)=>i===index?{...entry,altText:event.target.value}:entry))}/>}
            <div className={styles.actions}>{asset && <a href={'/api/admin/media/'+asset.id+'/download'}>Preview / download</a>}
              <Button variant="secondary" draggable={!disabled} disabled={disabled} aria-label={'Drag attachment '+(index+1)} onDragStart={event=>event.dataTransfer.setData('application/x-talgov-attachment',attachment.assetId)}><GripVertical size={18} aria-hidden="true"/></Button>
              <Button variant="secondary" disabled={disabled || index===0} aria-label={'Move attachment '+(index+1)+' up'} onClick={()=>reorder(index,index-1)}><ArrowUp size={18} aria-hidden="true"/></Button>
              <Button variant="secondary" disabled={disabled || index===attachments.length-1} aria-label={'Move attachment '+(index+1)+' down'} onClick={()=>reorder(index,index+1)}><ArrowDown size={18} aria-hidden="true"/></Button>
              <Button type="button" variant="secondary" disabled={disabled} onClick={()=>{onAttachmentsChange(attachments.filter((_,i)=>i!==index));if(featured===attachment.assetId)onFeaturedChange('');}}><Trash2 size={18} aria-hidden="true"/>Remove file</Button>
            </div>
          </div>
        </article>;
      })}
      {mediaKind!=='document' && kind!=='organizational_chart' && attachments.length>0 && <label className={styles.field}>Cover photo<select name="featuredAssetId" value={featured} disabled={disabled} aria-invalid={!!fieldErrors.featuredAssetId} onChange={event=>onFeaturedChange(event.target.value)}><option value="">No cover photo</option>{ids.filter(id=>known[id]?.kind==='photo').map(id=><option key={id} value={id}>{known[id]!.title}</option>)}{featured && !known[featured] && <option value={featured}>Current cover photo</option>}</select></label>}
    </section>
    <details className={styles.library} onToggle={event=>setLibraryOpen(event.currentTarget.open)}><summary>Choose an existing file</summary>
      <section aria-label="Choose existing media"><div className={styles.libraryHeading}><h4>Media library</h4><Button type="button" variant="secondary" disabled={disabled || loading} onClick={()=>{setKnown({});setReload(value=>value+1);}}>Refresh files</Button></div>
        <div className={styles.filters}><Input label="Search media library" type="search" maxLength={100} disabled={disabled} value={search} onChange={event=>{setSearch(event.target.value);setPage(1);}}/>
          {!mediaKind && <label className={styles.field}>File type<select disabled={disabled} value={filter} onChange={event=>{setFilter(event.target.value);setPage(1);}}><option value="">Images and PDFs</option><option value="photo">Photos</option><option value="document">PDF documents</option></select></label>}</div>
        {loading?<CmsSkeleton label="Loading media library" rows={3} variant="cards"/>:libraryError?<div><ErrorNotice message={libraryError}/><Button type="button" variant="secondary" disabled={disabled} onClick={()=>setReload(value=>value+1)}>Retry media library</Button></div>:!assets.length?<p className={styles.empty}>No files found. Upload a file above or clear your search.</p>:<ul className={styles.mediaGrid}>{assets.map(asset=><li key={asset.id} className={styles.libraryCard}><MediaThumbnail asset={asset}/><h5>{asset.title}</h5><Button type="button" variant="secondary" disabled={disabled || attachments.some(item=>item.assetId===asset.id) || attachments.length+queue.length>=50} onClick={()=>onAttach(asset)}>{attachments.some(item=>item.assetId===asset.id)?'Attached':'Attach file'}</Button></li>)}</ul>}
        <div className={styles.actions}><span className={styles.hint}>Library page {page}</span><Button type="button" variant="secondary" disabled={disabled || loading || page===1} onClick={()=>setPage(value=>value-1)}>Previous library page</Button><Button type="button" variant="secondary" disabled={disabled || loading || !hasMore} onClick={()=>setPage(value=>value+1)}>Next library page</Button></div>
      </section>
    </details>
  </section>;
}
