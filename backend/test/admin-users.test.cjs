require('reflect-metadata');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { Module } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const { UsersController } = require('../dist/api/admin/users.controller');
const { UsersService } = require('../dist/api/admin/users.service');
const { SupabaseService } = require('../dist/supabase.service');
const { configureApp } = require('../dist/configure-app');
let app, base, providerCalls = 0;
class TestModule {}
Module({ controllers: [UsersController], providers: [UsersService, {
  provide: SupabaseService, useValue: { getClient: () => { providerCalls++; throw new Error('Unexpected Supabase access'); } },
}] })(TestModule);
before(async () => {
  app = await NestFactory.create(TestModule, { logger: false, bodyParser: false });
  configureApp(app); await app.listen(0, '127.0.0.1'); base = await app.getUrl();
});
after(async () => app?.close());

test('legacy user-administration routes return 410 before auth or Supabase access', async () => {
  const paths = ['/api/admin/users', '/api/admin/users/00000000-0000-4000-8000-000000000001',
    '/api/admin/users/00000000-0000-4000-8000-000000000001/role',
    '/api/admin/users/00000000-0000-4000-8000-000000000001/deactivate'];
  for (const path of paths) for (const method of ['GET', 'POST', 'PATCH', 'DELETE']) {
    const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json' },
      ...(method === 'GET' ? {} : { body: '{}' }) });
    assert.equal(response.status, 410, `${method} ${path}`);
  }
  assert.equal(providerCalls, 0);
});

test('OpenAPI marks legacy user administration as 410-only', async () => {
  const doc = await (await fetch(base + '/api/openapi.json')).json();
  for (const [path, method] of [
    ['/api/admin/users', 'get'], ['/api/admin/users/{id}', 'get'], ['/api/admin/users/{id}', 'patch'],
    ['/api/admin/users/{id}/role', 'patch'], ['/api/admin/users/{id}/deactivate', 'post'],
  ]) {
    assert.deepEqual(Object.keys(doc.paths[path][method].responses), ['410']);
    assert.equal(doc.paths[path][method].deprecated, true);
  }
});
