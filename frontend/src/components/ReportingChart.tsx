import type { OfficialEntry } from './admin/OfficialEditor';
import styles from './ReportingChart.module.css';

export function validReportingChart(value:unknown):value is OfficialEntry[] {
  if(!Array.isArray(value) || !value.length || value.length>100)return false;
  if(value.some(row=>!row || typeof row.id!=='string' || typeof row.name!=='string' || typeof row.role!=='string'))return false;
  if(value.some(row=>!row.id.trim() || !row.name.trim() || !row.role.trim() ||
    (row.reportsTo !== undefined && row.reportsTo !== null && typeof row.reportsTo !== 'string') ||
    ['office','photoAssetId','image_url'].some(key=>row[key] !== undefined && typeof row[key] !== 'string')))return false;
  const map=new Map(value.map(row=>[row.id,row]));if(map.size!==value.length)return false;
  for(const row of value){const seen=new Set([row.id]);let parent=row.reportsTo;while(parent){if(seen.has(parent) || !map.has(parent))return false;seen.add(parent);parent=map.get(parent).reportsTo;}}
  return true;
}
export default function ReportingChart({nodes,privatePreview=false}:{nodes:OfficialEntry[];privatePreview?:boolean}) {
  if(!validReportingChart(nodes))return <p role="alert">The reporting relationships are unavailable.</p>;
  const branches=(parent:string|null)=>nodes.filter(row=>(row.reportsTo || null)===parent);
  function branch(row:OfficialEntry) {
    const children=branches(row.id);
    const image=privatePreview && row.photoAssetId?`/api/admin/media/${row.photoAssetId}/preview`:row.image_url;
    return <li key={row.id}><div className={styles.official}>{image && <img src={image} alt={`${row.name} portrait`}/>}<div><h2>{row.name}</h2><p>{row.role}</p>{row.office && <p>{row.office}</p>}</div></div>{!!children.length && <ul>{children.map(branch)}</ul>}</li>;
  }
  return <ul className={styles.tree} aria-label="Organizational reporting relationships">{branches(null).map(branch)}</ul>;
}
