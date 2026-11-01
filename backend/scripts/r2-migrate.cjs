const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Pool } = require('pg');
const { connectionConfig } = require('../dist/database/postgres.js');
const directory = path.join(__dirname, '../database/migrations');

function isolatedConfig(url) {
  const parsed = new URL(url);
  if (!['127.0.0.1','localhost'].includes(parsed.hostname) || !/^\/r2_[a-z0-9_]+$/.test(parsed.pathname)) {
    throw new Error('Only isolated loopback r2_* databases are supported by this rehearsal CLI');
  }
  return connectionConfig(url, true);
}
async function migrate(pool, dir = directory, dryRun = false) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const version = (await client.query('SHOW server_version_num')).rows[0].server_version_num;
    if (Number(version)<170000) throw new Error('PostgreSQL 17 or later is required for transaction deadlines');
    await client.query("SET LOCAL statement_timeout='30s'");
    await client.query("SET LOCAL lock_timeout='5s'");
    await client.query('SELECT pg_advisory_xact_lock(72001)');
    await client.query(`CREATE TABLE IF NOT EXISTS public.r2_schema_migrations (
      version text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`);
    await client.query('REVOKE ALL ON public.r2_schema_migrations FROM PUBLIC');
    const files = fs.readdirSync(dir).filter(f => /^\d{3}_[a-z_]+\.sql$/.test(f)).sort();
    const applied = (await client.query('SELECT version,checksum FROM public.r2_schema_migrations ORDER BY version')).rows;
    if (applied.some((row,i) => row.version !== files[i])) throw new Error('Migration history is not a known prefix');
    for (const file of files) {
      const sql = fs.readFileSync(path.join(dir,file),'utf8').replace(/\r\n/g,'\n');
      const checksum = crypto.createHash('sha256').update(sql).digest('hex');
      const prior = applied.find(row => row.version === file);
      if (prior && prior.checksum !== checksum) throw new Error('Migration checksum mismatch');
      if (!prior) {
        await client.query(sql);
        await client.query('INSERT INTO public.r2_schema_migrations(version,checksum) VALUES($1,$2)',[file,checksum]);
      }
    }
    await client.query(dryRun ? 'ROLLBACK' : 'COMMIT');
    return { migrations: files.length, applied: files.length-applied.length };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
module.exports = { migrate, isolatedConfig };
if (require.main === module) {
  (async () => {
    let pool;
    try { pool = new Pool(isolatedConfig(process.env.R2_MIGRATION_DATABASE_URL)); console.log(JSON.stringify({...await migrate(pool,directory,!process.argv.includes('--apply')),dryRun:!process.argv.includes('--apply')})); }
    catch { console.error('R2 migration failed; no credentials or provider details emitted'); process.exitCode=1; }
    finally { await pool?.end(); }
  })();
}
