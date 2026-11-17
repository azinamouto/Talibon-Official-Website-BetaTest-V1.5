import type { SqlSession } from '../../database/postgres';

export async function contentSlug(tx: SqlSession, kind: string, title: string) {
  const stem = title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120).replace(/-$/g, '') || 'content';
  // Serialize allocation for matching titles, including concurrent draft creation.
  await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))', [kind + ':' + stem]);
  const rows = await tx.query('SELECT slug FROM app.public_content WHERE kind=$1 AND (slug=$2 OR slug LIKE $3)', [kind, stem, stem + '-%']);
  const used = new Set(rows.map(row => row.slug));
  let slug = stem, suffix = 2;
  while (used.has(slug)) slug = stem + '-' + suffix++;
  return slug;
}
