import { CmsInputError } from '../../security/cms-validation';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const invalid=(field:string,code:'chart'|'invalid'|'length'|'unsupported'='chart'):never=>{throw new CmsInputError({[field]:code});};
export function validateOfficials(input:unknown,field:'nodes'|'officials',legacy?:Record<string,any>) {
  if(!Array.isArray(input) || input.length>100 || (field==='nodes' && !input.length)) invalid(field);
  const rows=input as Record<string,any>[];
  const legacyImages=[legacy?.mayor,...(legacy?.level2 || []),...(legacy?.departments || []),...(legacy?.nodes || []),...(legacy?.officials || [])].filter(Boolean).map(row=>row.image_url).filter(Boolean);
  for(const [index,row] of rows.entries()) {
    const path=`${field}.${index}`;
    if(!row || typeof row!=='object' || Array.isArray(row))invalid(path);
    const allowed=field==='nodes'?['id','name','role','office','reportsTo','photoAssetId','image_url']:['id','name','role','office','photoAssetId','image_url'];
    if(Object.keys(row).some(key=>!allowed.includes(key)))invalid(path,'unsupported');
    if(!uuid.test(row.id || ''))invalid(`${path}.id`);
    for(const key of ['name','role',...(field==='nodes' || row.office!==undefined?['office']:[])]) {
      if(typeof row[key]!=='string' || row[key].length>200 || (key!=='office' && !row[key].trim()) || /[\x00-\x1f]/.test(row[key]))invalid(`${path}.${key}`);
    }
    if(row.photoAssetId!==undefined && !uuid.test(row.photoAssetId))invalid(`${path}.photoAssetId`);
    if(row.image_url!==undefined && !legacyImages.includes(row.image_url))invalid(`${path}.photoAssetId`,'unsupported');
    if(field==='nodes' && row.reportsTo!==null && row.reportsTo!==undefined && !uuid.test(row.reportsTo))invalid(`${path}.reportsTo`);
  }
  const map=new Map(rows.map(row=>[row.id,row]));
  if(map.size!==rows.length)invalid(field);
  if(field==='nodes')for(const [index,row] of rows.entries()) {
    const seen=new Set([row.id]);let parent=row.reportsTo;
    while(parent) {
      if(!map.has(parent) || seen.has(parent))invalid(`nodes.${index}.reportsTo`);
      seen.add(parent);parent=map.get(parent).reportsTo;
    }
  }
  return rows.flatMap(row=>row.photoAssetId?[row.photoAssetId as string]:[]);
}
