// Explicit staging target, bounded catalog/plan reads, no application data returned or writes performed.
const { spawnSync } = require('node:child_process');
const { Pool } = require('pg');
const { runtimeConnectionConfig } = require('../dist/database/postgres');
const { performance } = require('node:perf_hooks');
const fs = require('node:fs');
const path = require('node:path');
const project = 'misty-silence-69777617', branch = 'br-steep-sea-ao0qw05a';
const output = path.resolve(__dirname, '../../docs/r2/evidence/performance/staging-readonly.json');
const cli = args => spawnSync('neon', args, { shell: process.platform === 'win32', encoding: 'utf8', timeout: 45000, windowsHide: true });
async function main() {
  const report = { measuredAt: new Date().toISOString(), project, branch,
    scope: 'explicit staging target; runtime role; catalog, zero-row readiness and EXPLAIN without ANALYZE; no migrations, application writes, hosted load or application rows returned' };
  const result = cli(['connection-string', branch, '--project-id', project, '--role-name', 'talgov_staging_runtime', '--database-name', 'neondb', '--pooled', '--ssl', 'verify-full']);
  if (result.status !== 0) throw new Error('CLI connection lookup unavailable');
  const raw = result.stdout.trim();
  const url = new URL(raw.startsWith('"') ? JSON.parse(raw) : raw);
  if (url.hostname !== 'ep-sparkling-bird-ao5precf-pooler.c-2.ap-southeast-1.aws.neon.tech' || url.username !== 'talgov_staging_runtime' || url.pathname !== '/neondb') throw new Error('Unexpected staging target');
  url.searchParams.set('sslmode', 'verify-full'); url.searchParams.set('channel_binding', 'require');
  const audit = spawnSync(process.execPath, [path.join(__dirname, 'r2-staging-readonly-audit.cjs')], { encoding: 'utf8', timeout: 60000,
    env: { ...process.env, R2_AUDIT_DATABASE_URL: url.toString() }, windowsHide: true });
  if (audit.status !== 0) throw new Error('Application staging transport or catalog audit failed');
  report.applicationAudit = JSON.parse(audit.stdout);
  const pool = new Pool(runtimeConnectionConfig(url.toString())); pool.on('error', () => {});
  let client;
  try {
    const started = performance.now(); client = await pool.connect();
    report.connectionAndRoleAdmissionMs = performance.now() - started;
    await client.query("BEGIN READ ONLY; SET LOCAL statement_timeout='5s'; SET LOCAL transaction_timeout='30s'");
    report.existingIndexes = (await client.query(`SELECT schemaname,tablename,indexname,indexdef FROM pg_indexes
      WHERE schemaname='app' AND tablename IN ('public_content','media_assets','media_revisions','content_asset_links','staff_accounts') ORDER BY tablename,indexname`)).rows;
    report.plans = [];
    for (const [name, sql] of [
      ['published-news-page', "SELECT id,kind,slug,title,body,published_at FROM app.published_content WHERE kind='news' ORDER BY published_at DESC,id LIMIT 20"],
      ['published-news-count', "SELECT count(*) FROM app.published_content WHERE kind='news'"],
      ['staff-media-page', 'SELECT * FROM app.media_assets WHERE deleted_at IS NULL ORDER BY created_at DESC,id LIMIT 51'],
    ]) {
      const started = performance.now();
      report.plans.push({ name, roundTripMs: performance.now() - started,
        plan: (await client.query('EXPLAIN (FORMAT JSON) ' + sql)).rows[0]['QUERY PLAN'] });
      report.plans.at(-1).roundTripMs = performance.now() - started;
    }
    await client.query('COMMIT');
  } finally { if (client) { await client.query('ROLLBACK').catch(() => {}); client.release(); } await pool.end(); }
  report.diagnostics = {};
  for (const check of ['table-sizes', 'index-sizes', 'calls']) {
    const diagnostic = cli(['inspect', 'db', check, '--project-id', project, '--branch', branch, '--database-name', 'neondb', '--role-name', 'talgov_staging_runtime', '-o', 'json']);
    if (diagnostic.status === 0) report.diagnostics[check] = { status: 'pass', rows: JSON.parse(diagnostic.stdout) };
    else report.diagnostics[check] = { status: 'unavailable', reason: /pg_stat_statements/.test(diagnostic.stderr) ? 'pg_stat_statements is not installed; no extension installed' : 'Provider diagnostic failed; details suppressed' };
  }
  fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ output, transportAndCatalog: 'pass', queryPlans: report.plans.length, slowQueryHistory: report.diagnostics.calls.status }));
}
main().catch(() => { console.error('Read-only staging performance inspection failed; credentials and provider details suppressed.'); process.exitCode = 1; });
