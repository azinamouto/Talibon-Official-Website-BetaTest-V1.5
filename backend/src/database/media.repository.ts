import { DatabaseError, PostgresDatabase, SqlSession } from './postgres';
import { MediaInput, PgRepositories } from './repositories';
import { StaffPrincipal } from '../authentication/authentication.adapter';

export class MediaRepository extends PgRepositories {
  constructor(private readonly mediaDb: PostgresDatabase) { super(mediaDb); }
  private async actor(tx: SqlSession, actor: StaffPrincipal, fresh = false) {
    if (!actor?.sessionVerified || actor.assurance !== 'mfa') throw new DatabaseError('forbidden');
    const rows = await tx.query(`SELECT a.id FROM app.staff_accounts a
      JOIN public.r2_auth_user u ON u.id=a.subject JOIN public.r2_auth_session s ON s."userId"=u.id
      JOIN app.staff_session_assurance m ON m.session_id=s.id
      WHERE a.id=$1 AND a.provider='better-auth' AND a.subject=$2 AND a.active
      AND a.role IN ('admin','editor') AND u."emailVerified" AND u."twoFactorEnabled"
      AND s.id=$3 AND s."expiresAt">now() AND m.verified_at>now()-($4::int * interval '1 second')
      AND (NOT $5::boolean OR a.role='admin') FOR SHARE OF a,s,m`,
    [actor.id, actor.subject, actor.sessionId, fresh ? 300 : 28800, fresh]);
    if (!rows.length) throw new DatabaseError('forbidden');
  }
  async throttle(actor: StaffPrincipal) {
    return this.mediaDb.transaction(async tx => {
      await this.actor(tx, actor);
      const [row] = await tx.query(`INSERT INTO app.media_throttle(actor_id,attempts) VALUES($1,1)
        ON CONFLICT(actor_id) DO UPDATE SET attempts=CASE WHEN media_throttle.started_at<now()-interval '1 minute' THEN 1 ELSE media_throttle.attempts+1 END,
        started_at=CASE WHEN media_throttle.started_at<now()-interval '1 minute' THEN now() ELSE media_throttle.started_at END RETURNING attempts`, [actor.id]);
      return row.attempts <= 10;
    });
  }
  listStaff(actor: StaffPrincipal, page: number) {
    return this.mediaDb.transaction(async tx => {
      await this.actor(tx, actor);
      return tx.query('SELECT * FROM app.media_assets WHERE deleted_at IS NULL ORDER BY created_at DESC,id LIMIT 51 OFFSET $1', [(page-1)*50]);
    });
  }
  options(actor: StaffPrincipal) {
    return this.mediaDb.transaction(async tx => {
      await this.actor(tx, actor);
      return { categories: await tx.query('SELECT id,kind,title,approved FROM app.media_categories ORDER BY title LIMIT 500'),
        sources: await tx.query('SELECT id,reference,approved FROM app.content_sources ORDER BY reference LIMIT 500') };
    });
  }
  reserve(actor: StaffPrincipal, input: MediaInput, filename: string, request: string) {
    return this.mediaDb.transaction(async tx => {
      await this.actor(tx, actor);
      const [created] = await tx.query(`INSERT INTO app.media_assets
        (kind,category_id,source_id,title,description,alt_text,object_key,mime,bytes,sha256,created_by,updated_by,original_filename)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11,$12) ON CONFLICT(object_key) DO NOTHING RETURNING *`,
      [input.kind,input.categoryId,input.sourceId,input.title,input.description,input.altText,input.objectKey,input.mime,input.bytes,input.sha256,actor.id,filename]);
      if (created) {
        await tx.query("INSERT INTO app.audit_events(actor_id,action,resource_id,request_id) VALUES($1,'media.create',$2,$3)", [actor.id,created.id,request]);
        return created;
      }
      const [prior] = await tx.query('SELECT * FROM app.media_assets WHERE object_key=$1 FOR UPDATE', [input.objectKey]);
      if (!prior || prior.created_by !== actor.id || prior.sha256 !== input.sha256 || prior.bytes != input.bytes || prior.deleted_at || prior.mime !== input.mime) throw new DatabaseError('conflict');
      return prior;
    });
  }
  ready(actor: StaffPrincipal, id: string, request: string) {
    return this.mediaDb.transaction(async tx => {
      await this.actor(tx, actor);
      const [row] = await tx.query("UPDATE app.media_assets SET processing='ready',updated_at=now(),version=version+1 WHERE id=$1 AND processing='pending' AND deleted_at IS NULL RETURNING *", [id]);
      if (!row) throw new DatabaseError('conflict');
      await tx.query('INSERT INTO app.media_revisions(asset_id,object_key,sha256,bytes,mime,actor_id) VALUES($1,$2,$3,$4,$5,$6)', [id,row.object_key,row.sha256,row.bytes,row.mime,actor.id]);
      await tx.query("INSERT INTO app.audit_events(actor_id,action,resource_id,request_id) VALUES($1,'media.update',$2,$3)", [actor.id,id,request]);
      return row;
    });
  }
  get(id: string, actor?: StaffPrincipal) {
    return this.mediaDb.transaction(async tx => {
      if (actor) await this.actor(tx,actor);
      const [row] = await tx.query(`SELECT m.* FROM app.media_assets m WHERE m.id=$1 AND m.deleted_at IS NULL AND m.processing='ready'
        ${actor ? '' : 'AND EXISTS(SELECT 1 FROM app.published_media p WHERE p.id=m.id)'}`, [id]);
      return row;
    });
  }
  change(actor: StaffPrincipal, id: string, version: number, action: string, data: { title?: string; description?: string; altText?: string; categoryId?: string }, request: string) {
    return this.mediaDb.transaction(async tx => {
      await this.actor(tx, actor, action === 'delete');
      const [row] = await tx.query('SELECT * FROM app.media_assets WHERE id=$1 AND version=$2 AND deleted_at IS NULL FOR UPDATE', [id,version]);
      if (!row) throw new DatabaseError('conflict');
      if (action === 'edit') await tx.query('UPDATE app.media_assets SET title=$1,description=$2,alt_text=$3,category_id=$4 WHERE id=$5', [data.title,data.description,data.altText,data.categoryId,id]);
      else if (action === 'delete') await tx.query("UPDATE app.media_assets SET publication='draft',published_at=NULL,deleted_at=now() WHERE id=$1", [id]);
      else await tx.query("UPDATE app.media_assets SET publication=$1,published_at=CASE WHEN $1='published' THEN now() ELSE NULL END WHERE id=$2", [action === 'publish' ? 'published' : 'draft',id]);
      const [updated] = await tx.query('UPDATE app.media_assets SET updated_by=$1,updated_at=now(),version=version+1 WHERE id=$2 RETURNING *', [actor.id,id]);
      await tx.query('INSERT INTO app.audit_events(actor_id,action,resource_id,request_id) VALUES($1,$2,$3,$4)', [actor.id,`media.${action === 'edit' ? 'update' : action}`,id,request]);
      return updated;
    });
  }
}
