const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { Module, Controller, Get } = require('@nestjs/common');
const { NestFactory, APP_GUARD, APP_FILTER } = require('@nestjs/core');
const { AuthController } = require('../dist/api/auth/auth.controller');
const { AuthService } = require('../dist/api/auth/auth.service');
const { FormsController } = require('../dist/api/forms/forms.controller');
const { FormsService } = require('../dist/api/forms/forms.service');
const { SupabaseService } = require('../dist/supabase.service');
const { AuthGuard } = require('../dist/security/auth.guard');
const { RateLimiterGuard } = require('../dist/security/rate-limiter.guard');
const { AllExceptionsFilter } = require('../dist/security/all-exceptions.filter');
const { CacheControlMiddleware } = require('../dist/security/cache-control.middleware');
const { SecurityHeadersMiddleware } = require('../dist/security/security-headers.middleware');
const { configureApp, isAllowedOrigin } = require('./legacy-controller-harness.cjs');

const sessionId = '11111111-1111-4111-8111-111111111111';
const token = `header.${Buffer.from(JSON.stringify({ session_id: sessionId })).toString('base64url')}.signature`;
let active = true, profileError = null, role = 'citizen', verified = false, deleted = null;
let authCalls = 0;
const client = {
  auth: {
    getUser: async value => ({ data: { user: value === token ? { id: sessionId, email: 'citizen@example.test', app_metadata: { role: 'super_admin' } } : null }, error: null }),
    admin: { signOut: async () => { active = false; return { error: null }; } },
  },
  rpc: async () => ({ data: active, error: null }),
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role, is_verified: verified, deleted_at: deleted }, error: profileError }) }) }) }),
};
const supabase = {
  getClient: () => client,
  createAuthClient: () => ({ auth: {
    signInWithPassword: async ({ password }) => {
      authCalls++;
      return password === 'correct' ? { data: { session: { access_token: token }, user: { id: sessionId } } } : { data: {}, error: {} };
    },
    refreshSession: async ({ refresh_token }) => refresh_token === 'valid' ? { data: { session: { access_token: token } } } : { data: {}, error: {} },
  } }),
};
class DefaultController { read() { return { leaked: true }; } }
Controller('api/default')(DefaultController);
Get()(DefaultController.prototype, 'read', Object.getOwnPropertyDescriptor(DefaultController.prototype, 'read'));
class TestModule {}
Module({
  controllers: [AuthController, FormsController, DefaultController],
  providers: [AuthService, { provide: SupabaseService, useValue: supabase },
    { provide: FormsService, useValue: {
      getAllRequests: () => [],
      getRequestStatus: () => ({ ticketId: 'T-1', status: 'Submitted', fullName: 'Secret', email: 'private@example.test', attachments: ['private.pdf'], history: [{ status: 'Submitted', remarks: 'PII', createdAt: 'today' }] }),
    } },
    { provide: APP_GUARD, useClass: RateLimiterGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})(TestModule);
let app, base;
before(async () => {
  process.env.NODE_ENV = 'production';
  process.env.ALLOWED_ORIGINS = 'https://talibon.gov.ph';
  app = await NestFactory.create(TestModule, { logger: false, bodyParser: false });
  configureApp(app);
  app.use(new CacheControlMiddleware().use.bind(new CacheControlMiddleware()));
  app.use(new SecurityHeadersMiddleware().use.bind(new SecurityHeadersMiddleware()));
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
});
after(async () => { await app?.close(); });
const request = (path, body, auth = false) => fetch(base + path, {
  method: body === undefined ? 'GET' : 'POST',
  headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(auth ? { Authorization: `Bearer ${token}` } : {}) },
  body: body === undefined ? undefined : JSON.stringify(body),
});

test('production CORS uses exact origins, not hostname substrings', () => {
  assert.equal(isAllowedOrigin('https://talibon.gov.ph'), true);
  for (const origin of ['https://localhost.evil.test', 'https://evil-vercel.app', 'http://localhost:5173', 'https://talibon.gov.ph.evil.test']) assert.equal(isAllowedOrigin(origin), false);
});
test('Swagger is reachable and exposes validated request fields', async () => {
  const ui = await request('/api/docs/');
  assert.equal(ui.status, 200);
  assert.match(await ui.text(), /swagger-ui/);
  assert.match(ui.headers.get('content-security-policy'), /script-src 'self'/);
  const res = await request('/api/openapi.json');
  assert.equal(res.status, 200);
  const spec = await res.json();
  assert.ok(spec.paths['/api/auth/login'].post);
  assert.ok(spec.components.schemas.LoginDto.properties.email);
});
test('API defaults to v1 and rejects unsupported versions', async () => {
  const res = await fetch(base + '/api/default', { headers: { 'X-API-Version': '2' } });
  assert.equal(res.status, 404);
  assert.match(res.headers.get('vary'), /X-API-Version/);
  assert.equal((await fetch(base + '/api/default', { headers: { 'X-API-Version': '1' } })).status, 401);
});
test('CORS permits version header only for an allowed origin', async () => {
  for (const [origin, allowed] of [['https://talibon.gov.ph', true], ['https://evil.test', false]]) {
    const res = await fetch(base + '/api/auth/login', { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'X-API-Version,Content-Type' } });
    assert.equal(res.headers.get('access-control-allow-origin'), allowed ? origin : null);
    if (allowed) assert.match(res.headers.get('access-control-allow-headers'), /X-API-Version/);
  }
});
test('unmarked routes require auth, and errors cannot be publicly cached', async () => {
  const res = await request('/api/default');
  assert.equal(res.status, 401);
  assert.match(res.headers.get('cache-control'), /no-store/);
  assert.ok(res.headers.get('x-request-id'));
});
test('DTO validation rejects overposting before calling Auth', async () => {
  const res = await request('/api/auth/login', { email: 'a@example.test', password: 'correct', role: 'admin' });
  assert.equal(res.status, 400);
  assert.equal(authCalls, 0);
});
test('login returns a session, invalid credentials fail, and tokens are never cached', async () => {
  const res = await request('/api/auth/login', { email: 'a@example.test', password: 'correct' });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).data.session.access_token, token);
  assert.match(res.headers.get('cache-control'), /no-store/);
  assert.match(res.headers.get('content-security-policy'), /default-src 'none'/);
  assert.equal((await request('/api/auth/login', { email: 'a@example.test', password: 'wrong' })).status, 401);
});
test('refresh accepts a valid token and rejects an expired one', async () => {
  assert.equal((await request('/api/auth/refresh', { refresh_token: 'valid' })).status, 200);
  assert.equal((await request('/api/auth/refresh', { refresh_token: 'expired' })).status, 401);
});
test('profile roles override stale claims and require verification', async () => {
  assert.equal((await request('/api/forms/certificate', undefined, true)).status, 403);
  role = 'admin';
  assert.equal((await request('/api/forms/certificate', undefined, true)).status, 403);
  verified = true;
  assert.equal((await request('/api/forms/certificate', undefined, true)).status, 200);
  deleted = '2026-01-01';
  assert.equal((await request('/api/forms/certificate', undefined, true)).status, 403);
  deleted = null;
  profileError = { message: 'private database failure' };
  const res = await request('/api/forms/certificate', undefined, true);
  assert.equal(res.status, 503);
  assert.doesNotMatch(await res.text(), /private database/);
  profileError = null;
});
test('tracking requires authentication and exposes no applicant data anonymously', async () => {
  const res = await request('/api/forms/certificate/T-1');
  assert.equal(res.status, 401);
  assert.doesNotMatch(await res.text(), /Secret|private|PII|remarks/);
});
test('logout invalidates an otherwise verified access token at the API', async () => {
  assert.equal((await request('/api/auth/me', undefined, true)).status, 200);
  assert.equal((await request('/api/auth/logout', {}, true)).status, 200);
  assert.equal((await request('/api/auth/me', undefined, true)).status, 401);
});
test('authentication rate limit returns 429 and Retry-After', async () => {
  let res;
  for (let i = 0; i < 12; i++) res = await request('/api/auth/login', { email: 'a@example.test', password: 'wrong' });
  assert.equal(res.status, 429);
  assert.ok(Number(res.headers.get('retry-after')) > 0);
});

