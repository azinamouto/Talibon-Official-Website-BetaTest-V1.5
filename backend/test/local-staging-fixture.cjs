// Test-only: never accept a caller-supplied database URL or libpq defaults.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../node_modules/.cache');

function fixtureConfig(file) {
  assert.equal(typeof file, 'string', 'Run the disposable staging PowerShell harness');
  const resolved = path.resolve(file);
  const scratch = path.dirname(resolved);
  assert.equal(path.dirname(scratch), root);
  assert.match(path.basename(scratch), /^talgov-staging-[a-f0-9]{32}$/);
  assert.equal(path.basename(resolved), 'fixture.json');
  const fixture = JSON.parse(fs.readFileSync(resolved, 'utf8').replace(/^\uFEFF/, ''));
  assert.ok(Number.isInteger(fixture.port) && fixture.port >= 1024 && fixture.port <= 65535);
  assert.equal(fixture.cluster, path.basename(scratch));
  const data = path.join(scratch, 'data');
  const pid = fs.readFileSync(path.join(data, 'postmaster.pid'), 'utf8').trim().split(/\r?\n/);
  assert.equal(path.resolve(pid[1]), data);
  assert.equal(Number(pid[3]), fixture.port);
  assert.equal(pid[5], '127.0.0.1');
  return { ...fixture, data,
    url: new URL(`postgresql://postgres:disposable-local-only@127.0.0.1:${fixture.port}/postgres`) };
}

async function verifyFixture(admin, fixture) {
  // Read-only identity proof BEFORE CREATE ROLE/DATABASE or any other test DDL.
  const { rows: [r] } = await admin.query(`SELECT current_setting('data_directory') AS data,
    current_setting('cluster_name') AS cluster, host(inet_server_addr()) AS host,
    inet_server_port() AS port, current_database() AS db, current_user AS login,
    session_user AS session_login, current_setting('is_superuser') AS superuser`);
  assert.equal(path.resolve(r.data), fixture.data);
  assert.equal(r.cluster, fixture.cluster);
  assert.equal(r.host, '127.0.0.1');
  assert.equal(r.port, fixture.port);
  assert.equal(r.db, 'postgres');
  assert.equal(r.login, 'postgres');
  assert.equal(r.session_login, 'postgres');
  assert.equal(r.superuser, 'on');
}
module.exports = { fixtureConfig, verifyFixture };
