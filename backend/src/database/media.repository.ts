import { authorizeStaff } from './staff-authorization';
import { DatabaseError, PostgresDatabase } from './postgres';
import { MediaInput, PgRepositories } from './repositories';
import { StaffPrincipal } from '../authentication/authentication.adapter';
import { CmsValidationError } from './cms-validation';
import type { SqlSession } from './postgres';

export type StaffMediaFilters = { kind?: string; q?: string; ready?: boolean; publication?: string; categoryId?: string };
export type MediaPublication = { assetId: string; version: number };

export async function publishAttachedMedia(tx: SqlSession, actor: StaffPrincipal, body: Record<string,any>, ids: string[], consent: MediaPublication[] | undefined, request: string) {
  if (consent===undefined) return;
  if (consent.length>50 || new Set(consent.map(item=>item.assetId)).size!==consent.length || consent.some(item=>!ids.includes(item.assetId) || !Number.isInteger(item.version) || item.version<1)) throw new CmsValidationError({attachments:'invalid'});
  // Lock all selected media in a stable order before changing any publication.
  const rows=consent.length?await tx.query('SELECT * FROM app.media_assets WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE',[consent.map(item=>item.assetId)]):[];
  if (rows.length!==consent.length) throw new CmsValidationError({attachments:'attachment_missing'});
  for (const row of rows) {
    if (row.version!==consent.find(item=>item.assetId===row.id)?.version) throw new DatabaseError('conflict');
    if (row.deleted_at || row.processing!=='ready') throw new CmsValidationError({attachments:'attachment_missing'});
    const [category]=await tx.query('SELECT id FROM app.media_categories WHERE id=$1 AND kind=$2 AND approved',[row.category_id,row.kind]);
    const [source]=await tx.query('SELECT id FROM app.content_sources WHERE id=$1 AND approved',[row.source_id]);
    if (!category) throw new CmsValidationError({attachments:'category_unapproved'});
    if (!source) throw new CmsValidationError({attachments:'source_unapproved'});
    if (row.publication==='published') continue;
    const altText=row.alt_text || body.attachments?.find((item:any)=>item.assetId===row.id)?.altText || '';
    if (row.kind==='photo' && !altText.trim()) throw new CmsValidationError({attachments:'photo_alt'});
    await tx.query("UPDATE app.media_assets SET publication='published',published_at=now(),alt_text=$1,updated_by=$2,version=version+1,updated_at=now() WHERE id=$3",[altText,actor.id,row.id]);
    await tx.query("INSERT INTO app.audit_events(actor_id,action,resource_id,request_id) VALUES($1,'media.publish',$2,$3)",[actor.id,row.id,request]);
  }
}

