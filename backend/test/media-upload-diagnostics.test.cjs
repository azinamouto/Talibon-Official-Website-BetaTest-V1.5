const { test } = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const { MediaService } = require('../dist/api/media/media.service');
const { NeonObjectStore } = require('../dist/storage/neon-object-store');
const { sanitized } = require('../dist/database/postgres');
const { emitFailure, classifyFailure } = require('../dist/security/failure-diagnostics');
const { S3Client } = require('@aws-sdk/client-s3');

const requestId = '12345678-1234-4123-8123-123456789abc';
const secret = 'SYNTHETIC_PRIVATE_SENTINEL';
const provider = name => Object.assign(new Error(secret), { name, detail: secret, $metadata: { requestId: secret } });
const databaseFailure = (phase = 'query', outcome = 'rollback_confirmed') => sanitized(Object.assign(new Error(secret), { code: '42501' }), phase, outcome);

async function fixture(t) {
  const previous = process.env.VERCEL_DEPLOYMENT_ID;
  process.env.VERCEL_DEPLOYMENT_ID = 'dpl_SyntheticUpload';
  t.after(() => { if (previous === undefined) delete process.env.VERCEL_DEPLOYMENT_ID; else process.env.VERCEL_DEPLOYMENT_ID = previous; });
  const bytes = await sharp({ create: { width: 8, height: 8, channels: 3, background: 'white' } }).png().toBuffer();
  const input = { title: secret, description: secret, altText: secret, filename: 'private-fixture.png', mime: 'image/png', base64: bytes.toString('base64'), uploadId: requestId };
  const actor = { id: 'fictional-test-editor', role: 'editor', sessionVerified: true, assurance: 'mfa' };
  const calls = [], logs = [];
  const row = { id: requestId, object_key: 'assets/private-fixture/test-upload', processing: 'pending' };
  const repo = {
    throttle: async () => { calls.push('throttle'); return true; },
    reserve: async () => { calls.push('reserve'); return row; },
    ready: async () => { calls.push('ready'); return { ...row, processing: 'ready' }; },
  };
  const store = {
    verifyPrivate: async () => { calls.push('privacy'); },
    put: async () => { calls.push('put'); },
    read: async () => { calls.push('read'); return bytes; },
  };
  const service = new MediaService();
  service.configure(repo, store);
  service.logger = { warn: text => logs.push(JSON.parse(text)) };
  return { service, repo, store, input, actor, calls, logs };
}

for (const [method, stage, dependency, error, reason, expectedCalls] of [
  ['throttle', 'authorization_throttle', 'database', () => databaseFailure(), 'permission_denied', ['throttle']],
  ['reserve', 'reservation', 'database', () => databaseFailure(), 'permission_denied', ['throttle', 'privacy', 'reserve']],
  ['privacy', 'storage_privacy', 'storage', () => provider('AccessDenied'), 'storage_access_denied', ['throttle', 'privacy']],
  ['put', 'storage_put', 'storage', () => provider('RequestTimeout'), 'storage_timeout', ['throttle', 'privacy', 'reserve', 'put']],
  ['read', 'storage_read', 'storage', () => provider('NoSuchKey'), 'storage_object_missing', ['throttle', 'privacy', 'reserve', 'put', 'read']],
  ['ready', 'readiness', 'database', () => databaseFailure('commit', 'unknown'), 'permission_denied', ['throttle', 'privacy', 'reserve', 'put', 'read', 'ready']],
]) test(`upload diagnostics distinguish failure at ${stage} and stop subsequent effects`, async t => {
  const f = await fixture(t), original = structuredClone(f.input);
  const target = ['throttle', 'reserve', 'ready'].includes(method) ? f.repo : f.store;
  const name = method === 'privacy' ? 'verifyPrivate' : method;
  target[name] = async () => { f.calls.push(method); throw error(); };
  await assert.rejects(f.service.upload(f.actor, f.input, requestId), e => e.getStatus() === 503 && !e.message.includes(secret));
  assert.deepEqual(f.calls, expectedCalls);
  assert.deepEqual(f.input, original);
  assert.equal(f.logs.length, 1);
  const log = f.logs[0];
  assert.equal(log.media_stage, stage); assert.equal(log.dependency, dependency); assert.equal(log.reason, reason);
  assert.equal(log.request_id, requestId); assert.equal(log.deployment_id, 'dpl_SyntheticUpload');
  assert.match(log.timestamp, /^\d{4}-\d\d-\d\dT.*Z$/); assert.ok(Number.isFinite(Date.parse(log.timestamp)));
  if (dependency === 'database') {
    assert.equal(log.error_code, '42501');
    assert.equal(log.transaction_outcome, method === 'ready' ? 'unknown' : 'rollback_confirmed');
  }
  assert.doesNotMatch(JSON.stringify(f.logs), /SYNTHETIC_PRIVATE|private-fixture|filename|base64|object_key|\$metadata/);
});

