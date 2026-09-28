const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { Module } = require('@nestjs/common');
const { NestFactory, APP_GUARD, APP_FILTER } = require('@nestjs/core');
const { HealthController } = require('../dist/api/health/health.controller');
const { SupabaseService } = require('../dist/supabase.service');
const { AuthGuard } = require('../dist/security/auth.guard');
const { RateLimiterGuard } = require('../dist/security/rate-limiter.guard');
const { AllExceptionsFilter } = require('../dist/security/all-exceptions.filter');
const { CacheControlMiddleware } = require('../dist/security/cache-control.middleware');
const { configureApp } = require('../dist/configure-app');
let failure = false, calls = 0, app, base;
class TestModule {}
Module({
  controllers: [HealthController],
  providers: [
    { provide: SupabaseService, useValue: { getClient: () => ({ from: table => {
      assert.equal(table, 'roles');
      calls++;
      return { select: () => ({ limit: () => ({ abortSignal: signal => {
        assert.ok(signal instanceof AbortSignal);
        if (failure === 'throw') throw new Error('private-provider-marker');
        if (failure === 'timeout') return new Promise((resolve, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason), { once: true });
        });
        return Promise.resolve({ error: failure ? { message: 'private-provider-marker' } : null });
      } }) }) };
    } }) } },
    { provide: APP_GUARD, useClass: RateLimiterGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})(TestModule);
before(async () => {
  app = await NestFactory.create(TestModule, { logger: false, bodyParser: false });
  configureApp(app);
  app.use(new CacheControlMiddleware().use);
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
});
after(async () => app?.close());
test('public liveness does not access the database and cannot be cached', async () => {
  const response = await fetch(base + '/api/health');
  assert.equal(response.status, 200);
  assert.match(response.headers.get('cache-control'), /no-store/);
  assert.deepEqual(await response.json(), { status: 'ok' });
  assert.equal(calls, 0);
});
test('readiness probes the database and hides provider failures, including timeouts', async () => {
  const response = await fetch(base + '/api/health/ready');
  assert.equal(response.status, 200);
  assert.match(response.headers.get('cache-control'), /no-store/);
  assert.deepEqual(await response.json(), { status: 'ok', checks: { database: 'ok' } });
  for (failure of [true, 'throw', 'timeout']) {
    const failed = await fetch(base + '/api/health/ready');
    assert.equal(failed.status, 503);
    assert.match(failed.headers.get('cache-control'), /no-store/);
    assert.doesNotMatch(await failed.text(), /private-provider-marker/);
  }
});
