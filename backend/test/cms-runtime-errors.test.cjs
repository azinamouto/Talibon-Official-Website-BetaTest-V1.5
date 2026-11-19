require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ServiceUnavailableException } = require('@nestjs/common');
const { ContentService } = require('../dist/api/content/content.service');
const { MediaService } = require('../dist/api/media/media.service');
const { AllExceptionsFilter } = require('../dist/security/all-exceptions.filter');
const { attachFailure } = require('../dist/security/failure-diagnostics');
const { DatabaseError } = require('../dist/database/postgres');
const requestId = '99999999-9999-4999-8999-999999999999';
function response(error, path) {
  let body, status;
  const res = { setHeader() {}, status(code) { status = code; return this; }, json(value) { body = value; } };
  new AllExceptionsFilter().catch(error, { switchToHttp: () => ({ getResponse: () => res,
    getRequest: () => ({ path, method: 'POST', requestId }) }) });
  return { body, status };
}
for (const service of ['content', 'media']) test(`${service} dependency classification survives the HTTP boundary without leaking provider details`, async () => {
  const failure = attachFailure(new DatabaseError('unavailable'), { phase: 'query', reason: 'relation_missing', error_code: '42P01', transaction_outcome: 'rollback_confirmed' });
  failure.message = 'private schema, credential and provider details';
  const instance = service === 'content' ? new ContentService() : new MediaService();
  instance.configure(service === 'content' ? { publishDirect: async () => { throw failure; } } : { options: async () => { throw failure; } });
  let error;
  try { await (service === 'content' ? instance.publish('organizational_chart', {}, {}, requestId, requestId) : instance.options({})); }
  catch (reason) { error = reason; }
  assert.ok(error instanceof ServiceUnavailableException);
  const result = response(error, `/api/admin/${service}/uploads`);
  assert.equal(result.status, 503);
  assert.equal(result.body.failureCode, 'dependency_unavailable');
  assert.equal(result.body.requestId, requestId);
  assert.doesNotMatch(JSON.stringify(result.body), /42P01|private schema|credential|rollback_confirmed|relation_missing/);
});
test('uncertain outcomes keep the safe retry hint and unrelated endpoints gain no CMS classification', () => {
  const error = attachFailure(new ServiceUnavailableException('private details'), { phase: 'commit', reason: 'connection_failure', transaction_outcome: 'unknown' });
  assert.equal(response(error, '/api/admin/content/news/publish').body.failureCode, 'operation_unconfirmed');
  assert.equal(response(error, '/api/health/ready').body.failureCode, undefined);
});
test('storage denial is classified without relaxing private storage or reserving an asset', async () => {
  const bytes = await require('sharp')({ create: { width: 1, height: 1, channels: 3, background: 'white' } }).png().toBuffer();
  let reserved = false;
  const media = new MediaService();
  media.configure({ throttle: async () => true, reserve: async () => { reserved = true; } },
    { verifyPrivate: async () => { throw Object.assign(new Error('private credentials'), { name: 'AccessDenied' }); } });
  let error;
  try { await media.upload({}, { filename: 'fixture.png', mime: 'image/png', base64: bytes.toString('base64') }, requestId); }
  catch (reason) { error = reason; }
  assert.equal(reserved, false);
  const result = response(error, '/api/admin/media/uploads');
  assert.equal(result.status, 503);
  assert.equal(result.body.failureCode, 'dependency_unavailable');
  assert.doesNotMatch(JSON.stringify(result.body), /AccessDenied|credentials/);
});
