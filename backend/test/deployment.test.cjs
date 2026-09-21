const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');

test('deployment entry boots concurrently and retains DTO metadata', async () => {
  process.env.NODE_ENV = 'production';
  process.env.SUPABASE_URL = 'http://127.0.0.1:1';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'test-public-key';
  process.env.ALLOWED_ORIGINS = 'https://talibon.gov.ph';
  delete process.env.RESEND_API_KEY;
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
    const responses = await Promise.all([1, 2].map(() => fetch(base + '/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bad', password: '', role: 'admin' }),
    })));
    for (const res of responses) {
      assert.equal(res.status, 400, await res.text());
      assert.ok(res.headers.get('x-request-id'));
      assert.match(res.headers.get('cache-control'), /no-store/);
    }
    const publicResponse = await fetch(base + '/api/about/profile');
    assert.equal(publicResponse.status, 200);
    assert.equal(publicResponse.headers.get("x-content-type-options"), "nosniff");
    assert.match(publicResponse.headers.get("content-security-policy"), /default-src 'none'/);
    const protectedResponse = await fetch(base + '/api/forms/certificate');
    assert.equal(protectedResponse.status, 401);
    const malformed = await fetch(base + '/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{',
    });
    assert.equal(malformed.status, 400);
    const oversized = await fetch(base + '/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'x'.repeat(1024 * 1024) }),
    });
    assert.equal(oversized.status, 413);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
