import { BadRequestException } from '@nestjs/common';

export const MUNICIPAL_KINDS = ['news','advisories','updates','tourism_spots','tourism_festivals',
  'tourism_delicacies','transparency_reports','pages','organizational_chart','departments','galleries','downloadables'] as const;
export const REPORT_CATEGORIES = ['full-disclosure','infrastructure','finance','budget','bidding','executive-order'] as const;
export type ContentAttachment = { assetId: string; caption: string; altText: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fields: Record<string, string[]> = {
  news:['summary','content','category','author','date'], advisories:['summary','content','author','date'], updates:['summary','content','author','date'],
  tourism_spots:['description','location','address','contact','opening_hours'], tourism_festivals:['description','date','venue','time'], tourism_delicacies:['description'],
  transparency_reports:['description','category','year','date','deadline','budget','status','reference'],
  pages:['content'], organizational_chart:['mayor','level2','departments'],
  departments:['description','head','contact','address'], galleries:['description','category'], downloadables:['description','category','year','reference'],
};
const fail = (message: string): never => { throw new BadRequestException(message); };
function text(value: unknown, label: string, max: number, required = false) {
  if (value === undefined && !required) return;
  if (typeof value !== 'string' || value.length > max || (required && !value.trim()) || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value)) fail(`Invalid ${label}.`);
}
function official(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('Chart entries require a name and role.');
  const row=value as Record<string,unknown>;
  if (Object.keys(row).some(key=>!['name','role'].includes(key))) fail('Chart portraits must use the media library.');
  text(row.name,'official name',200,true); text(row.role,'official role',200,true);
}
/** Plain text and explicit municipal metadata only; never store executable markup or arbitrary URLs. */
export function validateMunicipal(kind: string, input: { title?: string; slug?: string; sourceId?: string; body?: Record<string,unknown> }, legacyBody?: Record<string,unknown>) {
  if (!(MUNICIPAL_KINDS as readonly string[]).includes(kind)) fail('Unknown municipal module.');
  text(input.title,'title',200,true);
  if (!input.slug || input.slug.length>160 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)) fail('Use a lowercase hyphenated slug.');
  if (!input.sourceId || !uuid.test(input.sourceId)) fail('Select a source record.');
  if (kind==='pages' && !['executive-mandate','legislative-mandate'].includes(input.slug)) fail('Select an executive or legislative mandate.');
  if (kind==='organizational_chart' && input.slug!=='executive-chart') fail('The organizational chart slug is executive-chart.');
  const body=input.body;
  if (!body || typeof body!=='object' || Array.isArray(body) || Buffer.byteLength(JSON.stringify(body))>180000) fail('Invalid content body.');
  // Imported R2 metadata may be retained unchanged. It is never a back door for
  // new URL fields or arbitrary metadata, and existing official details survive editing.
  if (Object.keys(body).some(key=>!fields[kind].includes(key) && !['featuredAssetId','attachments'].includes(key)
    && !(legacyBody && Object.hasOwn(legacyBody,key) && JSON.stringify(legacyBody[key])===JSON.stringify(body[key])))) fail('Unsupported metadata field.');
  for (const key of fields[kind]) {
    if (kind==='organizational_chart') continue;
    text(body[key],key,key==='content'?100000:key==='description'?10000:key==='summary'?2000:500);
  }
  if (['news','advisories','updates','pages'].includes(kind)) text(body.content,'content',100000,true);
  if (['news','advisories','updates'].includes(kind)) text(body.summary,'summary',2000,true);
  if (kind==='news' && !['ARTICLE','ANNOUNCEMENT','NOTICE','ADVISORY','UPDATE'].includes(String(body.category))) fail('Choose a municipal news category.');
  if (kind==='transparency_reports' && !(REPORT_CATEGORIES as readonly string[]).includes(String(body.category))) fail('Choose a transparency category.');
  if (kind==='downloadables') text(body.category,'document category',100,true);
  if (kind==='galleries' && !['municipal','tourism'].includes(String(body.category))) fail('Choose a municipal or tourism collection.');
  if (['tourism_spots','tourism_festivals','tourism_delicacies','departments'].includes(kind)) text(body.description,'description',10000,true);
  if (body.year!==undefined && !/^(19|20|21)\d{2}$/.test(String(body.year))) fail('Use a four digit year.');
  for (const key of ['date','deadline']) if (body[key] && body[key]!==legacyBody?.[key]) {
    const date=String(body[key]);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10)!==date) fail('Use a valid ISO calendar date.');
  }
  if (kind==='organizational_chart') {
    official(body.mayor);
    for (const key of ['level2','departments']) {
      if (!Array.isArray(body[key]) || body[key].length>100) fail('Invalid chart level.');
      (body[key] as unknown[]).forEach(official);
    }
  }
  if (body.featuredAssetId!==undefined && (typeof body.featuredAssetId!=='string' || !uuid.test(body.featuredAssetId))) fail('Select a featured photo.');
  if (body.attachments!==undefined && (!Array.isArray(body.attachments) || body.attachments.length>50)) fail('At most 50 attachments are allowed.');
  const attachments=(body.attachments ?? []) as ContentAttachment[];
  const seen=new Set<string>();
  for (const attachment of attachments) {
    if (!attachment || Object.keys(attachment).some(key=>!['assetId','caption','altText'].includes(key)) || !uuid.test(attachment.assetId) || seen.has(attachment.assetId)) fail('Invalid or duplicate attachment.');
    seen.add(attachment.assetId); text(attachment.caption,'caption',1000,true); text(attachment.altText,'alternative text',500);
  }
  return { body, attachments, assetIds:[...new Set([...(body.featuredAssetId?[String(body.featuredAssetId)]:[]),...seen])].sort() };
}
