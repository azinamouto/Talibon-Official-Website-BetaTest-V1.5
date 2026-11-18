import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { Attachment } from './municipalModules';
import styles from './AdminContent.module.css';

export type OfficialEntry={id:string;name:string;role:string;office?:string;reportsTo?:string|null;photoAssetId?:string;image_url?:string};
export const emptyOfficial=():OfficialEntry=>({id:crypto.randomUUID(),name:'',role:'',office:'',reportsTo:null});
export function chartEntries(body:Record<string,unknown>):OfficialEntry[] {
  if(Array.isArray(body.nodes))return body.nodes as OfficialEntry[];
  const leader={...emptyOfficial(),...(body.mayor as object || {})};
  return [leader,...[...((body.level2 || []) as object[]),...((body.departments || []) as object[])].map(row=>({...emptyOfficial(),...row,reportsTo:leader.id}))];
}
export default function OfficialEditor({value,onChange,chart=false,attachments,errors}:{value:OfficialEntry[];onChange(value:OfficialEntry[]):void;chart?:boolean;attachments:Attachment[];errors:Record<string,string>}) {
  const field=chart?'nodes':'officials';
  function update(index:number,patch:Partial<OfficialEntry>) {onChange(value.map((row,i)=>i===index?{...row,...patch}:row));}
  function eligible(id:string,parent:string) {
    const seen=new Set([id]);let current:string|null|undefined=parent;
    while(current){if(seen.has(current))return false;seen.add(current);current=value.find(row=>row.id===current)?.reportsTo;}return true;
  }
  return <section className={styles.wide} aria-label={chart?'Reporting relationships':'Office officials'}><h4>{chart?'Officials and reporting relationships':'Officials'}</h4>
    {errors[field] && <p role="alert" className={styles.fieldError}>{errors[field]}</p>}
    {value.map((row,index)=><div key={row.id} className={styles.officialRow}>
      <Input label={`Official ${index+1} name`} name={`${field}.${index}.name`} required maxLength={200} value={row.name} error={errors[`${field}.${index}.name`]} onChange={event=>update(index,{name:event.target.value})}/>
      <Input label={`Official ${index+1} position`} name={`${field}.${index}.role`} required maxLength={200} value={row.role} error={errors[`${field}.${index}.role`]} onChange={event=>update(index,{role:event.target.value})}/>
      <Input label={`Official ${index+1} office / department`} name={`${field}.${index}.office`} maxLength={200} value={row.office || ''} error={errors[`${field}.${index}.office`]} onChange={event=>update(index,{office:event.target.value})}/>
      {chart && <>
        <label className={styles.field}>Official {index+1} reports to<select value={row.reportsTo || ''} aria-invalid={!!errors[`${field}.${index}.reportsTo`]} onChange={event=>update(index,{reportsTo:event.target.value || null})}><option value="">Top level</option>{value.filter(parent=>parent.id!==row.id && eligible(row.id,parent.id)).map((parent,i)=><option key={parent.id} value={parent.id}>{parent.name || `Official ${value.indexOf(parent)+1}`} - {parent.role || 'Position pending'}</option>)}</select>{errors[`${field}.${index}.reportsTo`] && <span className={styles.fieldError}>{errors[`${field}.${index}.reportsTo`]}</span>}</label></>}
      <label className={styles.field}>Official {index+1} photo<select value={row.photoAssetId || ''} onChange={event=>update(index,{photoAssetId:event.target.value || undefined})} aria-invalid={!!errors[`${field}.${index}.photoAssetId`]}><option value="">{row.image_url?'Retain current photo':'No photo'}</option>{attachments.map(attachment=><option key={attachment.assetId} value={attachment.assetId}>{attachment.caption}</option>)}{row.photoAssetId && !attachments.some(item=>item.assetId===row.photoAssetId) && <option value={row.photoAssetId}>Current photo (check attached files)</option>}</select></label>
      <Button variant="secondary" title={`Remove official ${index+1}`} aria-label={`Remove official ${index+1}`} onClick={()=>onChange(value.filter(entry=>entry.id!==row.id).map(entry=>entry.reportsTo===row.id?{...entry,reportsTo:null}:entry))}><Trash2 size={18} aria-hidden="true" /></Button>
    </div>)}
    <Button variant="secondary" disabled={value.length>=100} onClick={()=>{const row=emptyOfficial();if(!chart)delete row.reportsTo;onChange([...value,row]);}}><Plus size={18} aria-hidden="true" />Add official</Button>
  </section>;
}
