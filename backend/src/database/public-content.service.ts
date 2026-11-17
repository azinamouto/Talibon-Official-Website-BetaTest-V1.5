import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { runtimeConnectionConfig, PostgresDatabase } from './postgres';

export const PUBLIC_KINDS = ['barangays','departments','officials','news','pages','tourism_spots','events','navigation','downloadables','ordinances','resolutions','citizens_charter_cms','services_cms',
  'advisories','updates','tourism_festivals','tourism_delicacies','transparency_reports','organizational_chart','galleries'] as const;

/** Read only approved publication views; never exposes source approval or draft rows. */
@Injectable()
export class PublicContentService {
  private database: PostgresDatabase;
  configure(database: PostgresDatabase) { this.database = database; }
  async query<T>(work: Parameters<PostgresDatabase['transaction']>[0]): Promise<T> {
    try {
      this.database ??= new PostgresDatabase(runtimeConnectionConfig(process.env.DATABASE_URL));
      return await this.database.transaction(work, true) as T;
    } catch { throw new ServiceUnavailableException('Public content is temporarily unavailable.'); }
  }
  async list(kind: string, page = 1, limit = 50, filters: { slug?: string; q?: string; category?: string; office_responsible?: string; id?: string } = {}) {
    if (!(PUBLIC_KINDS as readonly string[]).includes(kind) || !Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) throw new BadRequestException('Invalid public content query.');
    const values: unknown[] = [kind==='news'?['news','advisories','updates']:[kind]];
    const clauses = ['kind=ANY($1::text[])'];
    for (const [key, value] of Object.entries(filters)) {
      if (!value) continue;
      values.push(key === 'q' ? `%${value.replace(/[\\%_]/g, '\\$&')}%` : value);
      const n = values.length;
      if (key === 'id') clauses.push(`(id::text=$${n} OR legacy_id=$${n})`);
      else if (key === 'slug') clauses.push(`slug=$${n}`);
      else if (key === 'q') clauses.push(`title ILIKE $${n}`);
      else if (key === 'category') clauses.push(`(CASE WHEN kind='advisories' THEN 'ADVISORY' WHEN kind='updates' THEN 'UPDATE' ELSE body->>'category' END)=$${n}`);
      else if (key === 'office_responsible') clauses.push(`body->>'office_responsible'=$${n}`);
      else throw new BadRequestException('Invalid filter.');
    }
    return this.query<{ data: Record<string, any>[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(async tx => {
      const where = clauses.join(' AND ');
      const [count] = await tx.query(`SELECT count(*)::int AS total FROM app.published_content WHERE ${where}`, values);
      const rows = await tx.query(`SELECT * FROM app.published_content WHERE ${where} ORDER BY published_at DESC,id LIMIT $${values.length+1} OFFSET $${values.length+2}`, [...values,limit,(page-1)*limit]);
      if (rows.some(row => /https?:\/\/[^/\s]+\/(storage|rest|auth)\/v1/i.test(JSON.stringify(row.body)))) throw new Error('Unmigrated content reference');
      const assets=rows.length ? await tx.query(`SELECT l.content_id,m.id,m.kind,m.title,m.alt_text,m.bytes,m.sha256
        FROM app.content_asset_links l JOIN app.published_media m ON m.id=l.asset_id WHERE l.content_id=ANY($1::uuid[])`,[rows.map(row=>row.id)]) : [];
      const data=rows.map(row=>{
        const body=row.body as Record<string,any>;
        const media=assets.filter(asset=>asset.content_id===row.id);
        const featured=media.find(asset=>asset.id===body.featuredAssetId);
        const attachments=(Array.isArray(body.attachments)?body.attachments:[]).flatMap(item=>{
          const asset=media.find(value=>value.id===item.assetId);
          return asset?[{id:asset.id,kind:asset.kind,title:asset.title,caption:item.caption,alt_text:item.altText || asset.alt_text,
            bytes:asset.bytes,sha256:asset.sha256,download_url:`/api/media/${asset.id}/download`,preview_url:`/api/media/${asset.id}/preview`}]:[];
        });
        const firstDocument=attachments.find(asset=>asset.kind==='document');
        const officials=(entries:Record<string,any>[])=>(entries || []).map(entry=>{
          const photo=media.find(asset=>asset.id===entry.photoAssetId && asset.kind==='photo');
          return {...entry,...(photo?{image_url:`/api/media/${photo.id}/preview`}:{})};
        });
        return {...body,kind:row.kind,id:row.id,slug:row.slug,title:row.title,name:body.name ?? row.title,
          ...(row.kind==='departments'?{department:row.title,name:row.title,officialName:row.title,...(Array.isArray(body.officials)?{officials:officials(body.officials)}:{})}:{}),
          ...(row.kind==='organizational_chart' && Array.isArray(body.nodes)?{nodes:officials(body.nodes)}:{}),
          ...(['events','tourism_festivals'].includes(row.kind) && body.start_time?{time:[body.start_time,body.end_time].filter(Boolean).join(' - ')}:{}),
          ...(row.kind==='tourism_spots'?{contact_details:body.contact_details ?? body.contact,gallery_images:attachments.filter(asset=>asset.kind==='photo').map(asset=>asset.preview_url)}:{}),
          ...(['news','advisories','updates'].includes(row.kind)?{date:body.date || row.published_at,category:row.kind==='advisories'?'ADVISORY':row.kind==='updates'?'UPDATE':body.category}:{}),
          ...(featured?{image_url:`/api/media/${featured.id}/preview`,featured_image:`/api/media/${featured.id}/preview`,banner_image:`/api/media/${featured.id}/preview`,image_alt:attachments.find(asset=>asset.id===featured.id)?.alt_text || featured.alt_text}:{}),
          ...(firstDocument?{file_url:firstDocument.download_url,url:firstDocument.download_url}:{}),
          ...(body.attachments!==undefined?{attachments}:{}),created_at:row.published_at};
      });
      return { data, pagination: { page, limit, total: count.total, totalPages: Math.ceil(count.total/limit) } };
    });
  }
  async pageItems(slug: string) {
    const page = (await this.list('pages',1,1,{slug})).data[0];
    return Array.isArray(page?.items) ? page.items : [];
  }
  async onModuleDestroy() { await this.database?.close(); }
}
