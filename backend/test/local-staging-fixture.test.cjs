const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { fixtureConfig, verifyFixture } = require('./local-staging-fixture.cjs');

test('disposable fixture rejects missing, external and stopped-cluster descriptors before connecting', () => {
  for (const file of [undefined, '', 'postgresql://hosted.invalid/postgres', __filename]) {
    assert.throws(() => fixtureConfig(file));
  }
  const cluster = 'talgov-staging-' + randomUUID().replaceAll('-', '');
  const scratch = path.resolve(__dirname, '../node_modules/.cache', cluster);
  const data = path.join(scratch, 'data');
  const file = path.join(scratch, 'fixture.json');
  fs.mkdirSync(data, { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ port: 55432, cluster }));
  assert.throws(() => fixtureConfig(file)); // no running-server PID file
  fs.writeFileSync(path.join(data, 'postmaster.pid'), `123\n${data}\n0\n55432\n\n127.0.0.1\nready\n`);
  assert.equal(fixtureConfig(file).url.hostname, '127.0.0.1');
  assert.equal(fixtureConfig(file).url.port, '55432');
  for (const patch of [{ port: 5432.5 }, { port: 0 }, { port: 65536 }, { port: 55433 }, { cluster: 'other' }]) {
    fs.writeFileSync(file, JSON.stringify({ port: 55432, cluster, ...patch }));
    assert.throws(() => fixtureConfig(file));
  }
});

test('server identity mismatch fails after one read-only query and before any DDL', async () => {
  const fixture = { data: path.resolve('local-disposable-data'), cluster: 'unique-local', port: 55432 };
  const good = { ...fixture, host: '127.0.0.1', db: 'postgres', login: 'postgres', session_login: 'postgres', superuser: 'on' };
  for (const patch of [{}, { data: path.resolve('other-data') }, { cluster: 'other' }, { host: '192.0.2.1' },
    { port: 5432 }, { db: 'neondb' }, { login: 'staging_owner' }, { session_login: 'other' }, { superuser: 'off' }]) {
    let queries = 0;
    const admin = { query: async sql => {
      ++queries;
      assert.match(sql, /^SELECT /);
      assert.doesNotMatch(sql, /CREATE|ALTER|DROP|INSERT|UPDATE|DELETE/);
      return { rows: [{ ...good, ...patch }] };
    } };
    if (Object.keys(patch).length) await assert.rejects(verifyFixture(admin, fixture));
    else await verifyFixture(admin, fixture);
    assert.equal(queries, 1);
  }
});
