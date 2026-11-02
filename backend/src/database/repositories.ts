import { DatabaseError, PostgresDatabase, SqlSession } from './postgres';

// Internal server contract. A future auth adapter must verify live session + MFA before constructing this.
// Never accept this object from a request body, JWT decode alone, or browser role claims.
export interface VerifiedStaffIdentity { provider: string; subject: string; sessionVerified: true; assurance: 'mfa'; }
export interface MediaInput {
  kind: 'photo' | 'document'; categoryId: string; sourceId: string; title: string;
  description: string; altText: string; objectKey: string; mime: string; bytes: number; sha256: string;
}
export interface PublicContentRepository { list(kind: string, limit?: number): Promise<Record<string, unknown>[]>; }
export interface MediaRepository {
  listPublished(limit?: number): Promise<Record<string, unknown>[]>;
  create(identity: VerifiedStaffIdentity, input: MediaInput, requestId: string): Promise<Record<string, unknown>>;
  update(identity: VerifiedStaffIdentity, id: string, version: number, title: string, altText: string, requestId: string): Promise<Record<string, unknown>>;
  publish(identity: VerifiedStaffIdentity, id: string, version: number, published: boolean, requestId: string): Promise<Record<string, unknown>>;
  remove(identity: VerifiedStaffIdentity, id: string, version: number, requestId: string): Promise<void>;
}
export interface StaffRepository {
  setAccess(identity: VerifiedStaffIdentity, id: string, version: number, role: 'admin' | 'editor', active: boolean, requestId: string): Promise<void>;
}
export interface AuditRepository { listAudit(identity: VerifiedStaffIdentity, limit?: number): Promise<Record<string, unknown>[]>; }

const bound = (limit = 50) => {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new DatabaseError('invalid');
  return limit;
};
async function authorize(tx: SqlSession, identity: VerifiedStaffIdentity, admin = false) {
  if (!identity || identity.sessionVerified !== true || identity.assurance !== 'mfa') throw new DatabaseError('forbidden');
  const [actor] = await tx.query<{ id: string; role: string }>(
    'SELECT id, role FROM app.staff_accounts WHERE provider=$1 AND subject=$2 AND active FOR SHARE',
    [identity.provider, identity.subject]);
  if (!actor || !['admin', 'editor'].includes(actor.role) || (admin && actor.role !== 'admin')) throw new DatabaseError('forbidden');
  return actor;
}
async function audit(tx: SqlSession, actor: string, action: string, resource: string, request: string) {
  await tx.query('INSERT INTO app.audit_events(actor_id,action,resource_id,request_id) VALUES($1,$2,$3,$4)', [actor, action, resource, request]);
}

export class PgRepositories implements PublicContentRepository, MediaRepository, StaffRepository, AuditRepository {
  constructor(private readonly db: PostgresDatabase) {}
  list(kind: string, limit = 50) {
    return this.db.transaction(tx => tx.query('SELECT * FROM app.published_content WHERE kind=$1 ORDER BY published_at DESC,id LIMIT $2', [kind, bound(limit)]), true);
  }
  listPublished(limit = 50) {
    return this.db.transaction(tx => tx.query('SELECT * FROM app.published_media ORDER BY published_at DESC,id LIMIT $1', [bound(limit)]), true);
  }
  create(identity: VerifiedStaffIdentity, input: MediaInput, requestId: string) {
    return this.db.transaction(async tx => {
      const actor = await authorize(tx, identity);
      const [row] = await tx.query(`INSERT INTO app.media_assets
        (kind,category_id,source_id,title,description,alt_text,object_key,mime,bytes,sha256,created_by,updated_by)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11) RETURNING *`,
      [input.kind,input.categoryId,input.sourceId,input.title,input.description,input.altText,input.objectKey,input.mime,input.bytes,input.sha256,actor.id]);
      await audit(tx, actor.id, 'media.create', row.id, requestId);
      return row;
    });
  }
  update(identity: VerifiedStaffIdentity, id: string, version: number, title: string, altText: string, requestId: string) {
    return this.db.transaction(async tx => {
      const actor = await authorize(tx, identity);
      const [row] = await tx.query(`UPDATE app.media_assets SET title=$1,alt_text=$2,updated_by=$3,version=version+1,updated_at=now()
        WHERE id=$4 AND version=$5 AND deleted_at IS NULL RETURNING *`, [title,altText,actor.id,id,version]);
      if (!row) throw new DatabaseError('conflict');
      await audit(tx,actor.id,'media.update',id,requestId);
      return row;
    });
  }
  publish(identity: VerifiedStaffIdentity, id: string, version: number, published: boolean, requestId: string) {
    return this.db.transaction(async tx => {
      const actor = await authorize(tx, identity);
      const [row] = await tx.query(`UPDATE app.media_assets SET publication=$1,published_at=$2,updated_by=$3,version=version+1,updated_at=now()
        WHERE id=$4 AND version=$5 AND deleted_at IS NULL RETURNING *`, [published ? 'published' : 'draft',published ? new Date() : null,actor.id,id,version]);
      if (!row) throw new DatabaseError('conflict');
      await audit(tx,actor.id,published ? 'media.publish' : 'media.unpublish',id,requestId);
      return row;
    });
  }
  async remove(identity: VerifiedStaffIdentity, id: string, version: number, requestId: string) {
    await this.db.transaction(async tx => {
      const actor = await authorize(tx, identity, true);
      const rows = await tx.query(`UPDATE app.media_assets SET deleted_at=now(),publication='draft',published_at=NULL,
        updated_by=$1,version=version+1,updated_at=now() WHERE id=$2 AND version=$3 AND deleted_at IS NULL RETURNING id`, [actor.id,id,version]);
      if (!rows.length) throw new DatabaseError('conflict');
      await audit(tx,actor.id,'media.delete',id,requestId);
    });
  }
  async setAccess(identity: VerifiedStaffIdentity, id: string, version: number, role: 'admin' | 'editor', active: boolean, requestId: string) {
    await this.db.transaction(async tx => {
      // Serialize the whole authorization + last-admin decision, including concurrent demotions.
      await tx.query('SELECT pg_advisory_xact_lock(72002)');
      const actor = await authorize(tx, identity, true);
      const [target] = await tx.query('SELECT * FROM app.staff_accounts WHERE id=$1 AND version=$2 FOR UPDATE', [id,version]);
      if (!target) throw new DatabaseError('conflict');
      if (target.role === 'admin' && target.active && (role !== 'admin' || !active)) {
        const [count] = await tx.query("SELECT count(*)::int AS n FROM app.staff_accounts WHERE role='admin' AND active");
        if (count.n <= 1) throw new DatabaseError('forbidden');
      }
      await tx.query('UPDATE app.staff_accounts SET role=$1,active=$2,version=version+1,updated_at=now() WHERE id=$3', [role,active,id]);
      await audit(tx,actor.id,'staff.access',id,requestId);
    });
  }
  listAudit(identity: VerifiedStaffIdentity, limit = 50) {
    return this.db.transaction(async tx => {
      await authorize(tx,identity,true);
      return tx.query('SELECT * FROM app.audit_events ORDER BY occurred_at DESC,id LIMIT $1', [bound(limit)]);
    });
  }
}
