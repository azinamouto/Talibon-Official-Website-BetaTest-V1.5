import { CmsInputError, type CmsErrorCode } from '../../security/cms-validation';
import { validateOfficials } from './officials-schema';

export const MUNICIPAL_KINDS = ['news','advisories','updates','tourism_spots','tourism_festivals','events',
  'tourism_delicacies','transparency_reports','pages','organizational_chart','departments','galleries','downloadables'] as const;
export const REPORT_CATEGORIES = ['full-disclosure','infrastructure','finance','budget','bidding','executive-order'] as const;
export type ContentAttachment = { assetId: string; caption: string; altText: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fields: Record<string, string[]> = {
  news:['summary','content','category','author','date'], advisories:['summary','content','author','date'], updates:['summary','content','author','date'],
  tourism_spots:['description','location','address','contact','opening_hours','highlights'], tourism_festivals:['description','date','venue','time','start_time','end_time'], events:['description','date','venue','time','start_time','end_time','category'], tourism_delicacies:['description'],
  transparency_reports:['description','category','year','date','deadline','budget','status','reference'],
  pages:['content'], organizational_chart:['mayor','level2','departments','nodes'],
  departments:['description','head','contact','address','email','officials'], galleries:['description','category'], downloadables:['description','category','year','reference'],
};
const fail = (message: string, field = 'body', code: CmsErrorCode = 'invalid'): never => {
  throw new CmsInputError({[field]:code},message);
};
function text(value: unknown, label: string, max: number, required = false) {
  if (value === undefined && !required) return;
  if (typeof value !== 'string' || value.length > max || (required && !value.trim()) || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value)) {
    const field = ['official name','official role'].includes(label) ? 'body' : label === 'document category' ? 'category' : label;
    throw new CmsInputError({[field]:typeof value === 'string' && value.length > max ? 'length' : required ? 'required' : 'invalid'});
  }
}
function official(value: unknown, field: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('Chart entries require a name and role.',field,'chart');
  const row=value as Record<string,unknown>;
  if (Object.keys(row).some(key=>!['name','role'].includes(key))) fail('Chart portraits must use the media library.',field,'unsupported');
  text(row.name,`${field}.name`,200,true); text(row.role,`${field}.role`,200,true);
}
/** Plain text and explicit municipal metadata only; never store executable markup or arbitrary URLs. */
export function validateMunicipal(kind: string, input: { title?: string; slug?: string; sourceId?: string; body?: Record<string,unknown> }, legacyBody?: Record<string,unknown>) {
  if (!(MUNICIPAL_KINDS as readonly string[]).includes(kind)) fail('Unknown municipal module.');
  text(input.title,'title',200,true);
  if (!input.slug || input.slug.length>160 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)) throw new CmsInputError({slug:'slug'});
  if (!input.sourceId || !uuid.test(input.sourceId)) throw new CmsInputError({sourceId:'uuid'});
  if (kind==='organizational_chart' && input.slug!=='executive-chart') fail('The organizational chart slug is executive-chart.');
  const body=input.body;
  if (!body || typeof body!=='object' || Array.isArray(body) || Buffer.byteLength(JSON.stringify(body))>180000) fail('Invalid content body.');
  // Imported R2 metadata may be retained unchanged. It is never a back door for
  // new URL fields or arbitrary metadata, and existing official details survive editing.
  if (Object.keys(body).some(key=>!fields[kind].includes(key) && !['featuredAssetId','attachments'].includes(key)
    && !(legacyBody && Object.hasOwn(legacyBody,key) && JSON.stringify(legacyBody[key])===JSON.stringify(body[key])))) fail('Unsupported metadata field.');
  for (const key of fields[kind]) {
    if (kind==='organizational_chart' || ['highlights','officials'].includes(key)) continue;
    text(body[key],key,key==='content'?100000:key==='description'?10000:key==='summary'?2000:500);
  }
  if (['news','advisories','updates','pages'].includes(kind)) text(body.content,'content',100000,true);
  if (['news','advisories','updates'].includes(kind)) text(body.summary,'summary',2000,true);
  if (kind==='news' && !['ARTICLE','ANNOUNCEMENT','NOTICE','ADVISORY','UPDATE'].includes(String(body.category))) throw new CmsInputError({category:'invalid'});
  if (kind==='transparency_reports' && !(REPORT_CATEGORIES as readonly string[]).includes(String(body.category))) throw new CmsInputError({category:'invalid'});
  if (kind==='downloadables') text(body.category,'document category',100,true);
  if (kind==='galleries' && !['municipal','tourism'].includes(String(body.category))) fail('Choose a municipal or tourism collection.');
  if (['tourism_spots','tourism_festivals','tourism_delicacies','departments','events'].includes(kind)) text(body.description,'description',10000,true);
  if (kind==='events' && !['event','festivity'].includes(String(body.category)) && body.category!==legacyBody?.category) fail('Choose an event category.','category');
  for (const key of ['start_time','end_time']) if (body[key]!==undefined && !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(body[key]))) fail('Enter a valid time.',key,'invalid');
  if (body.end_time && (!body.start_time || String(body.end_time)<=String(body.start_time))) fail('End time must follow start time.','end_time','invalid');
  if (['events','tourism_festivals'].includes(kind) && !legacyBody) text(body.date,'date',10,true);
  if (body.highlights!==undefined) {
    if (!Array.isArray(body.highlights) || body.highlights.length>30) fail('Invalid highlights.','highlights','length');
    (body.highlights as unknown[]).forEach((value,index)=>text(value,`highlights.${index}`,500,true));
  }
  if (body.year!==undefined && !/^(19|20|21)\d{2}$/.test(String(body.year))) throw new CmsInputError({year:'invalid'});
  for (const key of ['date','deadline']) if (body[key] && body[key]!==legacyBody?.[key]) {
    const date=String(body[key]);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10)!==date) throw new CmsInputError({[key]:'date'});
  }
  if (body.email!==undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email))) fail('Enter a valid email address.','email');
  const portraits:string[]=[];
  if (kind==='organizational_chart' && body.nodes!==undefined) {
    portraits.push(...validateOfficials(body.nodes,'nodes',legacyBody));
    for (const key of ['mayor','level2','departments']) if(body[key]!==undefined && (!legacyBody || JSON.stringify(body[key])!==JSON.stringify(legacyBody[key]))) fail('Imported chart details must be retained unchanged.','body','unsupported');
  }
  else if (kind==='organizational_chart') {
    official(body.mayor,'mayor');
    for (const key of ['level2','departments']) {
      if (!Array.isArray(body[key]) || body[key].length>100) fail('Invalid chart level.',key,'chart');
      (body[key] as unknown[]).forEach((entry,index)=>official(entry,`${key}.${index}`));
    }
  }
  if (kind==='departments' && body.officials!==undefined) portraits.push(...validateOfficials(body.officials,'officials',legacyBody));
  if (body.featuredAssetId!==undefined && (typeof body.featuredAssetId!=='string' || !uuid.test(body.featuredAssetId))) throw new CmsInputError({featuredAssetId:'featured_photo'});
  if (body.attachments!==undefined && (!Array.isArray(body.attachments) || body.attachments.length>50)) throw new CmsInputError({attachments:'length'});
  const attachments=(body.attachments ?? []) as ContentAttachment[];
  const seen=new Set<string>();
  for (const [index,attachment] of attachments.entries()) {
    if (!attachment || Object.keys(attachment).some(key=>!['assetId','caption','altText'].includes(key)) || !uuid.test(attachment.assetId) || seen.has(attachment.assetId)) throw new CmsInputError({attachments:'invalid'});
    seen.add(attachment.assetId);
    text(attachment.caption,`attachments.${index}.caption`,1000,true);
    text(attachment.altText,`attachments.${index}.altText`,500);
  }
  if (portraits.some(id=>!seen.has(id))) throw new CmsInputError({attachments:'featured_photo'});
  return { body, attachments, assetIds:[...new Set([...(body.featuredAssetId?[String(body.featuredAssetId)]:[]),...seen])].sort() };
}
