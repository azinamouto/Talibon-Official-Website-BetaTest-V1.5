const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { runtimeConnectionConfig, PostgresDatabase, sanitized, DatabaseError } = require('../dist/database/postgres');
const { RUNTIME_ROLE_PREDICATES, runtimeRoleSnapshot, attachFailure, classifyFailure, emitFailure } = require('../dist/security/failure-diagnostics');
const keys = ['identity_unchanged', 'inherits_runtime', 'no_elevated_role', 'no_schema_ownership', 'no_database_ownership', 'no_relation_ownership', 'no_database_create', 'no_public_create', 'no_app_create'];
const context = { component: 'rate_limiter', operation: 'configuration', route: 'news', request_id: '12345678-1234-4123-8123-123456789abc' };
const row = changes => ({ ...Object.fromEntries(keys.map(k => [k, true])), safe: true,
  effective_role: 'talgov_staging_runtime', session_role: 'talgov_staging_runtime', database_identity: 'neondb', ...changes });
const config = () => runtimeConnectionConfig('postgres://synthetic@localhost/test', true);
function client(result, queryError) {
  const c = new EventEmitter(); c.calls = [];
  c.query = async (sql, values) => { c.calls.push({ sql, values }); if (queryError) throw queryError; return { rows: result === undefined ? [] : [result] }; };
  c.release = () => {};
  return c;
}
function logged(error) { const output = []; emitFailure(error, context, { warn: s => output.push(JSON.parse(s)) }); assert.equal(output.length, 1); return output[0]; }

for (const key of keys) for (const value of [false, null]) test(`guard rejects and identifies ${key}=${value}`, async () => {
  const c = client(row({ [key]: value, safe: value }));
  await assert.rejects(config().onConnect(c), error => {
    assert.equal(error.code, 'forbidden');
    assert.equal(error.message, 'Database operation forbidden');
    const event = logged(sanitized(error, 'connect', 'not_started'));
    assert.equal(event.reason, 'runtime_role_guard_rejected'); assert.equal(event.phase, 'runtime_role');
    assert.equal(event.transaction_outcome, 'not_started');
    assert.deepEqual(Object.keys(event.runtime_role.predicates), keys);
    assert.equal(event.runtime_role.predicates[key], value === false ? 'fail' : 'null');
    assert.ok(keys.filter(k => k !== key).every(k => event.runtime_role.predicates[k] === 'pass'));
    assert.equal(event.runtime_role.decision, 'rejected');
    assert.equal(event.runtime_role.result_status, value === false ? 'complete' : 'incomplete');
    assert.equal(event.runtime_role.safe_result, String(value));
    assert.equal(event.runtime_role.effective_role, 'talgov_staging_runtime');
    assert.equal(event.runtime_role.session_role, 'talgov_staging_runtime');
    assert.equal(event.runtime_role.database_identity, 'neondb');
    assert.equal(event.runtime_role.pool_observation, 'on_connect');
    assert.deepEqual(JSON.parse(JSON.stringify(error)), { code: 'forbidden' });
    return true;
  });
  assert.equal(c.calls.length, 1); assert.equal(c.calls[0].values, undefined);
});

test('multiple failed predicates are retained; all-pass admission stays silent', async () => {
  const c = client(row({ inherits_runtime: false, no_database_create: false, safe: false }));
  await assert.rejects(config().onConnect(c), error => {
    const d = classifyFailure(error).runtime_role;
    assert.deepEqual(keys.filter(k => d.predicates[k] === 'fail'), ['inherits_runtime', 'no_database_create']); return true;
  });
  assert.deepEqual(RUNTIME_ROLE_PREDICATES, keys);
  assert.ok(Object.isFrozen(RUNTIME_ROLE_PREDICATES));
  const accepted = client(row()); const records = [], warn = console.warn; console.warn = s => records.push(s);
  try { await config().onConnect(accepted); } finally { console.warn = warn; }
  assert.equal(accepted.calls.length, 1); assert.deepEqual(records, []);
});

