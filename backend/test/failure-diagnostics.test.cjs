const { test } = require('node:test');
const assert = require('node:assert/strict');
const { attachFailure, classifyFailure, diagnosticRoute, emitFailure } = require('../dist/security/failure-diagnostics');
const { sanitized, DatabaseError } = require('../dist/database/postgres');
const requestId = '12345678-1234-4123-8123-123456789abc';
const context = { component: 'rate_limiter', operation: 'throttle_upsert', route: 'news', request_id: requestId, elapsed_ms: 12.4 };
const provider = (code, message = 'synthetic sensitive provider detail') => Object.assign(new Error(message), { code });

for (const [name, error, phase, reason, expectedPhase = phase] of [
  ['connection refusal', provider('ECONNREFUSED'), 'connect', 'connection_failure'],
  ['connection timeout code', provider('ETIMEDOUT'), 'connect', 'connection_timeout'],
  ['pool checkout timeout', Error('timeout exceeded when trying to connect'), 'connect', 'connection_timeout'],
  ['pool connection deadline', Error('Connection terminated due to connection timeout'), 'connect', 'connection_timeout'],
  ['unverified certificate', provider('UNABLE_TO_VERIFY_LEAF_SIGNATURE'), 'connect', 'tls_failure', 'tls'],
  ['hostname mismatch', provider('ERR_TLS_CERT_ALTNAME_INVALID'), 'connect', 'tls_failure', 'tls'],
  ['authentication', provider('28P01'), 'connect', 'database_authentication_failed'],
  ['permission', provider('42501'), 'query', 'permission_denied'],
  ['missing relation', provider('42P01'), 'query', 'relation_missing'],
  ['missing column', provider('42703'), 'query', 'column_missing'],
  ['driver query deadline', Error('Query read timeout'), 'query', 'query_timeout'],
  ['statement timeout', provider('57014', 'canceling statement due to statement timeout'), 'query', 'query_timeout'],
  ['unexplained cancellation', provider('57014'), 'query', 'query_cancelled'],
  ['lock unavailable', provider('55P03'), 'query', 'lock_unavailable'],
  ['transaction timeout', provider('25P04'), 'query', 'transaction_timeout'],
  ['idle transaction timeout', provider('25P03'), 'query', 'idle_transaction_timeout'],
  ['unknown exception', new TypeError('synthetic secret'), 'work', 'unexpected_exception'],
]) test(`safe classification: ${name}`, () => {
  const details = classifyFailure(error, phase);
  assert.equal(details.phase, expectedPhase);
  assert.equal(details.reason, reason);
  assert.ok(Object.isFrozen(details));
});

test('original provider code/phase survive sanitization without changing public error mappings', () => {
  for (const [code, publicCode] of [['42501', 'unavailable'], ['28P01', 'unavailable'], ['23505', 'conflict'], ['40001', 'conflict'], ['23503', 'invalid']]) {
    const error = sanitized(provider(code), 'query');
    const again = sanitized(error, 'work', 'rollback_confirmed');
    assert.equal(again, error);
    assert.equal(again.code, publicCode);
    assert.equal(again.message, `Database operation ${publicCode}`);
    assert.equal(again.cause, undefined);
    assert.equal(classifyFailure(again).error_code, code);
    assert.equal(classifyFailure(again).phase, 'query');
    assert.equal(classifyFailure(again).transaction_outcome, 'rollback_confirmed');
    assert.deepEqual(JSON.parse(JSON.stringify(again)), { code: publicCode });
  }
});

test('fixed-schema emission excludes hostile error/context fields and validates UUID/timing', () => {
  const secret = 'SYNTHETIC_PRIVATE_SENTINEL';
  const error = provider('42501', `${secret} postgres://private@host/db 203.0.113.99 person@example.invalid`);
  error.detail = secret; error.hint = secret; error.parameters = [secret]; error.cause = error;
  const records = [];
  emitFailure(error, { ...context, elapsed_ms: 999999, token: secret, ip: secret, sql: secret, staff: secret }, { warn: s => records.push(JSON.parse(s)) });
  assert.equal(records.length, 1);
  assert.deepEqual(Object.keys(records[0]).sort(), ['event', 'component', 'operation', 'route', 'phase', 'reason', 'error_code', 'request_id', 'elapsed_ms'].sort());
  assert.equal(records[0].request_id, requestId);
  assert.equal(records[0].elapsed_ms, 60000);
  for (const prohibited of [secret, 'postgres:', '203.0.113.99', 'person@', 'parameters', 'stack', 'cause']) assert.ok(!JSON.stringify(records).includes(prohibited));
  for (const elapsed of [-1, NaN, Infinity]) {
    const rows = [];
    emitFailure(provider(secret), { ...context, request_id: secret, route: secret, operation: secret, elapsed_ms: elapsed, transaction_outcome: secret }, { warn: s => rows.push(JSON.parse(s)) });
    assert.equal(rows[0].request_id, undefined);
    assert.equal(rows[0].error_code, undefined);
    assert.equal(rows[0].transaction_outcome, undefined);
    assert.equal(rows[0].route, 'other');
    assert.equal(rows[0].operation, 'unexpected');
    assert.equal(rows[0].elapsed_ms, elapsed === -1 ? 0 : undefined);
    assert.ok(!JSON.stringify(rows).includes(secret));
  }
});

