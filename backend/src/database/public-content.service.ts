import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { runtimeConnectionConfig, PostgresDatabase } from './postgres';

export const PUBLIC_KINDS = ['barangays','departments','officials','news','pages','tourism_spots','events','navigation','downloadables','ordinances','resolutions','citizens_charter_cms','services_cms'] as const;

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
    const values: unknown[] = [kind];
    const clauses = ['kind=$1'];
    for (const [key, value] of Object.entries(filters)) {
      if (!value) continue;
      values.push(key === 'q' ? `%${value.replace(/[\\%_]/g, '\\$&')}%` : value);
      const n = values.length;
      if (key === 'id') clauses.push(`(id::text=$${n} OR legacy_id=$${n})`);
      else if (key === 'slug') clauses.push(`slug=$${n}`);
      else if (key === 'q') clauses.push(`title ILIKE $${n}`);
      else if (key === 'category' || key === 'office_responsible') clauses.push(`body->>'${key}'=$${n}`);
      else throw new BadRequestException('Invalid filter.');
    }
    return this.query<{ data: Record<string, any>[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(async tx => {
      const where = clauses.join(' AND ');
      const [count] = await tx.query(`SELECT count(*)::int AS total FROM app.published_content WHERE ${where}`, values);
      const rows = await tx.query(`SELECT * FROM app.published_content WHERE ${where} ORDER BY published_at DESC,id LIMIT $${values.length+1} OFFSET $${values.length+2}`, [...values,limit,(page-1)*limit]);
      if (rows.some(row => /https?:\/\/[^/\s]+\/(storage|rest|auth)\/v1/i.test(JSON.stringify(row.body)))) throw new Error('Unmigrated content reference');
      const data = rows.map(row => ({ ...row.body, ...(row.kind==='news'?{date:row.body.date ?? row.published_at}:{}), id: row.id, slug: row.slug, title: row.title, created_at: row.published_at }));
      return { data, pagination: { page, limit, total: count.total, totalPages: Math.ceil(count.total/limit) } };
    });
  }
  async pageItems(slug: string) {
    const page = (await this.list('pages',1,1,{slug})).data[0];
    return Array.isArray(page?.items) ? page.items : [];
  }
  async onModuleDestroy() { await this.database?.close(); }
}
