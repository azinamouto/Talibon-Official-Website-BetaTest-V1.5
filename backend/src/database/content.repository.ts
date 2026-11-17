import { randomUUID } from 'node:crypto';
import { DatabaseError, PostgresDatabase, SqlSession } from './postgres';
import { StaffPrincipal } from '../authentication/authentication.adapter';
import { authorizeStaff } from './staff-authorization';
import { MUNICIPAL_KINDS, validateMunicipal } from '../api/content/municipal-schema';
import { CmsValidationError } from './cms-validation';
import { CmsInputError } from '../security/cms-validation';
import { contentSlug } from '../api/content/content-slug';
import { publishAttachedMedia, type MediaPublication } from './media.repository';
export interface ContentInput { title: string; slug: string; sourceId: string; body: Record<string, unknown>; status?: string; version?: number; }
export class ContentRepository {
  constructor(private readonly db: PostgresDatabase) {}
  list(actor: StaffPrincipal, kind: string, page: number, limit: number, id?: string, filters: { q?: string; publication?: string; slug?: string } = {}) {
    return this.db.transaction(async tx => {
      await authorizeStaff(tx,actor);
      const values=[kind,id || null,filters.q ? `%${filters.q.replace(/[\\%_]/g,'\\$&')}%` : null,filters.publication || null,filters.slug || null];
      const where='kind=$1 AND deleted_at IS NULL AND ($2::uuid IS NULL OR id=$2::uuid) AND ($3::text IS NULL OR title ILIKE $3) AND ($4::text IS NULL OR publication=$4) AND ($5::text IS NULL OR slug=$5)';
      const [count]=await tx.query(`SELECT count(*)::int AS total FROM app.public_content WHERE ${where}`,values);
      const data=await tx.query(`SELECT * FROM app.public_content WHERE ${where} ORDER BY updated_at DESC,id LIMIT $6 OFFSET $7`,[...values,limit,(page-1)*limit]);
      return {data,pagination:{page,limit,total:count.total,totalPages:Math.ceil(count.total/limit)}};
    });
  }
  dashboard(actor: StaffPrincipal) {
    return this.db.transaction(async tx=>{
      await authorizeStaff(tx,actor);
      const counts=await tx.query(`SELECT kind,publication,count(*)::int AS total FROM app.public_content
        WHERE deleted_at IS NULL AND kind=ANY($1::text[]) GROUP BY kind,publication ORDER BY kind,publication`,[[...MUNICIPAL_KINDS]]);
      const media=await tx.query(`SELECT kind,publication,count(*)::int AS total FROM app.media_assets WHERE deleted_at IS NULL GROUP BY kind,publication`);
      const recent=await tx.query(`SELECT c.id,c.kind,c.title,c.publication,c.updated_at FROM app.public_content c
        WHERE c.deleted_at IS NULL AND c.kind=ANY($1::text[]) ORDER BY c.updated_at DESC,c.id LIMIT 8`,[[...MUNICIPAL_KINDS]]);
      const activity=await tx.query(`SELECT action,resource_id,occurred_at FROM app.audit_events WHERE actor_id=$1 ORDER BY occurred_at DESC,id LIMIT 10`,[actor.id]);
      return {counts,media,recent,activity};
    });
  }
  sources(actor: StaffPrincipal) {
    return this.db.transaction(async tx=>{
      await authorizeStaff(tx,actor);
      return {data:await tx.query('SELECT id,reference,owner,sha256,approved,reviewed_at FROM app.content_sources ORDER BY reference,id LIMIT 500')};
    });
  }
  createSource(actor: StaffPrincipal,input: { reference: string; owner: string; sha256: string },request: string) {
    return this.db.transaction(async tx=>{
      await authorizeStaff(tx,actor,true);
      const [row]=await tx.query('INSERT INTO app.content_sources(reference,owner,sha256) VALUES($1,$2,$3) RETURNING *',[input.reference,input.owner,input.sha256]);
      await this.audit(tx,actor,'source.create',row.id,request);
      return {data:row};
    });
  }
  approveSource(actor: StaffPrincipal,id: string,request: string) {
    return this.db.transaction(async tx=>{
      await authorizeStaff(tx,actor,true);
      await tx.query('SELECT app.approve_content_source($1,$2,$3,$4,$5)',[actor.id,actor.subject,actor.sessionId,id,request]);
      return {approved:true};
    });
  }
  private audit(tx: SqlSession,actor: StaffPrincipal,action: string,id: string,request: string) {
    return tx.query('INSERT INTO app.audit_events(actor_id,action,resource_id,request_id) VALUES($1,$2,$3,$4)',[actor.id,action,id,request]);
  }
  private async assets(tx: SqlSession,kind: string,input: ContentInput,publishing=false,legacyBody?: Record<string,unknown>,exclusive=false) {
    let checked: ReturnType<typeof validateMunicipal>;
    try { checked=validateMunicipal(kind,input,legacyBody); }
    catch (error) { throw error instanceof CmsInputError ? new CmsValidationError(error.fields) : new DatabaseError('invalid'); }
    const rows=checked.assetIds.length ? await tx.query(`SELECT m.id,m.kind,m.processing,m.deleted_at,m.alt_text,
      EXISTS(SELECT 1 FROM app.published_media p WHERE p.id=m.id) AS visible FROM app.media_assets m WHERE m.id=ANY($1::uuid[]) ORDER BY m.id FOR ${exclusive?'UPDATE':'SHARE'} OF m`,[checked.assetIds]) : [];
    if (rows.length!==checked.assetIds.length || rows.some(row=>row.deleted_at || row.processing!=='ready')) throw new CmsValidationError({attachments:'attachment_missing'});
    if (publishing && rows.some(row=>!row.visible)) throw new CmsValidationError({attachments:'attachment_private'});
    if (input.body.featuredAssetId && rows.find(row=>row.id===input.body.featuredAssetId)?.kind!=='photo') throw new CmsValidationError({featuredAssetId:'featured_photo'});
    if (kind==='galleries' && rows.some(row=>row.kind!=='photo')) throw new CmsValidationError({attachments:'gallery_photo'});
    for (const [index,attachment] of checked.attachments.entries()) if (rows.find(row=>row.id===attachment.assetId)?.kind==='photo' && !attachment.altText?.trim()) throw new CmsValidationError({[`attachments.${index}.altText`]:'photo_alt'});
    if (publishing && ['downloadables','transparency_reports'].includes(kind) && !checked.attachments.some(a=>rows.find(row=>row.id===a.assetId)?.kind==='document')) throw new CmsValidationError({attachments:'document_required'});
    if (publishing && kind==='galleries' && !checked.attachments.length) throw new CmsValidationError({attachments:'gallery_required'});
    return checked.assetIds;
  }
  save(actor: StaffPrincipal,kind: string,input: Partial<ContentInput>,request: string,id?: string,publish=false,media?: MediaPublication[]) {
    return this.db.transaction(async tx=>{
      await authorizeStaff(tx,actor);
      let prior: Record<string,any> | undefined;
      if (id) {
        [prior]=await tx.query('SELECT * FROM app.public_content WHERE id=$1 AND kind=$2 AND version=$3 AND deleted_at IS NULL FOR UPDATE',[id,kind,input.version]);
        if (!prior || !['draft',...(publish?['published']:[])].includes(prior.publication)) throw new DatabaseError('conflict');
      }
      if (input.status!==undefined && input.status!=='draft') throw new DatabaseError('invalid');
      const title=input.title ?? prior?.title;
      if (typeof title!=='string' || !title.trim()) throw new CmsValidationError({title:'required'});
      const slug=input.slug ?? prior?.slug ?? (kind==='organizational_chart'?'executive-chart':await contentSlug(tx,kind,title));
      const body=input.body ?? prior?.body;
      if (['news','advisories','updates'].includes(kind) && body && body.summary===undefined && typeof body.content==='string') body.summary=body.content.trim().slice(0,280);
      const merged={title,slug,sourceId:input.sourceId ?? prior?.source_id,body} as ContentInput;
      const ids=await this.assets(tx,kind,merged,false,prior?.body,publish);
      if (publish) {
        await publishAttachedMedia(tx,actor,merged.body,ids,media,request);
        await this.assets(tx,kind,merged,true,prior?.body);
        const [approved]=await tx.query('SELECT id FROM app.content_sources WHERE id=$1 AND approved',[merged.sourceId]);
        if (!approved) throw new CmsValidationError({sourceId:'source_unapproved'});
      }
      const [source]=await tx.query('SELECT id FROM app.content_sources WHERE id=$1',[merged.sourceId]);
      if (!source) throw new CmsValidationError({sourceId:'source_missing'});
      const values=[merged.title,merged.slug,JSON.stringify(merged.body),merged.sourceId];
      const [row]=id ? await tx.query(`UPDATE app.public_content SET title=$1,slug=$2,body=$3,source_id=$4,version=version+1,updated_at=now() WHERE id=$5 RETURNING *`,[...values,id])
        : await tx.query(`INSERT INTO app.public_content(title,slug,body,source_id,kind,legacy_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[...values,kind,randomUUID()]);
      await tx.query('DELETE FROM app.content_asset_links WHERE content_id=$1',[row.id]);
      if (ids.length) await tx.query('INSERT INTO app.content_asset_links(content_id,asset_id) SELECT $1,unnest($2::uuid[])',[row.id,ids]);
      await this.audit(tx,actor,id?'content.update':'content.create',row.id,request);
      if (publish) {
        const [published]=await tx.query("UPDATE app.public_content SET publication='published',published_at=now(),version=version+1,updated_at=now() WHERE id=$1 RETURNING *",[row.id]);
        await this.audit(tx,actor,'content.publish',row.id,request);
        return {data:published};
      }
      return {data:row};
    });
  }
  change(actor: StaffPrincipal,kind: string,id: string,version: number,action: string,request: string,media?: MediaPublication[]) {
    return this.db.transaction(async tx=>{
      await authorizeStaff(tx,actor,action==='delete');
      const [prior]=await tx.query('SELECT * FROM app.public_content WHERE id=$1 AND kind=$2 AND version=$3 AND deleted_at IS NULL FOR UPDATE',[id,kind,version]);
      if (!prior) throw new DatabaseError('conflict');
      const allowed: Record<string,string[]>={publish:['draft'],unpublish:['published'],archive:['draft','published'],restore:['archived'],delete:['draft','published','archived']};
      if (!allowed[action]?.includes(prior.publication)) throw new DatabaseError('conflict');
      if (action==='publish') {
        const ids=await this.assets(tx,kind,{title:prior.title,slug:prior.slug,sourceId:prior.source_id,body:prior.body},false,prior.body,true);
        await publishAttachedMedia(tx,actor,prior.body,ids,media,request);
        await this.assets(tx,kind,{title:prior.title,slug:prior.slug,sourceId:prior.source_id,body:prior.body},true,prior.body);
        // The existing SECURITY DEFINER publication trigger locks this source.
        // Runtime must not gain UPDATE privileges just to take a source row lock.
        const [source]=await tx.query('SELECT id FROM app.content_sources WHERE id=$1 AND approved',[prior.source_id]);
        if (!source) throw new CmsValidationError({sourceId:'source_unapproved'});
      }
      const publication=action==='publish'?'published':['archive','delete'].includes(action)?'archived':'draft';
      const [row]=await tx.query(`UPDATE app.public_content SET publication=$1,published_at=CASE WHEN $1='published' THEN now() ELSE NULL END,
        deleted_at=CASE WHEN $2='delete' THEN now() ELSE NULL END,version=version+1,updated_at=now() WHERE id=$3 RETURNING *`,[publication,action,id]);
      await this.audit(tx,actor,`content.${action}`,id,request);
      return {data:row};
    });
  }
  remove(actor: StaffPrincipal,kind: string,id: string,version: number,request: string) { return this.change(actor,kind,id,version,'delete',request); }
}
