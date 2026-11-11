// Standalone: no migrator, application bootstrap, mail or real object-store imports.
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const baseline = require('./staging/catalog.json');
const { target, validateTarget } = require('./staging/target.cjs');
const { runtimeConnectionConfig } = require('../dist/database/postgres.js');

function options(args) {
  assert.ok(args.length === 0 || (args.length === 1 && args[0] === '--authorize-rollback-writes'), 'Unknown qualification option');
  return { writes: args.length === 1 };
}
function config(url) {
  validateTarget(target);
  const u = new URL(url);
  const pooled = target.host.replace(target.endpoint + '.', target.endpoint + '-pooler.');
  assert.ok([target.host, pooled].includes(u.hostname) && (!u.port || u.port === '5432') &&
    u.pathname === '/' + target.database && u.password &&
    u.searchParams.get('sslmode') === 'verify-full' && u.searchParams.get('channel_binding') === 'require');
  return runtimeConnectionConfig(url);
}
function checksums() {
  for (const entry of require('./staging/manifest.json')) {
    // Match the existing migration runner's canonical LF checksums on Windows.
    const sql = fs.readFileSync(path.join(__dirname, '../database', entry.file), 'utf8').replace(/\r\n/g, '\n');
    assert.equal(createHash('sha256').update(sql).digest('hex'), entry.sha256);
  }
}

// A transaction never has a commit path. On rollback/connection failure destroy
// the socket: PostgreSQL aborts the uncommitted transaction on disconnect.
async function rollbackOnly(pool, writes, work) {
  const client = await pool.connect();
  let discard = false;
  const onError = () => { discard = true; };
  client.on('error', onError);
  try {
    await client.query(writes ? 'BEGIN' : 'BEGIN READ ONLY');
    await client.query("SET LOCAL statement_timeout = '5s'");
    await client.query("SET LOCAL idle_in_transaction_session_timeout = '5s'");
    await client.query('SET LOCAL transaction_timeout = 0');
    await client.query("SET LOCAL transaction_timeout = '30s'");
    return await work(client);
  } finally {
    try { await client.query('ROLLBACK'); }
    catch { discard = true; }
    client.removeListener('error', onError);
    client.release(discard);
    assert.ok(!discard, 'Rollback/connection failed; client destroyed; qualification not confirmed');
  }
}

async function inspect(c) {
  const scope = "(n.nspname='app' OR (n.nspname='public' AND c.relname LIKE 'r2_auth_%'))";
  const relations = (await c.query(`SELECT n.nspname,c.relname,c.relkind,c.relrowsecurity,c.relforcerowsecurity,
    (SELECT count(*)::int FROM pg_policy p WHERE p.polrelid=c.oid) AS policies
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE ${scope} AND c.relkind IN ('r','v') ORDER BY 1,2`)).rows;
  assert.deepEqual(relations, baseline.relations.filter(r => ['r','v'].includes(r.relkind)).map(r => ({
    nspname:r.nspname, relname:r.relname, relkind:r.relkind,
    relrowsecurity:r.relrowsecurity, relforcerowsecurity:r.relforcerowsecurity, policies:0,
  })), 'Relation/RLS drift (reviewed baseline has no RLS policies)');
  const grants = (await c.query(`SELECT n.nspname,c.relname,p.privilege,
    has_table_privilege(current_user,c.oid,p.privilege) AS allowed,
    has_table_privilege(current_user,c.oid,p.privilege || ' WITH GRANT OPTION') AS grantable
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) p(privilege)
    WHERE ${scope} AND c.relkind IN ('r','v')`)).rows;
  assert.equal(grants.length, relations.length * 7);
  for (const row of grants) {
    const expected = baseline.tableGrants.some(g => g.grantee === 'talgov_runtime' &&
      g.nspname === row.nspname && g.relname === row.relname && g.privilege_type === row.privilege);
    assert.equal(row.allowed, expected, 'Effective table grant drift');
    assert.equal(row.grantable, false, 'Unexpected grant option');
  }
  const columns = (await c.query(`SELECT n.nspname,c.relname,a.attname,p.privilege,
    has_column_privilege(current_user,c.oid,a.attnum,p.privilege) AS allowed,
    has_column_privilege(current_user,c.oid,a.attnum,p.privilege || ' WITH GRANT OPTION') AS grantable
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
    CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','REFERENCES']) p(privilege)
    WHERE ${scope} AND c.relkind IN ('r','v')`)).rows;
  assert.equal(columns.length, baseline.columns.length * 4);
  for (const row of columns) {
    assert.ok(baseline.columns.some(g => g.table_schema === row.nspname && g.table_name === row.relname && g.column_name === row.attname));
    const expected = baseline.grants.some(g => g.grantee === 'talgov_runtime' && g.table_schema === row.nspname &&
      g.table_name === row.relname && g.column_name === row.attname && g.privilege_type === row.privilege);
    assert.equal(row.allowed, expected, 'Effective column grant drift');
    assert.equal(row.grantable, false, 'Unexpected column grant option');
  }
}