for (const [name, result, status] of [
  ['no row', undefined, 'row_missing'], ['partial row', { safe: false }, 'incomplete'],
  ['contradictory conjunction', row({ safe: false }), 'inconsistent'],
  ['nonboolean predicate', row({ inherits_runtime: 'PRIVATE', safe: false }), 'incomplete'],
]) test(`guard result shape: ${name} remains denied`, async () => {
  await assert.rejects(config().onConnect(client(result)), error => {
    assert.equal(error.code, 'forbidden'); assert.equal(classifyFailure(error).runtime_role.result_status, status);
    assert.ok(!JSON.stringify(logged(error)).includes('PRIVATE')); return true;
  });
});

for (const [code, message, reason] of [
  ['42501', 'PRIVATE permission', 'permission_denied'], ['42P01', 'PRIVATE schema', 'relation_missing'],
  ['57014', 'PRIVATE cancellation', 'query_cancelled'], ['57014', 'canceling statement due to statement timeout', 'query_timeout'],
  [undefined, 'Query read timeout', 'query_timeout'], ['08006', 'PRIVATE connection', 'connection_failure'],
  [undefined, 'PRIVATE unexpected', 'unexpected_exception'],
]) test(`guard query error is distinct from predicate denial: ${code || message}`, async () => {
  const failure = Object.assign(Error(message), { code, detail: 'PRIVATE', cause: Error('PRIVATE') });
  const c = client(undefined, failure);
  await assert.rejects(config().onConnect(c), error => {
    const event = logged(error); assert.equal(error.code, 'unavailable'); assert.equal(event.reason, reason);
    assert.equal(event.phase, 'runtime_role'); assert.equal(event.runtime_role.result_status, 'query_error');
    assert.equal(event.runtime_role.decision, 'not_evaluated');
    assert.ok(keys.every(k => event.runtime_role.predicates[k] === 'unavailable'));
    assert.equal(event.runtime_role.effective_role, 'unavailable');
    assert.ok(!JSON.stringify(event).includes('PRIVATE')); return true;
  });
  assert.equal(c.calls.length, 1);
});

test('TLS/channel binding admission runs before the role query', async () => {
  const production = runtimeConnectionConfig('postgres://synthetic@db.example/neondb?sslmode=verify-full&channel_binding=require');
  const c = client(row());
  await assert.rejects(production.onConnect(c), error => {
    assert.equal(classifyFailure(error).reason, 'channel_binding_rejected');
    assert.equal(classifyFailure(error).runtime_role, undefined); return true;
  });
  assert.equal(c.calls.length, 0); assert.equal(production.ssl.rejectUnauthorized, true);
});

test('raw identities, unexpected fields and poisoned accessors cannot leak', () => {
  const secret = 'PRIVATE postgres://credential:password@host/db 203.0.113.99 person@example.invalid';
  const raw = row({ effective_role: secret, session_role: secret, database_identity: secret, safe: false });
  raw.parameters = [secret]; raw[secret] = secret; raw.predicates = { [secret]: secret };
  let reads = 0; Object.defineProperty(raw, 'no_public_create', { get() { reads++; throw Error(secret); } });
  const snapshot = runtimeRoleSnapshot(raw, 'rejected');
  assert.equal(snapshot.effective_role, 'other'); assert.equal(snapshot.session_role, 'other');
  assert.equal(snapshot.database_identity, 'other'); assert.equal(snapshot.predicates.no_public_create, 'unavailable');
  const error = attachFailure(new DatabaseError('forbidden'), { phase: 'runtime_role', reason: 'runtime_role_guard_rejected', runtime_role: snapshot });
  const text = JSON.stringify(logged(error));
  for (const value of ['PRIVATE', 'postgres:', 'password', '203.0.113', 'person@', 'parameters', 'stack', 'cause']) assert.ok(!text.includes(value));
  assert.equal(reads, 0); assert.deepEqual(Object.keys(error), ['code']);
});

