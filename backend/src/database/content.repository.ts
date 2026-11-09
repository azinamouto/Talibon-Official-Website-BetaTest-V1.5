import { randomUUID } from 'node:crypto';
import { DatabaseError, PostgresDatabase } from './postgres';
import { StaffPrincipal } from '../authentication/authentication.adapter';
import { authorizeStaff } from './staff-authorization';
export interface ContentInput { title: string; slug: string; sourceId: string; body: Record<string, unknown>; status?: string; version?: number; }
export class ContentRepository {
  constructor(private readonly db: PostgresDatabase) {}
  list(actor: StaffPrincipal, kind: string, page: number, limit: number, id?: string) {
    return this.db.transaction(async tx => {
      await authorizeStaff(tx,actor);
      const values = [kind,id || null];
      const where = 'kind=$1 AND deleted_at IS NULL AND ($2::uuid IS NULL OR id=$2::uuid)';
      const [count] = await tx.query(`SELECT count(*)::int AS total FROM app.public_content WHERE ${where}`,values);
      const data = await tx.query(`SELECT * FROM app.public_content WHERE ${where} ORDER BY updated_at DESC,id LIMIT $3 OFFSET $4`,[...values,limit,(page-1)*limit]);
      return { data, pagination: { page,limit,total:count.total,totalPages:Math.ceil(count.total/limit) } };
    });
  }
  save(actor: StaffPrincipal, kind: string, input: Partial<ContentInput>, request: string, id?: string) {
    return this.db.transaction(async tx => {
      await authorizeStaff(tx,actor);
      let prior: Record<string, any> | undefined;
      if (id) {
        [prior] = await tx.query('SELECT * FROM app.public_content WHERE id=$1 AND kind=$2 AND version=$3 AND deleted_at IS NULL FOR UPDATE',[id,kind,input.version]);
        if (!prior) throw new DatabaseError('conflict');
      }
      const publication=input.status ?? prior?.publication ?? 'draft';
      const body={...(kind==='news'?{category:'ARTICLE'}:{}),...prior?.body,...input.body};
      if (/https?:\/\/[^/\s]+\/(storage|rest|auth)\/v1/i.test(JSON.stringify(body))) throw new DatabaseError('invalid');
      const values=[input.title ?? prior?.title,input.slug ?? prior?.slug,JSON.stringify(body),input.sourceId ?? prior?.source_id,publication];
      const [row]=id ? await tx.query(`UPDATE app.public_content SET title=$1,slug=$2,body=$3,source_id=$4,publication=$5,
        published_at=CASE WHEN $5='published' THEN COALESCE(published_at,now()) ELSE NULL END,
        version=version+1,updated_at=now() WHERE id=$6 RETURNING *`,[...values,id])
        : await tx.query(`INSERT INTO app.public_content(title,slug,body,source_id,publication,kind,legacy_id,published_at)
          VALUES($1,$2,$3,$4,$5,$6,$7,CASE WHEN $5='published' THEN now() ELSE NULL END) RETURNING *`,[...values,kind,randomUUID()]);
      await tx.query('INSERT INTO app.audit_events(actor_id,action,resource_id,request_id) VALUES($1,$2,$3,$4)',[actor.id,id?'content.update':'content.create',row.id,request]);
      return { data: row };
    });
  }
  remove(actor: StaffPrincipal,kind: string,id: string,version: number,request: string) {
    return this.db.transaction(async tx => {
      await authorizeStaff(tx,actor,true);
      const rows=await tx.query(`UPDATE app.public_content SET publication='archived',deleted_at=now(),published_at=NULL,version=version+1,updated_at=now()
        WHERE id=$1 AND kind=$2 AND version=$3 AND deleted_at IS NULL RETURNING id`,[id,kind,version]);
      if (!rows.length) throw new DatabaseError('conflict');
      await tx.query("INSERT INTO app.audit_events(actor_id,action,resource_id,request_id) VALUES($1,'content.delete',$2,$3)",[actor.id,id,request]);
      return { deleted: true };
    });
  }
}
