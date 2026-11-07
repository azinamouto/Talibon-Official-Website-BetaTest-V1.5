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
const { configureApp, isAllowedOrigin } = require('../dist/configure-app');

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
test('Swagger documents retired legacy auth and cookie-based staff operations', async () => {
  const ui = await request('/api/docs/');
  assert.equal(ui.status, 200);
  assert.match(await ui.text(), /swagger-ui/);
  assert.match(ui.headers.get('content-security-policy'), /script-src 'self'/);
  const res = await request('/api/openapi.json');
  assert.equal(res.status, 200);
  const spec = await res.json();
  assert.deepEqual(Object.keys(spec.paths['/api/auth/login'].post.responses), ['410']);
  assert.ok(spec.paths['/api/staff'].get.security.some(scheme => scheme.staffCookie));
  assert.equal(spec.components.securitySchemes.staffCookie.in, 'cookie');
  assert.equal(spec.components.securitySchemes.staffCookie.name, '__Secure-talgov-staff.session_token');
});
test('API defaults to v1 and rejects unsupported versions', async () => {
  const res = await fetch(base + '/api/default', { headers: { 'X-API-Version': '2' } });
  assert.equal(res.status, 404);
  assert.match(res.headers.get('vary'), /X-API-Version/);
  assert.equal((await fetch(base + '/api/default', { headers: { 'X-API-Version': '1' } })).status, 401);
});
test('CORS permits version header only for an allowed origin', async () => {
  for (const [origin, allowed] of [['https://talibon.gov.ph', true], ['https://evil.test', false]]) {
    const res = await fetch(base + '/api/default', { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'X-API-Version,Content-Type' } });
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
test('legacy login rejects all bodies before calling Supabase Auth', async () => {
  const res = await request('/api/auth/login', { email: 'a@example.test', password: 'correct', role: 'admin' });
  assert.equal(res.status, 410);
  assert.equal(authCalls, 0);
});
test('legacy login, refresh, session and logout endpoints are retired', async () => {
  for (const [route, body, auth] of [
    ['/api/auth/login', { email: 'a@example.test', password: 'correct' }],
    ['/api/auth/refresh', { refresh_token: 'valid' }],
    ['/api/auth/me', undefined, true],
    ['/api/auth/logout', {}, true],
  ]) {
    const res = await request(route, body, auth);
    assert.equal(res.status, 410);
    assert.match(res.headers.get('cache-control'), /no-store/);
  }
  assert.equal(authCalls, 0);
});
test('retired workflow and tracking endpoints do not inspect roles or expose applicant data', async () => {
  for (const verifiedRole of ['citizen', 'admin']) {
    role = verifiedRole; verified = true;
    for (const route of ['/api/forms/certificate', '/api/forms/certificate/T-1']) {
      const res = await request(route, undefined, true);
      assert.equal(res.status, 410);
      assert.doesNotMatch(await res.text(), /Secret|private|PII|remarks/);
    }
  }
  assert.equal(authCalls, 0);
});
test('retired legacy authentication is not rate-limited through the Supabase provider', async () => {
  let response;
  for (let i = 0; i < 12; i++) response = await request('/api/auth/login', { email: 'a@example.test', password: 'wrong' });
  assert.equal(response.status, 410);
  assert.equal(authCalls, 0);
});