test('metadata is immutable, validated and never attached to enumerable exception properties', () => {
  const error = new DatabaseError('forbidden');
  attachFailure(error, { phase: 'runtime_role', reason: 'runtime_role_guard_rejected', transaction_outcome: 'not_started' });
  assert.equal(classifyFailure(error).reason, 'runtime_role_guard_rejected');
  assert.deepEqual(Object.keys(error), ['code']);
  const hostile = attachFailure(Error('private'), { phase: 'private', reason: 'private', error_code: 'private', transaction_outcome: 'private' });
  assert.deepEqual(classifyFailure(hostile), { phase: 'work', reason: 'unexpected_exception' });
});

test('throwing accessors, proxy traps and logging failures cannot escape diagnostics', () => {
  let reads = 0;
  const error = Object.defineProperties({}, { code: { get() { reads++; throw Error('private'); } }, message: { get() { reads++; throw Error('private'); } } });
  assert.equal(classifyFailure(error).reason, 'unexpected_exception');
  assert.equal(reads, 0);
  const proxy = new Proxy({}, { getOwnPropertyDescriptor() { throw Error('private'); } });
  assert.equal(classifyFailure(proxy).reason, 'unexpected_exception');
  assert.doesNotThrow(() => emitFailure(proxy, context, { warn() { throw Error('logger unavailable'); } }));
  assert.doesNotThrow(() => emitFailure(error, proxy, { warn() { throw Error('logger unavailable'); } }));
});

test('validated enum values are reused without a second proxy property read', () => {
  const records = [];
  const proxy = value => new Proxy(value, { get() { throw Error('synthetic private accessor'); } });
  const error = attachFailure(Error('private'), proxy({ phase: 'runtime_role', reason: 'runtime_role_guard_rejected' }));
  emitFailure(error, proxy(context), { warn: s => records.push(JSON.parse(s)) });
  assert.equal(records.length, 1);
  assert.equal(records[0].phase, 'runtime_role');
  assert.equal(records[0].reason, 'runtime_role_guard_rejected');
  assert.equal(records[0].operation, 'throttle_upsert');
  assert.equal(records[0].route, 'news');
  assert.ok(!JSON.stringify(records).includes('private'));
});

test('route labels never contain caller paths or identifiers', () => {
  assert.equal(diagnosticRoute('/api/health/ready'), 'readiness');
  assert.equal(diagnosticRoute('/api/about/profile'), 'about_profile');
  assert.equal(diagnosticRoute('/api/news/private-id?token=private'), 'other');
  assert.equal(diagnosticRoute('/api/admin/media/uploads'), 'admin_media_uploads');
  assert.equal(diagnosticRoute('/api/admin/media/private-id'), 'admin_media');
});

test('upload configuration diagnostics retain a safe reason and request ID without exposing files', () => {
  const records=[];
  const error=attachFailure(new DatabaseError('unavailable'),{phase:'configuration',reason:'media_category_missing',transaction_outcome:'rollback_confirmed'});
  emitFailure(error,{component:'media',operation:'media_upload',route:'admin_media_uploads',request_id:requestId,filename:'private-photo.jpg',base64:'private bytes'}, {warn:value=>records.push(JSON.parse(value))});
  assert.equal(records[0].reason,'media_category_missing');assert.equal(records[0].component,'media');
  assert.equal(records[0].operation,'media_upload');assert.equal(records[0].request_id,requestId);
  assert.equal(records[0].transaction_outcome,'rollback_confirmed');
  assert.doesNotMatch(JSON.stringify(records),/private-photo|private bytes|filename|base64/);
});
