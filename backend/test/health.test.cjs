const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { Module } = require('@nestjs/common');
const { NestFactory, APP_GUARD, APP_FILTER } = require('@nestjs/core');
const { HealthController } = require('../dist/api/health/health.controller');
const { SupabaseService } = require('../dist/supabase.service');
const { AuthGuard } = require('../dist/security/auth.guard');
const { AllExceptionsFilter } = require('../dist/security/all-exceptions.filter');
const { CacheControlMiddleware } = require('../dist/security/cache-control.middleware');
const { configureApp } = require('../dist/configure-app');

test('public health reports dependency failures without caching or leaking secrets', async () => {
  let error = null;
  let calls = 0;
  const query = {
    select: () => query, limit: () => query,
    abortSignal: async signal => { calls++; assert.ok(signal instanceof AbortSignal); return { error }; },
  };
  class TestModule {}
  Module({ controllers: [HealthController], providers: [
    { provide: SupabaseService, useValue: { getClient: () => ({ from: table => { assert.equal(table, 'roles'); return query; } }) } },
    { provide: APP_GUARD, useClass: AuthGuard }, { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ] })(TestModule);
  const app = await NestFactory.create(TestModule, { logger: false, bodyParser: false });
  configureApp(app);
  app.use(new CacheControlMiddleware().use);
  await app.listen(0, '127.0.0.1');
  try {
    const base = await app.getUrl();
    const live = await fetch(base + '/api/health');
    assert.equal(live.status, 200);
    assert.match(live.headers.get('cache-control'), /no-store/);
    assert.equal(calls, 0);
    const ready = await fetch(base + '/api/health/ready');
    assert.equal(ready.status, 200);
    assert.equal((await ready.json()).database, 'reachable');
    error = { message: 'private-credential-marker' };
    const down = await fetch(base + '/api/health/ready');
    assert.equal(down.status, 503);
    assert.match(down.headers.get('cache-control'), /no-store/);
    assert.doesNotMatch(await down.text(), /private-credential-marker/);
  } finally { await app.close(); }
});