test('nested diagnostics are validated, deeply frozen and copied before subsequent row mutation', () => {
  const raw = row({ no_app_create: false, safe: false }); const observation = runtimeRoleSnapshot(raw, 'rejected');
  const error = attachFailure(Error('PRIVATE'), { phase: 'runtime_role', reason: 'runtime_role_guard_rejected', runtime_role: observation });
  raw.no_app_create = true; raw.effective_role = 'PRIVATE';
  const d = classifyFailure(sanitized(error, 'connect', 'not_started')).runtime_role;
  assert.equal(d.predicates.no_app_create, 'fail'); assert.equal(d.effective_role, 'talgov_staging_runtime');
  assert.ok(Object.isFrozen(d)); assert.ok(Object.isFrozen(d.predicates));
  const forged = { decision: 'PRIVATE', result_status: 'PRIVATE', safe_result: 'PRIVATE', effective_role: 'PRIVATE', session_role: {}, database_identity: 'PRIVATE', predicates: Object.fromEntries(keys.map(k => [k, 'PRIVATE'])), pool_observation: 'PRIVATE', token: 'PRIVATE' };
  const output = logged(attachFailure(Error('PRIVATE'), { phase: 'runtime_role', reason: 'runtime_role_guard_rejected', runtime_role: forged }));
  assert.ok(!JSON.stringify(output).includes('PRIVATE'));
  assert.ok(keys.every(k => output.runtime_role.predicates[k] === 'unavailable'));
  const proxy = new Proxy({}, { getOwnPropertyDescriptor() { throw Error('PRIVATE'); } });
  assert.doesNotThrow(() => logged(attachFailure(Error('PRIVATE'), { phase: 'runtime_role', reason: 'runtime_role_guard_rejected', runtime_role: proxy })));
  assert.ok(!JSON.stringify(runtimeRoleSnapshot(proxy, 'PRIVATE', 'PRIVATE')).includes('PRIVATE'));
});

for (const identity of ['talgov_staging_runtime', 'talgov_runtime', 'talgov_staging_migrator', 'neondb_owner', 'postgres']) test(`known role identity is allowlisted: ${identity}`, () => {
  const output = runtimeRoleSnapshot(row({ effective_role: identity, session_role: identity }), 'rejected');
  assert.equal(output.effective_role, identity); assert.equal(output.session_role, identity);
});

test('pool checkout refusal preserves connect classification and never starts work', async () => {
  const db = new PostgresDatabase(config()); let work = 0;
  db.pool.connect = async () => { throw Object.assign(Error('PRIVATE'), { code: 'ECONNREFUSED' }); };
  try {
    await assert.rejects(db.transaction(async () => { work++; }), error => {
      assert.equal(classifyFailure(error).phase, 'connect'); assert.equal(classifyFailure(error).reason, 'connection_failure');
      assert.equal(classifyFailure(error).runtime_role, undefined); assert.equal(classifyFailure(error).transaction_outcome, 'not_started'); return true;
    }); assert.equal(work, 0);
  } finally { await db.close(); }
});

test('pool observations distinguish cached, absent and previously rejected clients without extra queries', async () => {
  for (const mode of ['checked', 'unobserved', 'rejected', 'query_error']) {
    const cfg = config(), c = client(row({ safe: mode !== 'rejected' })), db = new PostgresDatabase(cfg);
    if (mode === 'checked') await cfg.onConnect(c);
    if (mode === 'rejected') await assert.rejects(cfg.onConnect(c), e => e.code === 'forbidden');
    if (mode === 'query_error') {
      c.query = async () => { throw Object.assign(Error('PRIVATE'), { code: '42501' }); };
      await assert.rejects(cfg.onConnect(c), e => e.code === 'unavailable');
    }
    const initial = c.calls.length;
    c.query = async sql => { c.calls.push({ sql }); if (sql === 'SELECT FAIL') throw Object.assign(Error('PRIVATE'), { code: '08006' }); return { rows: [] }; };
    const releases = []; c.release = discard => releases.push(discard); db.pool.connect = async () => c;
    try {
      await assert.rejects(db.transaction(tx => tx.query('SELECT FAIL')), error => {
        const d = classifyFailure(error), event = logged(error);
        assert.equal(d.phase, 'query'); assert.equal(d.reason, 'connection_failure'); assert.equal(d.transaction_outcome, 'rollback_confirmed');
        assert.equal(event.runtime_role.pool_observation, mode === 'checked' ? 'checkout_cached' : mode === 'unobserved' ? 'checkout_unobserved' : 'checkout_after_rejection');
        assert.equal(event.runtime_role.result_status, mode === 'checked' ? 'complete' : mode === 'rejected' ? 'inconsistent' : mode === 'query_error' ? 'query_error' : 'not_observed');
        return true;
      });
      assert.equal(c.calls.length - initial, 3); assert.equal(c.calls.at(-1).sql, 'ROLLBACK');
      assert.deepEqual(releases, [false]); assert.equal(c.listenerCount('error'), 0);
    } finally { await db.close(); }
  }
});