test('a missing media database is logged before storage or any upload effects', async t => {
  const f = await fixture(t), previous = process.env.MEDIA_DATABASE_URL;
  delete process.env.MEDIA_DATABASE_URL;
  t.after(() => { if (previous !== undefined) process.env.MEDIA_DATABASE_URL = previous; });
  const service = new MediaService(); service.logger = f.service.logger;
  await assert.rejects(service.upload(f.actor, f.input, requestId), e => e.getStatus() === 503);
  assert.deepEqual(f.calls, []); assert.equal(f.logs.length, 1);
  assert.equal(f.logs[0].media_stage, 'database_configuration'); assert.equal(f.logs[0].dependency, 'database');
  assert.equal(f.logs[0].phase, 'configuration'); assert.equal(f.logs[0].transaction_outcome, 'not_started');
});

test('malformed storage configuration is sanitized and its 503 receives an upload diagnostic', async t => {
  const f = await fixture(t), previous = process.env.AWS_ENDPOINT_URL_S3;
  process.env.AWS_ENDPOINT_URL_S3 = secret;
  t.after(() => { if (previous === undefined) delete process.env.AWS_ENDPOINT_URL_S3; else process.env.AWS_ENDPOINT_URL_S3 = previous; });
  assert.throws(() => new NeonObjectStore(), e => e.getStatus?.() === 503 && !e.message.includes(secret));
  f.service.configure(f.repo, undefined);
  await assert.rejects(f.service.upload(f.actor, f.input, requestId), e => e.getStatus() === 503);
  assert.deepEqual(f.calls, []); assert.equal(f.logs.length, 1);
  assert.equal(f.logs[0].media_stage, 'storage_configuration'); assert.equal(f.logs[0].dependency, 'storage');
  assert.equal(f.logs[0].phase, 'configuration'); assert.equal(f.logs[0].reason, 'invalid_configuration');
  assert.doesNotMatch(JSON.stringify(f.logs), /SYNTHETIC_PRIVATE|AWS_ENDPOINT|private-fixture/);
});

test('checksum mismatch never marks an upload ready and records the failed integrity check', async t => {
  const f = await fixture(t);
  f.store.read = async () => { f.calls.push('read'); return Buffer.from(secret); };
  await assert.rejects(f.service.upload(f.actor, f.input, requestId), e => e.getStatus() === 503);
  assert.deepEqual(f.calls, ['throttle', 'privacy', 'reserve', 'put', 'read']);
  assert.equal(f.logs[0].media_stage, 'checksum_verification'); assert.equal(f.logs[0].reason, 'storage_integrity_failed');
});

test('expected MIME validation and throttling failures retain status and omit dependency warnings', async t => {
  const f = await fixture(t);
  await assert.rejects(f.service.upload(f.actor, { ...f.input, mime: 'application/pdf' }, requestId), e => e.getStatus() === 400);
  assert.deepEqual(f.calls, ['throttle']); assert.deepEqual(f.logs, []);
  f.repo.throttle = async () => false;
  await assert.rejects(f.service.upload(f.actor, f.input, requestId), e => e.getStatus() === 429);
  assert.deepEqual(f.logs, []);
});

test('successful upload still validates private storage, stores and verifies bytes, then marks ready', async t => {
  const f = await fixture(t), result = await f.service.upload(f.actor, f.input, requestId);
  assert.equal(result.processing, 'ready'); assert.equal(result.object_key, undefined);
  assert.deepEqual(f.calls, ['throttle', 'privacy', 'reserve', 'put', 'read', 'ready']);
  assert.deepEqual(f.logs, []);
});

test('upload stage and deployment values are allowlisted and cannot carry caller details', () => {
  const logs = [];
  emitFailure(Error(secret), { component: 'media', operation: 'media_upload', route: 'admin_media_uploads', request_id: requestId,
    media_stage: secret, dependency: secret, deployment_id: secret, filename: secret }, { warn: text => logs.push(JSON.parse(text)) });
  assert.equal(logs.length, 1); assert.equal(logs[0].media_stage, undefined); assert.equal(logs[0].dependency, undefined);
  assert.equal(logs[0].deployment_id, undefined); assert.doesNotMatch(JSON.stringify(logs), /SYNTHETIC_PRIVATE|filename/);
});

