import { useEffect, useId, useState, type ReactNode } from 'react';
import { Link, useInRouterContext } from 'react-router-dom';
import { CircleCheck, FileText, Image as ImageIcon, Upload, X } from 'lucide-react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import type { Asset } from './AdminMedia';
import type { UploadProgress, MediaKind } from '../../lib/mediaUpload';
import styles from './CmsControls.module.css';

export function CmsLink({href,children,className}:{href:string;children:ReactNode;className?:string}) {
  return useInRouterContext()?<Link to={href} className={className}>{children}</Link>:<a href={href} className={className}>{children}</a>;
}

export type ReviewedChoice = {id:string;label:string;approved:boolean;reviewed_at?:string|null;approval_status?:'approved'|'pending'|'rejected'};
export function approvalLabel(choice: Pick<ReviewedChoice,'approved'|'reviewed_at'|'approval_status'>) {
  return choice.approval_status === 'rejected' ? 'Rejected' : choice.approved ? 'Approved' : choice.reviewed_at ? 'Approval withdrawn' : 'Pending approval';
}
export function ReviewedSelect({label,value,onChange,choices,disabled,error,allowPending=false,hint,name,required=true}: {
  label:string;value:string;onChange(value:string):void;choices:ReviewedChoice[];disabled?:boolean;error?:string;allowPending?:boolean;hint?:string;name?:string;required?:boolean;
}) {
  const id=useId(),[search,setSearch]=useState('');
  const selected=choices.find(choice=>choice.id===value);
  const visible=choices.filter(choice=>choice.id===value || choice.label.toLowerCase().includes(search.toLowerCase()));
  const available=(choice:ReviewedChoice)=>choice.approved || (allowPending && !choice.reviewed_at && choice.approval_status!=='rejected');
  return <div className={styles.selector}>
    <Input label={`Search ${label.toLowerCase()} choices`} type="search" value={search} maxLength={100} disabled={disabled} onChange={event=>setSearch(event.target.value)} />
    <label htmlFor={id} className={styles.label}>{label}</label>
    <select id={id} name={name} required={required} value={value} disabled={disabled} aria-invalid={!!error} aria-describedby={`${id}-hint${error?` ${id}-error`:''}`} onChange={event=>onChange(event.target.value)}>
      <option value="">Choose {label.toLowerCase()}</option>
      <optgroup label="Approved">{visible.filter(choice=>choice.approved).map(choice=><option key={choice.id} value={choice.id}>{choice.label}</option>)}</optgroup>
      <optgroup label={allowPending?'Awaiting review — private drafts only':'Unavailable until approved'}>{visible.filter(choice=>!choice.approved).map(choice=><option key={choice.id} value={choice.id} disabled={!available(choice)}>{choice.label} · {approvalLabel(choice)}{available(choice)?' — draft only':' — unavailable'}</option>)}</optgroup>
      {value && !selected && <option value={value} disabled>Current record unavailable — choose another</option>}
    </select>
    <p id={`${id}-hint`} className={selected && !selected.approved?styles.warning:styles.hint}>{selected && !selected.approved
      ? available(selected) ? 'This source can be used for a private draft. An administrator must review and approve it before publication.' : 'This record is not approved for use. Choose an approved record.'
      : hint || 'Choose an approved record.'}</p>
    {!visible.length && <p className={styles.hint}>No choices match your search. Clear the search or refresh the records.</p>}
    {error && <p id={`${id}-error`} className={styles.fieldError}>{error}</p>}
  </div>;
}
export function ErrorNotice({message,fields={}}:{message:string;fields?:Record<string,string>}) {
  const labels:Record<string,string>={sourceId:'Supporting evidence',categoryId:'File category',featuredAssetId:'Cover photo',submissionId:'Publication'};
  const label=(field:string)=>labels[field] || field.replace(/^(?:nodes|officials)\.(\d+)\./,(_,index)=>`Official ${Number(index)+1} `).replace(/photoAssetId$/,'photo').replace(/^attachments\.(\d+)\./,(_,index)=>`Attachment ${Number(index)+1} `).replace(/^mayor\./,'Executive leader ').replace(/^level2\.(\d+)\./,(_,index)=>`Second level ${Number(index)+1} `).replace(/^departments\.(\d+)\./,(_,index)=>`Department ${Number(index)+1} `).replace(/([a-z])([A-Z])/g,'$1 $2').replace(/_/g,' ');
  return <div role="alert" className={styles.error}><p>{message}</p>{!!Object.keys(fields).length && <ul>{Object.entries(fields).map(([field,text])=><li key={field}><strong>{label(field)}: </strong>{text}</li>)}</ul>}</div>;
}
export function CmsToast({message,onDismiss}:{message:string;onDismiss():void}) {
  if(!message)return null;
  return <div role="status" className={styles.toast}><CircleCheck size={20} aria-hidden="true"/><p>{message}</p><Button variant="secondary" aria-label="Dismiss notification" title="Dismiss notification" onClick={onDismiss}><X size={18} aria-hidden="true"/></Button></div>;
}
export function CmsSkeleton({label,rows=3,variant='rows'}:{label:string;rows?:number;variant?:'rows'|'cards'|'stats'}) {
  return <div role="status" aria-label={label} aria-busy="true" className={`${styles.skeletons} ${styles[variant]}`}>
    <span className={styles.srOnly}>{label}</span>{Array.from({length:rows},(_,index)=><div key={index} aria-hidden="true" className={styles.skeleton}><span /><span /><span /></div>)}
  </div>;
}
export function UploadIndicator({progress}:{progress:UploadProgress}) {
  return <div className={styles.progress} aria-busy="true"><p role="status">{progress.stage==='reading'?'Reading file…':progress.stage==='publishing'?'Publishing file…':'Uploading and verifying file…'}{progress.stage==='uploading' && progress.percent!==undefined?` ${progress.percent}% transferred`:''}</p>
    <progress aria-label="File upload progress" max={100} value={['verifying','publishing'].includes(progress.stage)?undefined:progress.percent} />
    {progress.stage==='verifying' && <p className={styles.hint}>Transfer complete. Checking and saving the file.</p>}
  </div>;
}
export function FileDropzone({onFiles,disabled,kind,multiple=false,label='File',inputKey=0}:{onFiles(files:File[]):void;disabled?:boolean;kind?:MediaKind;multiple?:boolean;label?:string;inputKey?:number}) {
  const [dragging,setDragging]=useState(false),id=useId();
  return <div className={`${styles.dropzone} ${dragging?styles.dragging:''}`} aria-disabled={disabled}
    onDragOver={event=>{event.preventDefault();if(!disabled)setDragging(true);}} onDragLeave={()=>setDragging(false)}
    onDrop={event=>{event.preventDefault();setDragging(false);if(!disabled)onFiles(Array.from(event.dataTransfer.files));}}>
    <Upload size={24} aria-hidden="true" /><strong>Upload {kind==='photo'?'photos':kind==='document'?'PDF documents':'images or PDFs'}</strong>
    <p>Drag files here or use the file chooser. Up to 2 MiB per file.</p>
    <label htmlFor={id}>{label}</label><input id={id} key={inputKey} type="file" disabled={disabled} multiple={multiple}
      accept={kind==='photo'?'.jpg,.jpeg,.png,.webp':kind==='document'?'.pdf':'.jpg,.jpeg,.png,.webp,.pdf'} onChange={event=>{onFiles(Array.from(event.target.files || []));if(multiple)event.target.value='';}} />
  </div>;
}
export function MediaThumbnail({asset,file}:{asset?:Asset;file?:File}) {
  const [url,setUrl]=useState(''),[failed,setFailed]=useState(false);
  const photo=file?file.type.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(file.name):asset?.kind==='photo';
  useEffect(()=>{setFailed(false);if(!file){setUrl('');return;}const objectUrl=URL.createObjectURL(file);setUrl(objectUrl);return()=>URL.revokeObjectURL(objectUrl);},[file,asset?.id]);
  return <div className={styles.thumbnail}>{photo && !failed && (url || asset) ? <img loading="lazy" src={url || `/api/admin/media/${asset!.id}/preview`} alt={asset?.alt_text || 'Selected upload preview'} onError={()=>setFailed(true)} />
    : <div>{photo?<ImageIcon size={28} aria-hidden="true" />:<FileText size={28} aria-hidden="true" />}<span>{failed?'Preview unavailable':photo?'Photo':'PDF document'}</span></div>}</div>;
}