function fakeStore() {
  const objects = new Map();
  return { async put(key, bytes) { objects.set(key, Buffer.from(bytes)); },
    async read(key) { assert.ok(objects.has(key)); return Buffer.from(objects.get(key)); } };
}
async function fixture(c, sql) {
  const result = await c.query(sql);
  assert.equal(result.rowCount, 1, 'Exactly one pre-authorized synthetic fixture required; no provisioning is performed');
  return result.rows[0].id;
}
const probes = {
  cms: { table:'app.public_content', key:'legacy_id', async write(c, marker) {
    const source = await fixture(c, "SELECT id FROM app.content_sources WHERE reference='r2-qualification' AND owner='r2-qualification' AND NOT approved");
    assert.equal((await c.query(`INSERT INTO app.public_content(kind,legacy_id,slug,title,body,source_id)
      VALUES('pages',$1,$1,'Synthetic qualification','{}',$2)`, [marker,source])).rowCount, 1);
    assert.equal((await c.query('UPDATE app.public_content SET title=$2,deleted_at=now() WHERE legacy_id=$1', [marker,'Synthetic updated'])).rowCount, 1);
  } },
  auth: { table:'public.r2_auth_user', key:'id', async write(c, marker) {
    assert.equal((await c.query(`INSERT INTO public.r2_auth_user(id,name,email,"emailVerified") VALUES($1,'Synthetic qualification',$2,false)`, [marker,marker+'@example.invalid'])).rowCount, 1);
    assert.equal((await c.query('UPDATE public.r2_auth_user SET name=$2 WHERE id=$1',[marker,'Synthetic updated'])).rowCount, 1);
    // Exercise allowed DELETE on a second record; retain the first for rollback proof.
    await c.query(`INSERT INTO public.r2_auth_user(id,name,email,"emailVerified") VALUES($1,'Synthetic delete',$2,false)`, [marker+'-delete',marker+'-delete@example.invalid']);
    assert.equal((await c.query('DELETE FROM public.r2_auth_user WHERE id=$1',[marker+'-delete'])).rowCount, 1);
  } },
  media: { table:'app.media_assets', key:'object_key', async write(c, marker, store) {
    const source = await fixture(c, "SELECT id FROM app.content_sources WHERE reference='r2-qualification' AND owner='r2-qualification' AND NOT approved");
    const actor = await fixture(c, "SELECT id FROM app.staff_accounts WHERE provider='r2-qualification' AND subject='r2-qualification' AND NOT active");
    const category = await fixture(c, "SELECT id FROM app.media_categories WHERE slug='r2-qualification' AND kind='document' AND NOT approved");
    const bytes = Buffer.from('synthetic metadata qualification');
    await store.put(marker, bytes);
    assert.deepEqual(await store.read(marker), bytes);
    assert.equal((await c.query(`INSERT INTO app.media_assets(kind,category_id,source_id,title,object_key,mime,bytes,sha256,created_by,updated_by)
      VALUES('document',$1,$2,'Synthetic qualification',$3,'application/pdf',$4,$5,$6,$6)`,
    [category,source,marker,bytes.length,createHash('sha256').update(bytes).digest('hex'),actor])).rowCount, 1);
    assert.equal((await c.query('UPDATE app.media_assets SET title=$2,deleted_at=now() WHERE object_key=$1',[marker,'Synthetic updated'])).rowCount, 1);
  } },
};
async function probe(pool, definition, store) {
  const marker = 'r2-qualification-' + randomUUID();
  const count = async c => Number((await c.query(`SELECT count(*) AS count FROM ${definition.table} WHERE ${definition.key}=ANY($1::text[])`, [[marker, marker+'-delete']])).rows[0].count);
  let failure;
  try {
    await rollbackOnly(pool, true, async c => {
      assert.equal(await count(c), 0);
      await definition.write(c, marker, store);
      assert.equal(await count(c), 1, 'Synthetic write not visible on pinned client');
    });
  } catch (error) { failure = error; }
  // Independent read-only transaction after rollback, including on write failure.
  await rollbackOnly(pool, false, async c => assert.equal(await count(c), 0, 'Rollback verification failed'));
  if (failure) throw failure;
}
async function run(args = process.argv.slice(2), env = process.env, Pool = require('pg').Pool) {
  const { writes } = options(args);
  checksums();
  // Validate all three before opening any connection. No .env autoload/fallback.
  const configs = ['DATABASE_URL','STAFF_AUTH_DATABASE_URL','MEDIA_DATABASE_URL'].map(key => config(env[key]));
  const pools = [];
  try {
    for (const cfg of configs) { const pool = new Pool(cfg); pool.on('error', () => {}); pools.push(pool); }
    for (const pool of pools) await rollbackOnly(pool, false, inspect);
    if (writes) for (const [i, name] of ['cms','auth','media'].entries()) await probe(pools[i], probes[name], fakeStore());
    return writes ? 'PASS: catalogs and synthetic writes; rollback absence verified for CMS/auth/media' : 'PASS: read-only effective grants and RLS catalog checks; writes not requested';
  } finally { await Promise.all(pools.map(pool => pool.end())); }
}
if (require.main === module) run().then(console.log).catch(() => {
  console.error('FAIL: staging qualification not confirmed; provider details suppressed'); process.exitCode = 1;
});
module.exports = { options, config, checksums, rollbackOnly, inspect, fakeStore, probes, probe, run };
