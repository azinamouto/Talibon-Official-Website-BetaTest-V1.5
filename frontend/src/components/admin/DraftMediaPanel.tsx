import { useEffect, useState } from 'react';
import { staffRequest } from '../../contexts/StaffAuthContext';
import { errorFields, fieldMessages, StaffRequestError } from '../../lib/staffErrors';
import { fileKind, simpleFilename, uploadPrivateMedia, validateUploadFile, type UploadMetadata, type UploadProgress } from '../../lib/mediaUpload';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { Asset, MediaOptions } from './AdminMedia';
import type { Attachment } from './municipalModules';
import { CmsLink, CmsSkeleton, ErrorNotice, FileDropzone, MediaThumbnail, ReviewedSelect, UploadIndicator } from './CmsControls';
import styles from './DraftMediaPanel.module.css';

type QueuedFile={id:string;file:File;filename:string;title:string;altText:string;categoryId:string;error?:string;fields?:Record<string,string>;attempt?:UploadMetadata;uncertain?:boolean};
export default function DraftMediaPanel({sourceId,role,kind,attachments,featured,onAttach,onAttachmentsChange,onFeaturedChange,busy,onBusyChange,onPendingChange,fieldErrors={}}:{
  sourceId:string;role:'admin'|'editor';kind:string;attachments:Attachment[];featured:string;onAttach(asset:Asset):void;
  onAttachmentsChange(value:Attachment[]):void;onFeaturedChange(value:string):void;busy:boolean;onBusyChange(value:boolean):void;onPendingChange(value:boolean):void;fieldErrors?:Record<string,string>;
}) {
  const [options,setOptions]=useState<MediaOptions>({categories:[],sources:[]}),[optionsLoading,setOptionsLoading]=useState(true),[optionsError,setOptionsError]=useState('');
  const [queue,setQueue]=useState<QueuedFile[]>([]),[uploading,setUploading]=useState(''),[progress,setProgress]=useState<UploadProgress|null>(null);
  const [assets,setAssets]=useState<Asset[]>([]),[known,setKnown]=useState<Record<string,Asset|null>>({});
  const [page,setPage]=useState(1),[hasMore,setHasMore]=useState(false),[search,setSearch]=useState(''),[filter,setFilter]=useState(kind==='galleries'?'photo':'');
  const [loading,setLoading]=useState(true),[libraryError,setLibraryError]=useState(''),[error,setError]=useState(''),[fields,setErrorFields]=useState<Record<string,string>>({}),[message,setMessage]=useState(''),[reload,setReload]=useState(0),[publishing,setPublishing]=useState('');
  const disabled=busy || !!uploading || !!publishing;
  useEffect(()=>{onPendingChange(queue.length>0);},[queue.length,onPendingChange]);
  useEffect(()=>{
    let current=true;setOptionsLoading(true);setOptionsError('');
    void staffRequest<MediaOptions>('/api/admin/media/options').then(result=>{if(current)setOptions(result);}).catch(reason=>{if(current)setOptionsError((reason as Error).message);}).finally(()=>{if(current)setOptionsLoading(false);});
    return()=>{current=false;};
  },[reload]);
  useEffect(()=>{
    let current=true;setLoading(true);setLibraryError('');
    const timer=window.setTimeout(()=>{
      const params=new URLSearchParams({page:String(page),ready:'true',...(filter?{kind:filter}:{}),...(search?{q:search}:{})});
      void staffRequest<{data:Asset[];hasMore:boolean}>(`/api/admin/media?${params}`).then(result=>{
        if(!current)return;setAssets(result.data);setHasMore(result.hasMore);setKnown(prior=>({...prior,...Object.fromEntries(result.data.map(asset=>[asset.id,asset]))}));
      }).catch(reason=>{if(current)setLibraryError((reason as Error).message);}).finally(()=>{if(current)setLoading(false);});
    },search?250:0);
    return()=>{current=false;window.clearTimeout(timer);};
  },[page,search,filter,reload]);
  const ids=[...new Set([...attachments.map(item=>item.assetId),...(featured?[featured]:[])])];
  const missing=ids.filter(id=>!Object.hasOwn(known,id)).join(',');
  useEffect(()=>{
    if(!missing)return;let current=true;
    void Promise.allSettled(missing.split(',').map(async id=>[id,await staffRequest<Asset>(`/api/admin/media/${id}`)] as const)).then(results=>{
      if(!current)return;setKnown(prior=>({...prior,...Object.fromEntries(results.map((result,index)=>result.status==='fulfilled' && result.value[1]?.id ? result.value : [missing.split(',')[index],null]))}));
    });return()=>{current=false;};
  },[missing,reload]);
  function choose(files:File[]) {
    setError('');setErrorFields({});setMessage('');const added:QueuedFile[]=[];
    for(const file of files) {
      try {validateUploadFile(file,kind==='galleries'?'photo':undefined);} catch(reason){setError((reason as Error).message);setErrorFields(errorFields(reason));continue;}
      if(attachments.length+queue.length+added.length>=50){setError('A draft can contain up to 50 attachments. Remove a file before adding another.');break;}
      added.push({id:crypto.randomUUID(),file,filename:simpleFilename(file.name),title:file.name.replace(/\.[^.]+$/,'').slice(0,200),altText:'',categoryId:''});
    }
    setQueue(prior=>[...prior,...added]);
  }
  function update(id:string,patch:Partial<QueuedFile>) {setQueue(prior=>prior.map(item=>item.id===id?{...item,error:undefined,fields:{},...patch}:item));}
  async function upload(item:QueuedFile) {
    if(disabled)return;
    const metadata=item.uncertain && item.attempt ? item.attempt : {title:item.title.trim(),description:'',altText:item.altText.trim(),categoryId:item.categoryId,sourceId,filename:item.filename};
    const failures:Record<string,string>={};
    if(!metadata.title)failures.title=fieldMessages.required;
    if(!metadata.sourceId)failures.sourceId='Choose a source record for this draft before uploading.';
    const chosenSource=options.sources.find(choice=>choice.id===metadata.sourceId);
    if(metadata.sourceId && !chosenSource)failures.sourceId='This draft’s source is unavailable for media uploads. Refresh the choices or contact an administrator.';
    if(chosenSource && !chosenSource.approved && (chosenSource.reviewed_at || chosenSource.approval_status==='rejected'))failures.sourceId=fieldMessages.source_unapproved;
    const category=options.categories.find(choice=>choice.id===metadata.categoryId);
    if(!category)failures.categoryId=fieldMessages.category_missing;
    else if(!category.approved)failures.categoryId='Choose an approved category before uploading.';
    else if(category.kind!==fileKind(item.file))failures.categoryId=fieldMessages.category_kind;
    if(fileKind(item.file)==='photo' && !metadata.altText)failures.altText=fieldMessages.photo_alt;
    if(Object.keys(failures).length){update(item.id,{error:'Complete the file details before uploading.',fields:failures});return;}
    setUploading(item.id);onBusyChange(true);setMessage('');setError('');update(item.id,{attempt:metadata});
    try {
      const asset=await uploadPrivateMedia(item.file,metadata,item.id,setProgress);
      setKnown(prior=>({...prior,[asset.id]:asset}));onAttach(asset);setQueue(prior=>prior.filter(entry=>entry.id!==item.id));
      setMessage('File uploaded and attached to this draft. Save the draft to keep the attachment. The file remains private.');setReload(value=>value+1);
    } catch(reason) {
      const uncertain=!(reason instanceof StaffRequestError) || reason.status>=500 || reason.status===409;
      update(item.id,{error:(reason as Error).message,fields:errorFields(reason),uncertain,attempt:metadata});
    } finally {setUploading('');setProgress(null);onBusyChange(false);}
  }
  async function publishFile(asset:Asset,attachment:Attachment) {
    if(disabled)return;setPublishing(asset.id);onBusyChange(true);setError('');setErrorFields({});setMessage('');
    try {
      let row=asset;
      if(asset.kind==='photo' && !asset.alt_text.trim()) {
        row=await staffRequest<Asset>(`/api/admin/media/${asset.id}/edit`,{title:asset.title,description:asset.description,altText:attachment.altText,categoryId:asset.category_id,version:asset.version});
        setKnown(prior=>({...prior,[row.id]:row}));
      }
      row=await staffRequest<Asset>(`/api/admin/media/${row.id}/publish`,{version:row.version});
      setKnown(prior=>({...prior,[row.id]:row}));setMessage('File published. Save and preview this draft before publishing the record.');setReload(value=>value+1);
    } catch(reason){setError((reason as Error).message);setErrorFields(errorFields(reason));}
    finally{setPublishing('');onBusyChange(false);}
  }
  const publicationHint=['downloadables','transparency_reports'].includes(kind)?'This record needs a published PDF before publication.':kind==='galleries'?'A collection needs at least one published photo.':'Publish every attached file before publishing the record.';
  return <section className={styles.root} aria-label="Media attachments">
    <div><h4>Images and documents</h4><p className={styles.hint}>Upload from this editor or attach an existing library file. Uploads remain private until you publish each file explicitly.</p></div>
    {error && <ErrorNotice message={error} fields={fields} />}{message && <p role="status" className={styles.notice}>{message}</p>}
    {fieldErrors.attachments && <p className={styles.fieldError}>{fieldErrors.attachments}</p>}
    <FileDropzone label="Upload files for this draft" kind={kind==='galleries'?'photo':undefined} multiple disabled={disabled || attachments.length+queue.length>=50} onFiles={choose} />
    {!sourceId && <p className={styles.warning}>Choose the draft’s source record before uploading. You can select files now and complete their details.</p>}
    {optionsError && <ErrorNotice message={optionsError} />}{optionsError && <Button type="button" variant="secondary" disabled={disabled} onClick={()=>setReload(value=>value+1)}>Retry upload choices</Button>}
    {queue.map((item,index)=><article key={item.id} className={styles.uploadCard} aria-label={`Queued file ${index+1}`}>
      <MediaThumbnail file={item.file} /><div className={styles.details}><h5>{item.file.name}</h5><p className={styles.hint}>{Math.ceil(item.file.size/1024)} KiB · {fileKind(item.file)==='photo'?'Photo':'PDF document'}</p>
        {item.error && <ErrorNotice message={item.error} fields={item.fields} />}
        <fieldset disabled={disabled || item.uncertain} className={styles.uploadFields}>
          <Input label={`File ${index+1} title`} maxLength={200} value={item.title} error={item.fields?.title} onChange={event=>update(item.id,{title:event.target.value})} />
          <Input label={`File ${index+1} upload filename`} maxLength={110} value={item.filename} error={item.fields?.filename} hint={item.filename!==item.file.name?'A compatible upload filename is used. The file contents stay the same.':undefined} onChange={event=>update(item.id,{filename:event.target.value})} />
          {fileKind(item.file)==='photo' && <Input label={`File ${index+1} alternative text`} maxLength={500} value={item.altText} error={item.fields?.altText} hint="Describe what the photo shows for people using screen readers." onChange={event=>update(item.id,{altText:event.target.value})} />}
          <ReviewedSelect label={`File ${index+1} category`} required={false} disabled={optionsLoading || disabled || item.uncertain} value={item.categoryId} error={item.fields?.categoryId}
            choices={options.categories.filter(choice=>choice.kind===fileKind(item.file)).map(choice=>({...choice,label:choice.title}))} onChange={categoryId=>update(item.id,{categoryId})} hint={`Only approved ${fileKind(item.file)} categories can be selected.`} />
        </fieldset>
        {item.uncertain && <p className={styles.warning}>The server could not confirm the upload. Retry with these same details to recover it without creating a duplicate. The file may already exist as a private library draft.</p>}
        {uploading===item.id && progress && <UploadIndicator progress={progress} />}
        <div className={styles.actions}><Button type="button" disabled={disabled || optionsLoading || !!optionsError || !sourceId} onClick={()=>void upload(item)}>{item.error?'Retry upload and attach':'Upload and attach'}</Button><Button type="button" variant="secondary" disabled={disabled} onClick={()=>setQueue(prior=>prior.filter(entry=>entry.id!==item.id))}>Remove queued file</Button></div>
      </div>
    </article>)}
    <section aria-label="Choose existing media" className={styles.library}>
      <div className={styles.libraryHeading}><h4>Choose from the media library</h4><Button type="button" variant="secondary" disabled={disabled || loading} onClick={()=>{setKnown({});setReload(value=>value+1);}}>Refresh library</Button></div>
      <div className={styles.filters}><Input label="Search media library" type="search" maxLength={100} disabled={disabled} value={search} onChange={event=>{setSearch(event.target.value);setPage(1);}} />
        {kind!=='galleries' && <label className={styles.field}>File type<select disabled={disabled} value={filter} onChange={event=>{setFilter(event.target.value);setPage(1);}}><option value="">Images and PDFs</option><option value="photo">Photos</option><option value="document">PDF documents</option></select></label>}</div>
      {loading?<CmsSkeleton label="Loading media library" rows={3} variant="cards" />:libraryError?<div><ErrorNotice message={libraryError} /><Button type="button" variant="secondary" disabled={disabled} onClick={()=>setReload(value=>value+1)}>Retry media library</Button></div>:!assets.length?<div className={styles.empty}><strong>No ready files found</strong><p>Upload a file above, clear your search, or check another file type. Pending uploads can be resumed in Photos or Documents.</p></div>:<ul className={styles.mediaGrid}>{assets.map(asset=><li key={asset.id} className={styles.libraryCard}><MediaThumbnail asset={asset} /><h5>{asset.title}</h5><p className={styles.hint}>{asset.kind==='photo'?'Photo':'PDF'} · {Math.ceil(Number(asset.bytes)/1024)} KiB · {asset.publication==='published'?'Published':'Private draft'}</p><Button type="button" variant="secondary" disabled={disabled || attachments.some(item=>item.assetId===asset.id) || attachments.length+queue.length>=50} onClick={()=>onAttach(asset)}>{attachments.some(item=>item.assetId===asset.id)?'Attached':'Attach file'}</Button></li>)}</ul>}
      <div className={styles.actions}><span className={styles.hint}>Library page {page}</span><Button type="button" variant="secondary" disabled={disabled || loading || page===1} onClick={()=>setPage(value=>value-1)}>Previous library page</Button><Button type="button" variant="secondary" disabled={disabled || loading || !hasMore} onClick={()=>setPage(value=>value+1)}>Next library page</Button></div>
    </section>
    <section aria-label="Attached files" className={styles.attached}><h4>Attached to this draft ({attachments.length})</h4><p className={styles.hint}>{publicationHint} Removing an attachment keeps its file in the private library.</p>
      {!attachments.length && <p className={styles.empty}>No attachments yet. Upload or choose a library file above.</p>}
      {attachments.map((attachment,index)=>{
        const asset=known[attachment.assetId],category=options.categories.find(choice=>choice.id===asset?.category_id),source=options.sources.find(choice=>choice.id===asset?.source_id);
        const publicationBlocked=asset && (!source?.approved || !category?.approved || (asset.kind==='photo' && !attachment.altText.trim()));
        return <article key={attachment.assetId} className={styles.attachmentCard}>
          {asset?<MediaThumbnail asset={asset} />:!Object.hasOwn(known,attachment.assetId)?<CmsSkeleton label="Loading attachment details" rows={1} />:<p className={styles.warning}>This file is unavailable. Refresh the library or remove this attachment.</p>}
          <div className={styles.details}><strong>{asset?.title || attachment.caption}</strong>{asset && <span className={styles.badge}>{asset.publication==='published'?'Published':'Private draft'}{featured===asset.id?' · Featured photo':''}</span>}
            <Input label={`Attachment ${index+1} caption`} name={`attachments.${index}.caption`} required maxLength={1000} disabled={disabled} value={attachment.caption} error={fieldErrors[`attachments.${index}.caption`]} onChange={event=>onAttachmentsChange(attachments.map((entry,i)=>i===index?{...entry,caption:event.target.value}:entry))} />
            {(!asset || asset.kind==='photo') && <Input label={`Attachment ${index+1} alternative text (photos)`} name={`attachments.${index}.altText`} required={asset?.kind==='photo'} maxLength={500} disabled={disabled} value={attachment.altText} error={fieldErrors[`attachments.${index}.altText`]} onChange={event=>onAttachmentsChange(attachments.map((entry,i)=>i===index?{...entry,altText:event.target.value}:entry))} />}
            {asset?.publication==='draft' && publicationBlocked && <p className={styles.warning}>{!source?.approved?'This file’s source needs administrator approval.':!category?.approved?'This file’s category needs approval.':'Add alternative text before publishing this photo.'}</p>}
            <div className={styles.actions}>{asset && <a href={`/api/admin/media/${asset.id}/download`}>Preview / download {asset.kind==='document'?'PDF':'photo'}</a>}
              {asset?.publication==='draft' && <Button type="button" variant="secondary" disabled={disabled || optionsLoading || !!publicationBlocked} onClick={()=>void publishFile(asset,attachment)}>Publish file</Button>}
              <Button type="button" variant="secondary" disabled={disabled} onClick={()=>{onAttachmentsChange(attachments.filter((_,i)=>i!==index));if(featured===attachment.assetId)onFeaturedChange('');}}>Remove file</Button>
            </div>
          </div>
        </article>;
      })}
      <label className={styles.field}>Featured photo<select name="featuredAssetId" value={featured} disabled={disabled} aria-invalid={!!fieldErrors.featuredAssetId} onChange={event=>onFeaturedChange(event.target.value)}><option value="">No featured photo</option>{ids.filter(id=>known[id]?.kind==='photo').map(id=><option key={id} value={id}>{known[id]!.title}</option>)}{featured && !known[featured] && <option value={featured}>Current featured photo</option>}</select></label>
      <p className={styles.hint}>Choose one of this draft’s photos to feature on the website. Remove a photo to clear its featured selection.</p>
      {role==='admin' && <CmsLink href="/cms?tab=sources" className={styles.approvalLink}>Open Source approvals</CmsLink>}
    </section>
  </section>;
}
