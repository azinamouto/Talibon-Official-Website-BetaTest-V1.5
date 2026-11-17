import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, FileText, Image, RefreshCw } from 'lucide-react';
import { staffRequest } from '../../contexts/StaffAuthContext';
import { Button } from '../ui/Button';
import { municipalModules, type MunicipalGroup } from './municipalModules';
import styles from '../../pages/StaffPortal.module.css';
import { CmsSkeleton } from './CmsControls';
type Count={kind:string;publication:string;total:number};
type Snapshot={counts:Count[];media:Count[];recent:{id:string;kind:string;title:string;publication:string;updated_at:string}[];activity:{action:string;resource_id:string;occurred_at:string}[]};
export default function MunicipalDashboard({openModule}:{openModule(module:MunicipalGroup|'photos'|'documents'):void}) {
  const [snapshot,setSnapshot]=useState<Snapshot|null>(null),[error,setError]=useState(''),[reload,setReload]=useState(0);
  useEffect(()=>{let current=true;setSnapshot(null);setError('');void staffRequest<Snapshot>('/api/admin/content/dashboard').then(result=>{if(current)setSnapshot(result);}).catch(reason=>{if(current)setError((reason as Error).message);});return ()=>{current=false;};},[reload]);
  const total=(data:Count[]|undefined,publication?:string)=>data?.filter(row=>!publication||row.publication===publication).reduce((sum,row)=>sum+row.total,0);
  const counts=[{label:'Municipal records',icon:FileText,value:total(snapshot?.counts)},{label:'Published records',icon:CheckCircle2,value:total(snapshot?.counts,'published')},{label:'Drafts awaiting publication',icon:FileText,value:total(snapshot?.counts,'draft')},{label:'Media library files',icon:Image,value:total(snapshot?.media)}];
  return <section aria-labelledby="overview-title"><div className={styles.panelHeading}><div><p className={styles.eyebrow}>Municipal publishing</p><h2 id="overview-title">Dashboard overview</h2><p>Manage official Talibon news, information and documents.</p></div><Button variant="secondary" onClick={()=>setReload(value=>value+1)}><RefreshCw size={16} aria-hidden="true" />Refresh overview</Button></div>
    {error && <p role="alert" className={styles.error}>{error}</p>}{!snapshot&&!error && <CmsSkeleton label="Loading content overview" rows={4} variant="stats" />}
    {(snapshot || error) && <dl className={styles.stats}>{counts.map(({label,icon:Icon,value})=><div key={label} className={styles.stat}><span className={styles.statIcon}><Icon size={20} aria-hidden="true" /></span><dt>{label}</dt><dd>{value ?? '—'}</dd></div>)}</dl>}
    <p className={styles.scope}>Totals include all municipal records and library files. Archived records: {total(snapshot?.counts,'archived') ?? '—'}.</p>
    <div className={styles.quickActions}>{([{id:'news',title:'Publish a municipal update',description:'Write news, announcements and advisories.'},{id:'transparency',title:'Post an official report',description:'Attach verified disclosure, budget and procurement PDFs.'},{id:'tourism',title:'Update tourism information',description:'Manage spots, festivals and delicacies.'},{id:'galleries',title:'Create a photo collection',description:'Add captions and alternative text from the photo library.'}] as const).map(action=><button key={action.id} className={styles.quickAction} onClick={()=>openModule(action.id)}><span><strong>{action.title}</strong><span>{action.description}</span></span><ArrowRight size={20} aria-hidden="true" /></button>)}</div>
    <section className={styles.recent} aria-labelledby="recent-title"><div className={styles.sectionHeading}><h3 id="recent-title">Recently updated content</h3></div>{snapshot && (snapshot.recent.length?<ul className={styles.recentList}>{snapshot.recent.map(row=><li key={row.id}><div><button className="text-left underline min-h-11" onClick={()=>openModule(municipalModules.find(m=>m.kind===row.kind)!.group)}>{row.title}</button><p>{new Date(row.updated_at).toLocaleString()}</p></div><span className={styles.badge}>{row.publication}</span></li>)}</ul>:<p className={styles.empty}>No municipal records yet. Start with verified official material.</p>)}</section>
    <section className={styles.recent} aria-label="Your recent activity"><h3>Your recent activity</h3>{snapshot && (snapshot.activity.length?<ul className={styles.recentList}>{snapshot.activity.map((event,index)=><li key={index}><strong>{event.action}</strong><time dateTime={event.occurred_at}>{new Date(event.occurred_at).toLocaleString()}</time></li>)}</ul>:<p>No recorded activity yet.</p>)}</section>
  </section>;
}
