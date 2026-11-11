const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const q = require('../scripts/r2-staging-qualify.cjs');
const baseline = require('../scripts/staging/catalog.json');
const target = require('../scripts/staging/target.json');
function mock(fail = () => false) {
  const log = [];
  let rows = 0;
  const client = Object.assign(new EventEmitter(), {
    async query(sql) {
      log.push(sql);
      if (fail(sql)) throw new Error('secret provider error');
      if (sql === 'INSERT synthetic') rows++;
      if (sql === 'ROLLBACK') rows = 0;
      return { rowCount:1, rows:[{ count:rows }] };
    }, release(discard) { log.push(['release', discard]); },
  });
  return { log, client, pool: { async connect() { log.push('connect'); return client; } } };
}
test('CLI defaults to reads and rejects ambiguous authorization', () => {
  assert.deepEqual(q.options([]), { writes:false });
  assert.deepEqual(q.options(['--authorize-rollback-writes']), { writes:true });
  for (const args of [['--write'], ['--authorize-rollback-writes','--unknown']]) assert.throws(() => q.options(args));
});
test('manifest remains unchanged and target/TLS/guard validation fails closed', () => {
  q.checksums();
  const url = `postgresql://runtime:fake@${target.host}/neondb?sslmode=verify-full&channel_binding=require`;
  assert.equal(typeof q.config(url).onConnect, 'function');
  for (const bad of [undefined, url.replace(target.host,'example.com'), url.replace('verify-full','require'), url.replace('&channel_binding=require',''),url+'&options=unsafe']) assert.throws(() => q.config(bad));
});
test('all runtime URLs validated before any pool construction', async () => {
  let constructed = 0;
  await assert.rejects(q.run([], {}, class { constructor() { constructed++; } }));
  assert.equal(constructed, 0);
});
test('default transaction is read-only, pinned and rolled back', async () => {
  const m = mock();
  await q.rollbackOnly(m.pool, false, async c => { assert.equal(c,m.client); await c.query('SELECT 1'); });
  assert.equal(m.log.filter(s => s === 'connect').length,1);
  assert.ok(m.log.includes('BEGIN READ ONLY'));
  assert.ok(!m.log.includes('COMMIT'));
  assert.deepEqual(m.log.slice(-2), ['ROLLBACK',['release',false]]);
});
for (const point of ['BEGIN', "SET LOCAL statement_timeout = '5s'", 'INSERT synthetic', 'ROLLBACK']) {
  test(`failure at ${point} always attempts rollback and releases`, async () => {
    const m = mock(sql => sql === point);
    await assert.rejects(q.rollbackOnly(m.pool, true, c => c.query('INSERT synthetic')));
    assert.ok(m.log.includes('ROLLBACK'));
    assert.deepEqual(m.log.at(-1), ['release',point === 'ROLLBACK']);
  });
}
test('connection errors discard client even if rollback responds', async () => {
  const m = mock();
  await assert.rejects(q.rollbackOnly(m.pool,true,async c => c.emit('error',new Error('disconnect'))));
  assert.deepEqual(m.log.at(-1),['release',true]);
});
test('connection acquisition failure never runs work', async () => {
  await assert.rejects(q.rollbackOnly({ connect:async () => { throw Error(); } },true,() => assert.fail()));
});
test('run closes all three pools on catalog failure without attempting writes', async () => {
  const pools = [];
  class Pool extends EventEmitter {
    constructor(config) { super(); assert.equal(typeof config.onConnect,'function'); this.mock = mock(); pools.push(this); }
    async connect() { return this.mock.client; }
    async end() { this.ended = true; }
  }
  const url = `postgresql://runtime:fake@${target.host}/neondb?sslmode=verify-full&channel_binding=require`;
  await assert.rejects(q.run(['--authorize-rollback-writes'],{DATABASE_URL:url,STAFF_AUTH_DATABASE_URL:url,MEDIA_DATABASE_URL:url},Pool));
  assert.equal(pools.length,3);
  assert.ok(pools.every(p => p.ended));
  assert.ok(pools.flatMap(p => p.mock.log).every(sql => typeof sql !== 'string' || !/^(INSERT|UPDATE|DELETE|COMMIT)/.test(sql)));
});
for (const fails of [false,true]) test(`probe verifies absence after ${fails ? 'failed' : 'successful'} write`, async () => {
  const m = mock();
  const definition = { table:'synthetic',key:'id', async write(c) { await c.query('INSERT synthetic'); if (fails) throw Error('write failure'); } };
  if (fails) await assert.rejects(q.probe(m.pool,definition,q.fakeStore()));
  else await q.probe(m.pool,definition,q.fakeStore());
  assert.equal(m.log.filter(s => s === 'connect').length,2);
  assert.equal(m.log.filter(s => typeof s === 'string' && s.startsWith('SELECT count')).length,fails ? 2 : 3);
});
test('persisting synthetic row fails rollback verification', async () => {
  const m = mock();
  let count = 0;
  const original = m.client.query;
  m.client.query = async sql => {
    const result = await original(sql);
    if (sql.startsWith('SELECT count') && ++count === 3) result.rows[0].count = 1;
    return result;
  };
  await assert.rejects(q.probe(m.pool,{table:'synthetic',key:'id',write:c => c.query('INSERT synthetic')},q.fakeStore()),/Rollback verification/);
});
test('catalog verifies effective table and column rights plus RLS drift', async () => {
  const relations = baseline.relations.filter(r => ['r','v'].includes(r.relkind)).map(r => ({nspname:r.nspname,relname:r.relname,relkind:r.relkind,relrowsecurity:false,relforcerowsecurity:false,policies:0}));
  const tables = relations.flatMap(r => ['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'].map(privilege => ({nspname:r.nspname,relname:r.relname,privilege,grantable:false,allowed:baseline.tableGrants.some(g => g.nspname===r.nspname && g.relname===r.relname && g.privilege_type===privilege)})));
  const columns = baseline.columns.flatMap(r => ['SELECT','INSERT','UPDATE','REFERENCES'].map(privilege => ({nspname:r.table_schema,relname:r.table_name,attname:r.column_name,privilege,grantable:false,allowed:baseline.grants.some(g => g.table_schema===r.table_schema && g.table_name===r.table_name && g.column_name===r.column_name && g.privilege_type===privilege)})));
  const client = { async query(sql) { return {rows: sql.includes('pg_policy') ? relations : sql.includes('pg_attribute') ? columns : tables}; } };
  await q.inspect(client);
  tables[0].allowed = !tables[0].allowed;
  await assert.rejects(q.inspect(client),/table grant drift/);
  tables[0].allowed = !tables[0].allowed;
  columns[0].allowed = !columns[0].allowed;
  await assert.rejects(q.inspect(client),/column grant drift/);
  columns[0].allowed = !columns[0].allowed;
  relations[0].policies = 1;
  await assert.rejects(q.inspect(client),/RLS drift/);
});
test('missing CMS/media fixtures fail before writes or fake-store access', async () => {
  for (const name of ['cms','media']) {
    const queries = [];
    await assert.rejects(q.probes[name].write({async query(sql) { queries.push(sql); return {rowCount:0,rows:[]}; }},'synthetic',{put:() => assert.fail()}),/synthetic fixture/);
    assert.ok(queries.every(sql => sql.startsWith('SELECT')));
  }
});
test('fake store is isolated memory and copies bytes', async () => {
  const store = q.fakeStore(), bytes = Buffer.from('fake');
  await store.put('key',bytes); bytes.fill(0);
  assert.equal((await store.read('key')).toString(),'fake');
  await assert.rejects(q.fakeStore().read('key'));
});
