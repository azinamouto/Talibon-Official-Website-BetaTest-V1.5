const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { Pool } = require('pg');
const { isolatedConfig } = require('./r2-migrate.cjs');
async function mediaSchema(pool, dryRun = false) {
  const sql = fs.readFileSync(path.join(__dirname,'../database/media/001_media_policy.sql'),'utf8').replace(/\r\n/g,'\n');
  const digest = createHash('sha256').update(sql).digest('hex');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(72004)');
    await client.query('CREATE TABLE IF NOT EXISTS public.r2_media_migrations(version text PRIMARY KEY, checksum text NOT NULL)');
    await client.query('REVOKE ALL ON public.r2_media_migrations FROM PUBLIC');
    const prior = (await client.query("SELECT checksum FROM public.r2_media_migrations WHERE version='001'")).rows[0];
    if (prior && prior.checksum !== digest) throw new Error('Schema checksum mismatch');
    if (!prior) { await client.query(sql); await client.query("INSERT INTO public.r2_media_migrations VALUES('001',$1)",[digest]); }
    await client.query(dryRun ? 'ROLLBACK' : 'COMMIT');
    return { applied: prior ? 0 : 1, dryRun };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
module.exports = { mediaSchema };
if (require.main === module) (async () => {
  const pool = new Pool(isolatedConfig(process.env.R2_MIGRATION_DATABASE_URL));
  try { console.log(await mediaSchema(pool,!process.argv.includes('--apply'))); }
  finally { await pool.end(); }
})().catch(() => { console.error('Media schema rehearsal failed.'); process.exitCode=1; });