test('storage error classifications omit provider messages, metadata and unknown names', () => {
  for (const [name, reason] of [
    ['AccessDenied', 'storage_access_denied'], ['InvalidAccessKeyId', 'storage_authentication_failed'],
    ['SignatureDoesNotMatch', 'storage_authentication_failed'], ['ExpiredToken', 'storage_authentication_failed'],
    ['NoSuchBucket', 'storage_bucket_missing'], ['NoSuchKey', 'storage_object_missing'],
    ['RequestTimeout', 'storage_timeout'], ['TimeoutError', 'storage_timeout'], ['AbortError', 'storage_timeout'],
    ['SlowDown', 'storage_unavailable'], ['InternalError', 'storage_unavailable'], ['NotImplemented', 'storage_operation_unsupported'],
  ]) {
    const details = classifyFailure(provider(name), 'work', true);
    assert.equal(details.reason, reason); assert.equal(details.error_code, name);
    assert.doesNotMatch(JSON.stringify(details), /SYNTHETIC_PRIVATE|requestId|\$metadata/);
  }
  const error = provider(secret);
  Object.defineProperty(error, 'name', { get() { throw Error(secret); } });
  assert.equal(classifyFailure(error, 'work', true).reason, 'unexpected_exception');
  assert.equal(classifyFailure(provider(secret), 'work', true).error_code, undefined);
  assert.equal(classifyFailure(provider('AbortError')).reason, 'unexpected_exception');
  assert.equal(classifyFailure(provider('AccessDenied')).error_code, undefined);
});

function storageEnvironment(t) {
  const env = { AWS_ENDPOINT_URL_S3: 'https://br-synthetic.storage.c-2.ap-southeast-1.aws.neon.tech', AWS_REGION: 'ap-southeast-1',
    AWS_ACCESS_KEY_ID: 'synthetic', AWS_SECRET_ACCESS_KEY: 'synthetic' };
  const saved = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]));
  Object.assign(process.env, env);
  t.after(() => { for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
}

test('private bucket checks accept the expected no-policy 404 and reject public or unknown access', async t => {
  storageEnvironment(t);
  const original = S3Client.prototype.send, calls = [];
  t.after(() => { S3Client.prototype.send = original; });
  const privateAcl = { Owner: { ID: 'synthetic-owner' }, Grants: [{ Grantee: { Type: 'CanonicalUser', ID: 'synthetic-owner' } }] };
  let acl = privateAcl, policy;
  S3Client.prototype.send = async function(command) {
    calls.push(command.constructor.name);
    if (command.constructor.name === 'GetBucketAclCommand') return acl;
    if (command.constructor.name === 'GetBucketPolicyCommand') {
      if (policy === undefined) throw provider('NoSuchBucketPolicy');
      return { Policy: JSON.stringify(policy) };
    }
    throw Error('No other storage operation is permitted in this test');
  };
  const store = new NeonObjectStore('synthetic-bucket');
  await store.verifyPrivate();
  assert.deepEqual(calls, ['GetBucketAclCommand', 'GetBucketPolicyCommand']);
  for (const value of [{}, { Owner: privateAcl.Owner, Grants: [{ Grantee: { Type: 'Group', URI: 'synthetic-public-group' } }] }]) {
    acl = value;
    await assert.rejects(store.verifyPrivate(), error => classifyFailure(error).reason === 'storage_privacy_unverified');
  }
  acl = privateAcl; policy = { Statement: [{ Effect: 'Allow', Principal: '*' }] };
  await assert.rejects(store.verifyPrivate(), error => classifyFailure(error).reason === 'storage_privacy_unverified');
  assert.ok(calls.every(name => ['GetBucketAclCommand', 'GetBucketPolicyCommand'].includes(name)));
});

test('storage configuration keeps the required private endpoint and credentials', t => {
  storageEnvironment(t);
  for (const key of ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY']) {
    delete process.env[key];
    assert.throws(() => new NeonObjectStore('synthetic-bucket'), e => e.getStatus() === 503 && classifyFailure(e).reason === 'invalid_configuration');
    process.env[key] = 'synthetic';
  }
  process.env.AWS_ENDPOINT_URL_S3 = 'http://br-synthetic.storage.c-2.ap-southeast-1.aws.neon.tech';
  assert.throws(() => new NeonObjectStore('synthetic-bucket'), e => e.getStatus() === 503);
});

test('concurrent upload failures keep independent stages and request IDs', async t => {
  const f = await fixture(t), otherRequest = '12345678-1234-4123-8123-123456789abd';
  let release;
  const blocked = new Promise(resolve => { release = resolve; });
  f.repo.reserve = async (_, input) => {
    if (input.objectKey.endsWith(requestId)) { await blocked; throw databaseFailure(); }
    return { id: otherRequest, processing: 'pending', object_key: input.objectKey };
  };
  f.store.put = async () => { release(); throw provider('AccessDenied'); };
  const results = await Promise.allSettled([
    f.service.upload(f.actor, f.input, requestId),
    f.service.upload(f.actor, { ...f.input, uploadId: otherRequest }, otherRequest),
  ]);
  assert.ok(results.every(result => result.status === 'rejected' && result.reason.getStatus() === 503));
  assert.equal(f.logs.length, 2);
  assert.equal(f.logs.find(log => log.request_id === requestId).media_stage, 'reservation');
  assert.equal(f.logs.find(log => log.request_id === otherRequest).media_stage, 'storage_put');
});
