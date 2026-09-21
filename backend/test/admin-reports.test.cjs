require('reflect-metadata');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Module } = require('@nestjs/common');
const { NestFactory, APP_GUARD } = require('@nestjs/core');
const { ReportsController } = require('../dist/api/admin/reports.controller');
const { ReportsService } = require('../dist/api/admin/reports.service');
const { SupabaseService } = require('../dist/supabase.service');
const { AuthGuard } = require('../dist/security/auth.guard');
const { configureApp } = require('../dist/configure-app');
let role = 'admin', verified = true, fail = false, calls = 0;
const id = randomUUID();
const token = `h.${Buffer.from(JSON.stringify({ session_id: id })).toString('base64url')}.s`;
const rows = [0,1,2].map(() => ({ id: randomUUID(), created_at: '2026-09-01T12:00:00.123456+00:00' }));
const client = {
  auth: { getUser: async () => ({ data: { user: { id } } }) },
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role, is_verified: verified } }) }) }) }),
  rpc: async (name, args) => {
    if (name === 'is_api_session_active') return { data: true };
    calls++; assert.equal(name,'admin_report'); assert.equal(args.p_limit,2);
    return fail ? { error: { message: 'PRIVATE DB' } } : { data: args.p_before ? [rows[2]] : rows };
  },
};
class TestModule {}
Module({ controllers: [ReportsController], providers: [ReportsService, { provide: SupabaseService, useValue: { getClient: () => client } }, { provide: APP_GUARD, useClass: AuthGuard }] })(TestModule);
let app, base;
before(async () => { app = await NestFactory.create(TestModule, { logger: false }); configureApp(app); await app.listen(0,'127.0.0.1'); base = await app.getUrl(); });
after(async () => app?.close());
const range = 'from=2026-09-01T00:00:00Z&to=2026-10-01T00:00:00Z&limit=2';
const request = (kind, query=range, auth=true) => fetch(`${base}/api/admin/reports/${kind}?${query}`, { headers: auth ? { Authorization: `Bearer ${token}` } : {} });
test('every report rejects anonymous, non-admin and unverified callers before data access', async () => {
  for (const kind of ['submissions','payments','user-activity']) {
    assert.equal((await request(kind,range,false)).status,401);
    for (role of ['guest','citizen','staff','editor','department_admin','barangay_admin']) assert.equal((await request(kind)).status,403);
    role='admin'; verified=false; assert.equal((await request(kind)).status,403); verified=true;
  }
  assert.equal(calls,0);
});
test('all admin roles receive bounded pages with exact timestamp cursors', async () => {
  for (role of ['admin','municipal_admin','super_admin']) for (const kind of ['submissions','payments','user-activity']) {
    const res = await request(kind); assert.equal(res.status,200);
    const page = await res.json(); assert.equal(page.data.length,2);
    assert.equal(page.nextCursor.before,rows[1].created_at);
    const next = await (await request(kind,`${range}&${new URLSearchParams(page.nextCursor)}`)).json();
    assert.deepEqual(next.data,[rows[2]]); assert.equal(next.nextCursor,null);
  }
});
test('invalid dates, unbounded limits, incomplete cursors and unknown fields fail validation', async () => {
  for (const query of ['', range+'&unexpected=x', range.replace('limit=2','limit=501'), range.replace('2026-10-01','2026-08-01'), range.replace('2026-10-01','2028-10-01'), range+'&beforeId='+id, range.replace('2026-09-01T00:00:00Z','2026-02-30T00:00:00Z')]) {
    assert.equal((await request('payments',query)).status,400,query);
  }
  fail=true; const res=await request('payments'); assert.equal(res.status,503); assert.doesNotMatch(await res.text(),/PRIVATE/); fail=false;
});
test('OpenAPI documents authenticated reports and query validation', async () => {
  const doc=await (await fetch(base+'/api/openapi.json')).json();
  for (const kind of ['submissions','payments','user-activity']) {
    const op=doc.paths[`/api/admin/reports/${kind}`].get;
    assert.ok(op.security.some(s => s.bearer)); assert.ok(op.responses['403']);
    assert.ok(op.parameters.some(p => p.name==='from' && p.required));
  }
});