export class MediaRepository extends PgRepositories {
  constructor(private readonly mediaDb: PostgresDatabase) { super(mediaDb); }
  async throttle(actor: StaffPrincipal) {
    return this.mediaDb.transaction(async tx => {
      await authorizeStaff(tx, actor);
      const [row] = await tx.query(`INSERT INTO app.media_throttle(actor_id,attempts) VALUES($1,1)
        ON CONFLICT(actor_id) DO UPDATE SET attempts=CASE WHEN media_throttle.started_at<now()-interval '1 minute' THEN 1 ELSE media_throttle.attempts+1 END,
        started_at=CASE WHEN media_throttle.started_at<now()-interval '1 minute' THEN now() ELSE media_throttle.started_at END RETURNING attempts`, [actor.id]);
      return row.attempts <= 10;
    });
  }
  listPublic(kind: string, page: number) {
    return this.mediaDb.transaction(tx => tx.query(`SELECT p.id,p.kind,p.title,p.description,p.alt_text,p.mime,p.bytes::int AS bytes,p.published_at,c.title AS category
      FROM app.published_media p JOIN app.media_categories c ON c.id=p.category_id
      WHERE ($1='' OR p.kind=$1) ORDER BY p.published_at DESC,p.id LIMIT 51 OFFSET $2`, [kind,(page-1)*50]), true);
  }
  listStaff(actor: StaffPrincipal, page: number, filters: StaffMediaFilters = {}) {
    return this.mediaDb.transaction(async tx => {
      await authorizeStaff(tx, actor);
      return tx.query(`SELECT * FROM app.media_assets WHERE deleted_at IS NULL
        AND ($2::text IS NULL OR kind=$2) AND (NOT $3::boolean OR processing='ready')
        AND ($4::text IS NULL OR title ILIKE $4 OR original_filename ILIKE $4)
        AND ($5::text IS NULL OR publication=$5) AND ($6::uuid IS NULL OR category_id=$6)
        ORDER BY created_at DESC,id LIMIT 51 OFFSET $1`, [(page-1)*50, filters.kind || null, !!filters.ready,
        filters.q ? `%${filters.q.replace(/[\\%_]/g,'\\$&')}%` : null,filters.publication || null,filters.categoryId || null]);
    });
  }
  options(actor: StaffPrincipal) {
    return this.mediaDb.transaction(async tx => {
      await authorizeStaff(tx, actor);
      return { categories: await tx.query('SELECT id,kind,title,approved FROM app.media_categories ORDER BY title LIMIT 500'),
        sources: await tx.query('SELECT id,reference,approved,reviewed_at FROM app.content_sources ORDER BY reference LIMIT 500') };
    });
  }
  private async metadataRules(tx: SqlSession, categoryId: string, sourceId: string, kind: string, publishing = false) {
    const [category] = await tx.query('SELECT id,kind,approved FROM app.media_categories WHERE id=$1',[categoryId]);
    if (!category) throw new CmsValidationError({categoryId:'category_missing'});
    if (category.kind !== kind) throw new CmsValidationError({categoryId:'category_kind'});
    const [source] = await tx.query('SELECT id,approved FROM app.content_sources WHERE id=$1',[sourceId]);
    if (!source) throw new CmsValidationError({sourceId:'source_missing'});
    if (publishing && !category.approved) throw new CmsValidationError({categoryId:'category_unapproved'});
    if (publishing && !source.approved) throw new CmsValidationError({sourceId:'source_unapproved'});
    // Foreign keys and the publication trigger remain authoritative, including
    // concurrent approval changes. Do not grant runtime UPDATE just to lock choices.
  }
  reserve(actor: StaffPrincipal, input: MediaInput, filename: string, request: string) {
    return this.mediaDb.transaction(async tx => {
      await authorizeStaff(tx, actor);
      await this.metadataRules(tx,input.categoryId,input.sourceId,input.kind);
      const [created] = await tx.query(`INSERT INTO app.media_assets
        (kind,category_id,source_id,title,description,alt_text,object_key,mime,bytes,sha256,created_by,updated_by,original_filename)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11,$12) ON CONFLICT(object_key) DO NOTHING RETURNING *`,
      [input.kind,input.categoryId,input.sourceId,input.title,input.description,input.altText,input.objectKey,input.mime,input.bytes,input.sha256,actor.id,filename]);
      if (created) {
        await tx.query("INSERT INTO app.audit_events(actor_id,action,resource_id,request_id) VALUES($1,'media.create',$2,$3)", [actor.id,created.id,request]);
        return created;
      }
      const [prior] = await tx.query('SELECT * FROM app.media_assets WHERE object_key=$1 FOR UPDATE', [input.objectKey]);
      if (!prior || prior.created_by !== actor.id || prior.sha256 !== input.sha256 || prior.bytes != input.bytes || prior.deleted_at || prior.mime !== input.mime
        || prior.category_id !== input.categoryId || prior.source_id !== input.sourceId || prior.original_filename !== filename
        || prior.title !== input.title || prior.description !== input.description || prior.alt_text !== input.altText) throw new DatabaseError('conflict');
      return prior;
    });
  }
  ready(actor: StaffPrincipal, id: string, request: string) {
    return this.mediaDb.transaction(async tx => {
      await authorizeStaff(tx, actor);
      const [row] = await tx.query("UPDATE app.media_assets SET processing='ready',updated_at=now(),version=version+1 WHERE id=$1 AND processing='pending' AND deleted_at IS NULL RETURNING *", [id]);
      if (!row) throw new DatabaseError('conflict');
      await tx.query('INSERT INTO app.media_revisions(asset_id,object_key,sha256,bytes,mime,actor_id) VALUES($1,$2,$3,$4,$5,$6)', [id,row.object_key,row.sha256,row.bytes,row.mime,actor.id]);
      await tx.query("INSERT INTO app.audit_events(actor_id,action,resource_id,request_id) VALUES($1,'media.update',$2,$3)", [actor.id,id,request]);
      return row;
    });
  }
  get(id: string, actor?: StaffPrincipal) {
    return this.mediaDb.transaction(async tx => {
      if (actor) await authorizeStaff(tx,actor);
      const [row] = await tx.query(`SELECT m.* FROM app.media_assets m WHERE m.id=$1 AND m.deleted_at IS NULL AND m.processing='ready'
        ${actor ? '' : 'AND EXISTS(SELECT 1 FROM app.published_media p WHERE p.id=m.id)'}`, [id]);
      return row;
    });
  }
  change(actor: StaffPrincipal, id: string, version: number, action: string, data: { title?: string; description?: string; altText?: string; categoryId?: string }, request: string) {
    return this.mediaDb.transaction(async tx => {
      await authorizeStaff(tx, actor, action === 'delete');
      const [row] = await tx.query('SELECT * FROM app.media_assets WHERE id=$1 AND version=$2 AND deleted_at IS NULL FOR UPDATE', [id,version]);
      if (!row) throw new DatabaseError('conflict');
      if (action === 'edit' || action === 'publish') {
        await this.metadataRules(tx, action === 'edit' ? data.categoryId : row.category_id, row.source_id, row.kind, row.publication === 'published' || action === 'publish');
        if ((row.publication === 'published' || action === 'publish') && row.kind === 'photo' && !(data.altText ?? row.alt_text)?.trim()) throw new CmsValidationError({altText:'photo_alt'});
      }
      if (action === 'edit') await tx.query('UPDATE app.media_assets SET title=$1,description=$2,alt_text=$3,category_id=$4 WHERE id=$5', [data.title,data.description,data.altText,data.categoryId,id]);
      else if (action === 'delete') await tx.query("UPDATE app.media_assets SET publication='draft',published_at=NULL,deleted_at=now() WHERE id=$1", [id]);
      else await tx.query("UPDATE app.media_assets SET publication=$1,published_at=CASE WHEN $1='published' THEN now() ELSE NULL END WHERE id=$2", [action === 'publish' ? 'published' : 'draft',id]);
      const [updated] = await tx.query('UPDATE app.media_assets SET updated_by=$1,updated_at=now(),version=version+1 WHERE id=$2 RETURNING *', [actor.id,id]);
      await tx.query('INSERT INTO app.audit_events(actor_id,action,resource_id,request_id) VALUES($1,$2,$3,$4)', [actor.id,`media.${action === 'edit' ? 'update' : action}`,id,request]);
      return updated;
    });
  }
}