test('cached pool observations do not cross clients, and healthy reuse emits no logs', async () => {
  const cfg = config(), a = client(row()), b = client(row({ database_identity: 'PRIVATE_DB' })), db = new PostgresDatabase(cfg);
  await cfg.onConnect(a); await cfg.onConnect(b);
  const logs = [], warn = console.warn; console.warn = x => logs.push(x);
  try {
    for (const [c, identity] of [[a, 'neondb'], [b, 'other'], [a, 'neondb']]) {
      c.query = async sql => { c.calls.push({ sql }); if (sql === 'SELECT FAIL') throw Error('PRIVATE'); return { rows: [] }; };
      db.pool.connect = async () => c;
      assert.equal(await db.transaction(async () => 'ok'), 'ok');
      await assert.rejects(db.transaction(tx => tx.query('SELECT FAIL')), error => {
        assert.equal(classifyFailure(error).runtime_role.database_identity, identity); return true;
      });
    }
    assert.deepEqual(logs, []); assert.equal(a.calls.filter(q => q.sql.startsWith('WITH')).length, 1);
    assert.equal(b.calls.filter(q => q.sql.startsWith('WITH')).length, 1);
  } finally { console.warn = warn; await db.close(); }
});

test('predicate diagnostics survive throttling and audit boundaries without changing denial or completion', async () => {
  const { RateLimiterGuard } = require('../dist/security/rate-limiter.guard');
  const { AuditMiddleware } = require('../dist/security/audit.middleware'); const { Reflector } = require('@nestjs/core');
  let rejected; await assert.rejects(config().onConnect(client(row({ inherits_runtime: false, safe: false }))), e => { rejected = sanitized(e, 'connect', 'not_started'); return true; });
  const guard = new RateLimiterGuard(new Reflector()), records = [];
  guard.logger = { warn: s => records.push(JSON.parse(s)) }; guard.configure({ transaction: async () => { throw rejected; } });
  const previous = process.env.VERCEL; delete process.env.VERCEL;
  try {
    const req = { path: '/api/news', method: 'GET', headers: {}, ip: '203.0.113.1', requestId: context.request_id };
    await assert.rejects(guard.canActivate({ getHandler: () => () => {}, getClass: () => class {}, switchToHttp: () => ({ getRequest: () => req, getResponse: () => ({ setHeader() {} }) }) }), e => e.getStatus() === 503);
    assert.equal(records.length, 1); assert.equal(records[0].runtime_role.predicates.inherits_runtime, 'fail');
    const audit = new AuditMiddleware(); let ends = 0, writes = 0;
    audit.logger = { warn: s => records.push(JSON.parse(s)), log() {}, error() {} };
    audit.database = { transaction: async () => { writes++; throw rejected; } };
    const res = { statusCode: 503, end() { ends++; return this; } }; audit.use(req, res, () => {}); res.end(); res.end();
    await new Promise(r => setImmediate(r));
    assert.equal(writes, 1); assert.equal(ends, 1); assert.equal(records.length, 2);
    assert.equal(records[1].component, 'audit'); assert.equal(records[1].runtime_role.predicates.inherits_runtime, 'fail');
    assert.ok(!JSON.stringify(records).includes('203.0.113.1'));
    guard.logger = { warn() { throw Error('PRIVATE logging failure'); } };
    await assert.rejects(guard.canActivate({ getHandler: () => () => {}, getClass: () => class {}, switchToHttp: () => ({ getRequest: () => req, getResponse: () => ({}) }) }), e => e.getStatus() === 503);
  } finally { if (previous === undefined) delete process.env.VERCEL; else process.env.VERCEL = previous; }
});
