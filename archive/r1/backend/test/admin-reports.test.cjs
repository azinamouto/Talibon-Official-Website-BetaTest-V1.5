require('reflect-metadata');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { Module } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const { ReportsController } = require('../dist/api/admin/reports.controller');
const { ReportsService } = require('../dist/api/admin/reports.service');
const { SupabaseService } = require('../dist/supabase.service');
const { configureApp } = require('../dist/configure-app');
let app, base, providerCalls = 0;
class TestModule {}
Module({ controllers: [ReportsController], providers: [ReportsService, {
  provide: SupabaseService, useValue: { getClient: () => { providerCalls++; throw new Error('Unexpected Supabase access'); } },
}] })(TestModule);
before(async () => {
  app = await NestFactory.create(TestModule, { logger: false, bodyParser: false });
  configureApp(app); await app.listen(0, '127.0.0.1'); base = await app.getUrl();
});
after(async () => app?.close());

test('legacy admin reports, including user activity, return 410 without provider access', async () => {
  for (const kind of ['submissions', 'payments', 'user-activity']) {
    const response = await fetch(`${base}/api/admin/reports/${kind}?limit=2`);
    assert.equal(response.status, 410, kind);
    assert.equal((await response.json()).statusCode, 410);
  }
  assert.equal(providerCalls, 0);
});

test('OpenAPI marks legacy reports as 410-only', async () => {
  const doc = await (await fetch(base + '/api/openapi.json')).json();
  for (const kind of ['submissions', 'payments', 'user-activity']) {
    const operation = doc.paths[`/api/admin/reports/${kind}`].get;
    assert.deepEqual(Object.keys(operation.responses), ['410']);
    assert.equal(operation.deprecated, true);
  }
});
