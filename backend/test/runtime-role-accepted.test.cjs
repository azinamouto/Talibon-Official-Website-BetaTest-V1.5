const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { Logger } = require('@nestjs/common');
const { runtimeConnectionConfig, PostgresDatabase } = require('../dist/database/postgres');
const { RUNTIME_ROLE_PREDICATES: keys, runtimeRoleSnapshot, createRuntimeRoleAcceptanceEmitter, classifyFailure } = require('../dist/security/failure-diagnostics');

const row = changes => ({ ...Object.fromEntries(keys.map(key => [key, true])), safe: true,
  effective_role: 'talgov_staging_runtime', session_role: 'talgov_staging_runtime', ...changes });
const snapshot = changes => runtimeRoleSnapshot(row(changes), 'accepted');
const config = () => runtimeConnectionConfig('postgres://synthetic@localhost/test', true);
function client(result) {
  const c = new EventEmitter(); c.calls = 0;
  c.query = async () => { c.calls++; return { rows: result === undefined ? [] : [result] }; };
  c.release = () => {};
  return c;
}
async function capture(work, log) {
  const previous = Logger.prototype.log, events = [];
  Logger.prototype.log = function (value) { events.push(JSON.parse(value)); return log?.(value); };
  try { return await work(events); } finally { Logger.prototype.log = previous; }
}

