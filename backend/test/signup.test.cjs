const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { Module } = require('@nestjs/common');
const { NestFactory, APP_GUARD, APP_FILTER } = require('@nestjs/core');
const { AuthController } = require('../dist/api/auth/auth.controller');
const { AuthService } = require('../dist/api/auth/auth.service');
const { SupabaseService } = require('../dist/supabase.service');
const { AuthGuard } = require('../dist/security/auth.guard');
const { RateLimiterGuard } = require('../dist/security/rate-limiter.guard');
const { AllExceptionsFilter } = require('../dist/security/all-exceptions.filter');
const { configureApp } = require('../dist/configure-app');
const { CacheControlMiddleware } = require('../dist/security/cache-control.middleware');

test('signup HTTP contract validates input, preserves confirmation state and limits abuse', async () => {
  let calls = 0;
  const supabase = { createAuthClient: () => ({ auth: { signUp: async () => {
    calls++;
    return { data: { session: null, user: { id: 'new-user' } }, error: null };
  } } }) };
  class TestModule {}
  Module({ controllers: [AuthController], providers: [AuthService,
    { provide: SupabaseService, useValue: supabase },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RateLimiterGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ] })(TestModule);
  const app = await NestFactory.create(TestModule, { logger: false, bodyParser: false });
  configureApp(app);
  app.use(new CacheControlMiddleware().use);
  await app.listen(0, '127.0.0.1');
  try {
    const base = await app.getUrl();
    const body = { email: 'citizen@example.test', password: 'long-enough-password', full_name: 'Citizen' };
    const post = value => fetch(base + '/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) });
    assert.equal((await post({ ...body, role: 'super_admin' })).status, 400);
    assert.equal(calls, 0);
    const res = await post(body);
    assert.equal(res.status, 201);
    assert.match(res.headers.get('cache-control'), /no-store/);
    assert.deepEqual((await res.json()).data, { session: null, user: { id: 'new-user' }, confirmation_required: true });
    let limited;
    for (let i = 0; i < 10; i++) limited = await post(body);
    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get('retry-after')) > 0);
    assert.equal(calls, 9);
  } finally { await app.close(); }
});
