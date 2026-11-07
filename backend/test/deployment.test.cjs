const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');

test('deployment entry boots concurrently and retains DTO metadata', async () => {
  process.env.NODE_ENV = 'production';
  for (const key of ['DATABASE_URL','STAFF_AUTH_DATABASE_URL','MEDIA_DATABASE_URL']) process.env[key] = 'postgresql://synthetic@127.0.0.1:1/r2_missing?sslmode=verify-full';
  process.env.STAFF_AUTH_SECRET = 'synthetic-qualification-secret-at-least-32-characters';
  process.env.STAFF_AUTH_ORIGIN = 'https://talibon.gov.ph';
  process.env.ALLOWED_ORIGINS = 'https://talibon.gov.ph';
  for (const key of ['MEDIA_BUCKET','AWS_REGION','AWS_ACCESS_KEY_ID','AWS_SECRET_ACCESS_KEY','STAFF_MAIL_API_KEY','STAFF_MAIL_FROM']) process.env[key]='synthetic-test-only';
  process.env.AWS_ENDPOINT_URL_S3='https://br-synthetic.storage.c-1.ap-southeast-1.aws.neon.tech';
  const { default: handler } = await import('../../api/index.js');
  const server = createServer((req, res) => {
    Promise.resolve(handler(req, res)).catch(error => {
      res.statusCode = 500;
      res.end(error.message);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const health = await fetch(base + '/api/health');
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: 'ok', service: 'talibon-api' });
    assert.match(health.headers.get('cache-control'), /no-store/);
    const unavailable = await fetch(base + '/api/health/ready');
    assert.equal(unavailable.status, 503);
    assert.match(unavailable.headers.get('cache-control'), /no-store/);
    const responses = await Promise.all([1, 2].map(() => fetch(base + '/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bad', password: '', role: 'admin' }),
    })));
    for (const res of responses) {
      assert.equal(res.status, 410, await res.text());
      assert.ok(res.headers.get('x-request-id'));
      assert.match(res.headers.get('cache-control'), /no-store/);
    }
    const publicResponse = await fetch(base + '/api/about/profile');
    assert.equal(publicResponse.status, 503);
    assert.equal(publicResponse.headers.get("x-content-type-options"), "nosniff");
    assert.match(publicResponse.headers.get("content-security-policy"), /default-src 'none'/);
    const protectedResponse = await fetch(base + '/api/forms/certificate');
    assert.equal(protectedResponse.status, 410);
    const malformed = await fetch(base + '/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{',
    });
    assert.equal(malformed.status, 410);
    const oversized = await fetch(base + '/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'x'.repeat(1024 * 1024) }),
    });
    assert.equal(oversized.status, 410);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
