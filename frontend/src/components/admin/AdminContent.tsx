import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { staffRequest } from '../../contexts/StaffAuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

type Row = { id: string; title: string; slug: string; source_id: string; publication: string; version: number; body: Record<string, unknown> };
type Source = { id: string; reference: string; approved: boolean };
const modules = [
  ['news','News and advisories'],['pages','Public information'],['tourism_spots','Tourism'],
  ['officials','Officials'],['departments','Departments'],['barangays','Barangays'],
  ['events','Events'],['services_cms','Service information'],['citizens_charter_cms',"Citizen?s charter"],
  ['ordinances','Ordinances'],['resolutions','Resolutions'],['downloadables','Download information'],
];
const details: Record<string, [string,string][]> = {
  news:[['summary','Summary'],['content','Content']], pages:[['content','Content']],
  tourism_spots:[['description','Description'],['location','Location']],
  officials:[['position','Position'],['department','Department'],['term','Term']],
  departments:[['description','Description'],['head','Department head'],['contact','Contact information']],
  barangays:[['description','Description'],['captain','Barangay captain']],
  events:[['description','Description'],['date','Date'],['location','Location']],
  services_cms:[['description','Description'],['office_responsible','Responsible office'],['processing_time','Processing time'],['fees','Fees']],
};
export default function AdminContent({role}: {role:'admin'|'editor'}) {
  const [kind,setKind]=useState('news');
  const [rows,setRows]=useState<Row[]>([]);
  const [sources,setSources]=useState<Source[]>([]);
  const [page,setPage]=useState(1),[pages,setPages]=useState(0);
  const [editing,setEditing]=useState<Row|null>(null);
  const [title,setTitle]=useState(''),[slug,setSlug]=useState(''),[source,setSource]=useState('');
  const [fields,setFields]=useState<Record<string,unknown>>({});
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[code,setCode]=useState('');
  const [deleting,setDeleting]=useState<Row|null>(null);
  const load=useCallback(async()=>{
    const [result,options]=await Promise.all([
      staffRequest<{data:Row[];pagination:{totalPages:number}}>(`/api/admin/content/${kind}?page=${page}&limit=20`),
      staffRequest<{sources:Source[]}>('/api/admin/media/options'),
    ]);
    setRows(result.data);setPages(result.pagination.totalPages);setSources(options.sources);
  },[kind,page]);
  useEffect(()=>{let active=true;setBusy(true);load().catch(()=>{if(active)setMessage('Content could not be loaded. Retry to continue.');}).finally(()=>{if(active)setBusy(false);});return()=>{active=false;};},[load]);
  function reset(){setEditing(null);setTitle('');setSlug('');setSource('');setFields({});}
  async function act(work:()=>Promise<unknown>){setBusy(true);setMessage('');try{await work();await load();}catch{setMessage('Could not save. Check source approval and staff access, then refresh before retrying.');}finally{setBusy(false);}}
  function edit(row:Row){setEditing(row);setTitle(row.title);setSlug(row.slug);setSource(row.source_id);setFields(row.body);}
  function save(event:FormEvent){event.preventDefault();void act(async()=>{
    const body={...(kind==='news'?{category:'ARTICLE'}:{}),...fields,...(['departments','barangays','officials','tourism_spots','services_cms'].includes(kind)?{name:title}:{})};
    await staffRequest(`/api/admin/content/${kind}${editing?`/${editing.id}/edit`:''}`,{title,slug,sourceId:source,body,status:'draft',...(editing?{version:editing.version}:{})});reset();setMessage('Draft saved. Review before publishing.');
  });}
  return <section className="space-y-4" aria-label="Information CMS">
    <h2 className="text-xl font-bold">Website content</h2>
    <label className="block space-y-2">Content section<select className="ui-focus block min-h-11 w-full rounded-control border border-control p-2" value={kind} disabled={busy} onChange={e=>{setKind(e.target.value);setPage(1);reset();setDeleting(null);}}>{modules.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    <Button variant="secondary" disabled={busy} onClick={()=>void act(load)}>Refresh content</Button>
    {message&&<p role="status">{message}</p>}
    <form onSubmit={save}><fieldset disabled={busy} className="space-y-4">
      <legend className="font-semibold">{editing?'Edit content':'Create draft'}</legend>
      <Input label="Title or name" value={title} required maxLength={200} onChange={e=>setTitle(e.target.value)}/>
      <Input label="Page address" value={slug} required maxLength={160} pattern="[a-z0-9]+(-[a-z0-9]+)*" onChange={e=>setSlug(e.target.value)}/>
      <label className="block space-y-2">Source attribution<select className="ui-focus block min-h-11 w-full rounded-control border border-control p-2" value={source} required onChange={e=>setSource(e.target.value)}><option value="">Choose a reviewed source</option>{sources.map(s=><option key={s.id} value={s.id}>{s.reference}{s.approved?'':' ? approval pending'}</option>)}</select></label>
      {!sources.length&&<p>No sources are registered. An authorized content reviewer must provide source attribution before content can be saved.</p>}
      {(details[kind]??[['description','Description'],['content','Content']]).map(([key,label])=><label key={key} className="block space-y-2">{label}<textarea className="ui-focus block min-h-28 w-full rounded-control border border-control p-3" maxLength={100000} value={typeof fields[key]==='string'?fields[key] as string:''} onChange={e=>setFields({...fields,[key]:e.target.value})}/></label>)}
      {kind==='news'&&<label className="block space-y-2">Category<select className="ui-focus block min-h-11 w-full rounded-control border border-control p-2" value={String(fields.category??'ARTICLE')} onChange={e=>setFields({...fields,category:e.target.value})}><option value="ARTICLE">Article</option><option value="UPDATE">Update</option><option value="ANNOUNCEMENT">Announcement</option><option value="ADVISORY">Advisory</option><option value="NOTICE">Public notice</option></select></label>}
      <div className="flex flex-wrap gap-2"><Button type="submit" disabled={!source}>Save draft</Button><Button variant="secondary" onClick={reset}>Clear form</Button></div>
    </fieldset></form>
    <ul className="divide-y">{rows.map(row=><li key={row.id} className="space-y-2 py-4"><p className="font-semibold">{row.title}</p><p>{row.publication}</p><div className="flex flex-wrap gap-2">
      <Button variant="secondary" disabled={busy} onClick={()=>edit(row)}>Edit</Button>
      <Button variant="secondary" disabled={busy} onClick={()=>void act(async()=>{await staffRequest(`/api/admin/content/${kind}/${row.id}/edit`,{version:row.version,status:row.publication==='published'?'draft':'published'});reset();setMessage('Publication updated.');})}>{row.publication==='published'?'Unpublish':'Publish'}</Button>
      {role==='admin'&&<Button variant="danger" disabled={busy} onClick={()=>{setDeleting(row);setCode('');}}>Delete</Button>}
    </div></li>)}</ul>
    {!busy&&!rows.length&&<p>No content in this section.</p>}
    <div className="flex gap-2"><Button variant="secondary" disabled={busy||page===1} onClick={()=>setPage(page-1)}>Previous content page</Button><Button variant="secondary" disabled={busy||page>=pages} onClick={()=>setPage(page+1)}>Next content page</Button></div>
    {deleting&&<section className="space-y-3 border-t pt-4" aria-label="Confirm content deletion"><h3 className="font-semibold">Delete {deleting.title}?</h3><p>This removes the item from the website and content list.</p><Input label="Current authenticator code" autoComplete="one-time-code" inputMode="numeric" maxLength={6} value={code} onChange={e=>setCode(e.target.value)}/><div className="flex gap-2"><Button variant="danger" disabled={busy||!/^\d{6}$/.test(code)} onClick={()=>void act(async()=>{const value=code;setCode('');await staffRequest('/api/staff-auth/two-factor/verify-totp',{code:value});await staffRequest(`/api/admin/content/${kind}/${deleting.id}/delete`,{version:deleting.version});setDeleting(null);reset();setMessage('Content deleted.');})}>Confirm deletion</Button><Button variant="secondary" disabled={busy} onClick={()=>setDeleting(null)}>Keep content</Button></div></section>}
  </section>;
}
