require('reflect-metadata');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'synthetic-service-key-for-tests';
process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_only';
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/app.module');
const { configureApp } = require('../dist/configure-app');
const { SupabaseService } = require('../dist/supabase.service');
const { FormsService } = require('../dist/api/forms/forms.service');
const { PaymentsService } = require('../dist/api/payments/payments.service');
const { EmailNotificationService } = require('../dist/api/notifications/email-notification.service');
const { DEFERRED_MESSAGE } = require('../dist/security/deferred-routes.middleware');
let app, base, calls = 0;
const originalClient = SupabaseService.prototype.getClient;
const originalAuth = SupabaseService.prototype.createAuthClient;
function forbidden() { calls++; throw new Error('Unexpected provider/database access'); }
before(async () => {
  SupabaseService.prototype.getClient = forbidden;
  SupabaseService.prototype.createAuthClient = forbidden;
  app = await NestFactory.create(AppModule, { logger: false, bodyParser: false, abortOnError: false });
  configureApp(app);
  await app.listen(0, '127.0.0.1'); base = await app.getUrl();
});
after(async () => { await app?.close(); SupabaseService.prototype.getClient = originalClient; SupabaseService.prototype.createAuthClient = originalAuth; });
const paths = [
  '/api/forms', '/api/forms/certificate', '/api/forms/submissions',
  '/api/forms/certificate/TAL-test', '/api/forms/submissions/TAL-test',
  '/api/forms/admin/submissions', '/api/forms/admin/submissions/id',
  '/api/forms/certificate/id/status', '/api/forms/admin/submissions/id/status',
  '/api/payments', '/api/payments/create-checkout-session', '/api/payments/submission-checkout',
  '/api/payments/submissions/id', '/api/payments/webhook', '/api/payments/settlement',
  '/api/notifications/process', '/api/notifications/unknown', '/api/auth/signup',
  '/api/admin/reports/submissions', '/api/admin/reports/payments', '/api/chat',
];
for (const path of paths) test(`production AppModule retires all methods: ${path}`, async () => {
  const start = calls;
  for (const method of ['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS']) {
    const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json' },
      ...(['POST','PUT','PATCH'].includes(method) ? { body: '{malformed' } : {}) });
    assert.equal(response.status, 410, `${method} ${path}`);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.match(response.headers.get('content-security-policy'), /default-src 'none'/);
    if (method !== 'HEAD') {
      const body = await response.json();
      assert.deepEqual(Object.keys(body).sort(), ['success','statusCode','error','message','timestamp','requestId'].sort());
      assert.equal(body.message, DEFERRED_MESSAGE); assert.equal(body.success, false);
      assert.equal(body.requestId, response.headers.get('x-request-id'));
    }
  }
  assert.equal(calls, start, 'no auth, audit, database, invoice or queue provider may be invoked');
});
test('production retirement ignores role claims, version headers, enable flags and oversized bodies', async () => {
  const start = calls;
  process.env.SUBMISSION_PAYMENTS_ENABLED = 'true'; process.env.ENABLE_PAYMENTS = 'true';
  for (const role of ['anonymous','citizen','editor','admin','super_admin','municipal_admin','department_admin','barangay_admin','inactive','unknown']) {
    for (const version of ['1','2','invalid']) {
      const token = Buffer.from(JSON.stringify({ role, is_verified: true })).toString('base64url');
      const response = await fetch(base + '/api/forms/submissions?status=Approved', { method: 'POST',
        headers: { Authorization: `Bearer h.${token}.s`, 'X-API-Version': version, 'Content-Type': 'application/json' }, body: 'x'.repeat(1048600) });
      assert.equal(response.status, 410);
    }
  }
  assert.equal(calls,start);
});
test('slash, case and encoded route aliases are closed; ambiguous paths fail closed', async () => {
  const start = calls;
  for (const path of ['/API/FORMS/submissions/', '/api//forms//submissions', '/api/%66orms/submissions', '/api/payments%2fwebhook', '/api/forms/submissions?redirect=/api/health']) {
    assert.equal((await fetch(base + path, { method: 'POST' })).status, 410, path);
  }
  for (const path of ['/api/%2566orms/submissions','/api/forms%5csubmissions','/api/forms/%ZZ']) {
    assert.equal((await fetch(base + path, { method: 'POST' })).status,400,path);
  }
  assert.equal(calls,start);
});
test('public forms metadata and health remain available without workflow services', async () => {
  for (const prefix of ['/api/forms','/api/public-forms']) for (const leaf of ['downloadable','business-permits','building-permits','zoning-clearance']) {
    const response = await fetch(`${base}${prefix}/${leaf}`);
    assert.equal(response.status,200); assert.ok(Array.isArray(await response.json()));
  }
  assert.equal((await fetch(base + '/api/health')).status,200);
  for (const provider of [FormsService, PaymentsService, EmailNotificationService]) assert.throws(() => app.get(provider));
});
test('content mutations close before database access while account authorization still routes', async () => {
  const start = calls;
  for (const path of ['/api/pages','/api/news','/api/services']) for (const method of ['POST','PATCH','DELETE']) {
    assert.equal((await fetch(base + path + (method === 'POST' ? '' : '/id'), { method })).status,410);
  }
  assert.equal(calls,start);
  assert.equal((await fetch(base + '/api/admin/users')).status,401);
  assert.equal((await fetch(base + '/api/admin/reports/user-activity')).status,401);
  assert.equal((await fetch(base + '/api/auth/me')).status,401);
  assert.equal((await fetch(base + '/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:'{}' })).status,400);
});
test('retained public content and search still reach their read services', async () => {
  const { ContentService } = require('../dist/api/content/content.service');
  const { SearchService } = require('../dist/api/search/search.service');
  const content = app.get(ContentService), search = app.get(SearchService);
  const oldList = content.list, oldSearch = search.search;
  const reads = [];
  content.list = async kind => { reads.push(kind); return { data: [], pagination: { page: 1, limit: 10, total: 0 } }; };
  search.search = async () => { reads.push('search'); return { data: [], pagination: { page: 1, limit: 10, total: 0 } }; };
  try {
    for (const path of ['/api/pages', '/api/news', '/api/services', '/api/search?q=permit']) assert.equal((await fetch(base + path)).status,200);
    assert.deepEqual(reads,['pages','news','services','search']);
  } finally { content.list = oldList; search.search = oldSearch; }
});
test('published contract describes retired operations as 410 only', async () => {
  const doc = await (await fetch(base + '/api/openapi.json')).json();
  for (const [path, method] of [['/api/payments/create-checkout-session','post'], ['/api/forms/submissions','post'], ['/api/auth/signup','post'], ['/api/news','post']]) {
    assert.deepEqual(Object.keys(doc.paths[path][method].responses),['410']);
  }
});
test('standalone worker and edge entry point cannot initialize providers', () => {
  const worker = spawnSync(process.execPath, ['dist/api/notifications/email-worker.js','--watch'], { cwd: require('node:path').resolve(__dirname,'..'), timeout:5000, encoding:'utf8' });
  assert.equal(worker.status,1); assert.match(worker.stderr,/not available/); assert.equal(worker.stdout,'');
  const edge = readFileSync(require('node:path').resolve(__dirname,'../../supabase/functions/send-status-email/index.ts'),'utf8');
  let handler;
  new Function('Deno','Response',edge)({ serve: callback => { handler = callback; } }, Response);
  assert.equal(handler().status,410);
  assert.doesNotMatch(edge,/import|fetch\(|createClient|Deno.env/);
});