test('fresh successful guard acceptance emits the exact fixed schema without another query', async () => {
  await capture(async events => {
    const c = client(row()); await config().onConnect(c);
    assert.equal(c.calls, 1); assert.equal(events.length, 1);
    const event = events[0];
    assert.equal(event.event, 'runtime_role_guard_accepted'); assert.equal(event.component, 'postgres_runtime');
    assert.match(event.connection_pool_id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.deepEqual(Object.keys(event).filter(key => key !== 'deployment_id'), ['event', 'component', 'connection_pool_id', 'runtime_role']);
    assert.deepEqual(event.runtime_role, { effective_role: 'talgov_staging_runtime', session_role: 'talgov_staging_runtime',
      predicates: Object.fromEntries(keys.map(key => [key, 'pass'])), safe_result: true, decision: 'accepted', result_status: 'complete', pool_observation: 'on_connect' });
  });
});

test('success emission is bounded to one attempt per pool guard instance across new clients and reuse', async () => {
  await capture(async events => {
    const cfg = config(), c = client(row());
    await cfg.onConnect(c); await cfg.onConnect(c);
    await Promise.all(Array.from({ length: 20 }, () => cfg.onConnect(client(row()))));
    assert.equal(events.length, 1); assert.equal(c.calls, 2);
    await config().onConnect(client(row()));
    assert.equal(events.length, 2); assert.notEqual(events[0].connection_pool_id, events[1].connection_pool_id);
  });
});

for (const key of keys) for (const value of [false, null]) test(`rejected ${key}=${value} never emits acceptance`, async () => {
  await capture(async events => {
    const c = client(row({ [key]: value, safe: value }));
    await assert.rejects(config().onConnect(c), error => error.code === 'forbidden' && classifyFailure(error).reason === 'runtime_role_guard_rejected');
    assert.equal(c.calls, 1); assert.deepEqual(events, []);
  });
});

test('incomplete and inconsistent safe=true fixtures retain original admission but cannot emit acceptance', async () => {
  await capture(async events => {
    for (const result of [{ safe: true }, row({ inherits_runtime: null }), row({ no_public_create: false }), row({ effective_role: undefined })]) {
      const c = client(result); await config().onConnect(c); assert.equal(c.calls, 1);
    }
    assert.deepEqual(events, []);
  });
});

test('missing rows and query errors retain denial and never emit success', async () => {
  await capture(async events => {
    await assert.rejects(config().onConnect(client(undefined)), error => error.code === 'forbidden');
    const c = client(row()); c.query = async () => { throw Object.assign(Error('PRIVATE'), { code: '42501' }); };
    await assert.rejects(config().onConnect(c), error => error.code === 'unavailable' && classifyFailure(error).runtime_role.result_status === 'query_error');
    assert.deepEqual(events, []);
  });
});

test('TLS/channel binding denial still precedes the guard query and success logging', async () => {
  await capture(async events => {
    const cfg = runtimeConnectionConfig('postgres://synthetic@db.example/neondb?sslmode=verify-full&channel_binding=require');
    const c = client(row());
    await assert.rejects(cfg.onConnect(c), error => classifyFailure(error).reason === 'channel_binding_rejected');
    assert.equal(c.calls, 0); assert.deepEqual(events, []);
  });
});

test('cached checkout and transaction failures cannot generate fresh success telemetry', async () => {
  await capture(async events => {
    const cfg = config(), c = client(row()), db = new PostgresDatabase(cfg);
    await cfg.onConnect(c);
    c.query = async sql => { c.calls++; if (sql === 'FAIL_FIXTURE') throw Error('PRIVATE'); return { rows: [] }; };
    db.pool.connect = async () => c;
    try {
      for (let i = 0; i < 10; i++) assert.equal(await db.transaction(async () => 'ok'), 'ok');
      await assert.rejects(db.transaction(tx => tx.query('FAIL_FIXTURE')), error => classifyFailure(error).runtime_role.pool_observation === 'checkout_cached');
      assert.equal(events.length, 1); assert.equal(c.calls, 24);
    } finally { await db.close(); }
  });
  const records = [], emit = createRuntimeRoleAcceptanceEmitter({}, { log: value => records.push(value) });
  emit({ ...snapshot(), pool_observation: 'checkout_cached' });
  assert.deepEqual(records, []); emit(snapshot()); assert.equal(records.length, 1);
});

test('synchronous logger failure does not alter acceptance, denial or retry emission', async () => {
  await capture(async events => {
    const cfg = config(); await cfg.onConnect(client(row())); await cfg.onConnect(client(row()));
    await assert.rejects(cfg.onConnect(client(row({ safe: false }))), error => error.code === 'forbidden');
    assert.equal(events.length, 1);
  }, () => { throw Error('PRIVATE logging failure'); });
});

test('asynchronous logger rejection is consumed without delaying admission or retrying', async () => {
  await capture(async events => {
    const cfg = config(); await cfg.onConnect(client(row())); await cfg.onConnect(client(row()));
    await new Promise(resolve => setImmediate(resolve)); assert.equal(events.length, 1);
  }, () => Promise.reject(Error('PRIVATE logging failure')));
});

test('reentrant logging cannot duplicate acceptance', () => {
  let calls = 0, emit;
  emit = createRuntimeRoleAcceptanceEmitter({}, { log() { calls++; emit(snapshot()); } });
  emit(snapshot()); assert.equal(calls, 1);
});

test('telemetry failures do not spend the emission attempt until a qualifying observation exists', () => {
  const records = [], emit = createRuntimeRoleAcceptanceEmitter({}, { log: text => records.push(JSON.parse(text)) });
  for (const change of [{ decision: 'rejected' }, { safe_result: 'false' }, { result_status: 'incomplete' }, { result_status: 'inconsistent' },
    { result_status: 'query_error' }, { pool_observation: 'checkout_unobserved' }, { pool_observation: 'checkout_after_rejection' },
    { predicates: {} }, { predicates: Object.fromEntries(keys.map(key => [key, 'null'])) }]) emit({ ...snapshot(), ...change });
  assert.deepEqual(records, []); emit(snapshot()); assert.equal(records.length, 1);
});

test('unknown role names are observed as other; literal staging-role enforcement is unchanged', async () => {
  await capture(async events => {
    for (const role of ['talgov_runtime', 'UNRECOGNIZED_PRIVATE_ROLE']) await config().onConnect(client(row({ effective_role: role, session_role: role })));
    assert.equal(events[0].runtime_role.effective_role, 'talgov_runtime');
    assert.equal(events[1].runtime_role.effective_role, 'other'); assert.equal(events[1].runtime_role.session_role, 'other');
    assert.ok(!JSON.stringify(events).includes('UNRECOGNIZED_PRIVATE_ROLE'));
  });
});

test('success serialization redacts arbitrary identities, unexpected fields and invalid deployment correlation', () => {
  const secret = 'PRIVATE postgres://credential:password@host/db token catalog SQL 203.0.113.99 person@example.invalid';
  const records = [], context = { deployment_id: secret, token: secret, connection_pool_id: secret };
  const emit = createRuntimeRoleAcceptanceEmitter(context, { log: value => records.push(JSON.parse(value)) });
  emit({ ...runtimeRoleSnapshot(row({ effective_role: secret, session_role: secret, database_identity: secret }), 'accepted'),
    password: secret, sql: secret, parameters: [secret], host: secret, token: secret, stack: secret });
  assert.equal(records.length, 1); assert.equal(records[0].runtime_role.effective_role, 'other');
  assert.equal(records[0].deployment_id, undefined); assert.equal(records[0].runtime_role.database_identity, undefined);
  const text = JSON.stringify(records); for (const forbidden of ['PRIVATE', 'postgres:', 'password', 'token', 'catalog', 'SQL', '203.0.113', 'person@', 'parameters', 'host', 'stack']) assert.ok(!text.includes(forbidden));
});

test('deployment correlation accepts only a bounded deployment ID and is captured before context mutation', () => {
  for (const value of ['dpl_919KsbrTiN9gJ115EA9r1hg94uPD', '', 'dpl_' + 'a'.repeat(81), 'dpl_bad/id', 123, null]) {
    const records = [], context = { deployment_id: value };
    const emit = createRuntimeRoleAcceptanceEmitter(context, { log: text => records.push(JSON.parse(text)) });
    context.deployment_id = 'PRIVATE'; emit(snapshot());
    assert.equal(records[0].deployment_id, value === 'dpl_919KsbrTiN9gJ115EA9r1hg94uPD' ? value : undefined);
  }
});

test('poisoned getters and proxies are never read or stringified by the success framework', () => {
  const records = []; let reads = 0;
  const context = {}; Object.defineProperty(context, 'deployment_id', { get() { reads++; throw Error('PRIVATE'); } });
  const emit = createRuntimeRoleAcceptanceEmitter(context, { log: text => records.push(JSON.parse(text)) });
  const bad = { ...snapshot() }; Object.defineProperty(bad, 'effective_role', { get() { reads++; throw Error('PRIVATE'); } });
  assert.doesNotThrow(() => emit(bad));
  assert.doesNotThrow(() => emit(new Proxy({}, { getOwnPropertyDescriptor() { throw Error('PRIVATE'); } })));
  assert.deepEqual(records, []); emit(snapshot()); assert.equal(records.length, 1); assert.equal(reads, 0);
});
