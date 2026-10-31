require('reflect-metadata');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Module } = require('@nestjs/common');
const { NestFactory, APP_GUARD, APP_FILTER } = require('@nestjs/core');
const { FormsController } = require('../dist/api/forms/forms.controller');
const { FormsService } = require('../dist/api/forms/forms.service');
const { SupabaseService } = require('../dist/supabase.service');
const { AuthGuard } = require('../dist/security/auth.guard');
const { AllExceptionsFilter } = require('../dist/security/all-exceptions.filter');
const { configureApp } = require('../dist/configure-app');
const { NotificationsController } = require('../dist/api/notifications/notifications.controller');
const { EmailNotificationService } = require('../dist/api/notifications/email-notification.service');
const rows = [];
const owner = randomUUID(), stranger = randomUUID();
let userId = owner, role = 'citizen', verified = true, dbError = false;
const token = `header.${Buffer.from(JSON.stringify({ session_id: randomUUID() })).toString('base64url')}.signature`;
function query(table) {
  let filters = [], payload, operation, single = false, range;
  const q = {
    select: () => q, order: () => q,
    eq: (key, value) => { filters.push(row => row[key] === value); return q; },
    is: (key, value) => { filters.push(row => (row[key] ?? null) === value); return q; },
    range: (start, end) => { range = [start, end]; return q; },
    insert: value => { payload = value; operation = 'insert'; return q; },
    update: value => { payload = value; operation = 'update'; return q; },
    single: () => { single = true; return q; }, maybeSingle: () => { single = true; return q; },
    then: (resolve, reject) => Promise.resolve().then(() => {
      if (table === 'profiles') return { data: { role, is_verified: verified }, error: null };
      if (dbError) return { data: null, error: { message: 'PRIVATE database details' } };
      if (operation === 'insert') { const row = { id: randomUUID(), version: 1, submitted_at: new Date().toISOString(), ...payload }; rows.push(row); return { data: row, error: null }; }
      let data = rows.filter(row => filters.every(f => f(row)));
      if (operation === 'update') data.forEach(row => Object.assign(row, payload));
      const count = data.length;
      if (range) data = data.slice(range[0], range[1]+1);
      return { data: single ? data[0] ?? null : data, count, error: null };
    }).then(resolve, reject),
  };
  return q;
}
const client = { from: query, auth: { getUser: async () => ({ data: { user: { id: userId, email: 'citizen@example.test' } } }) }, rpc: async () => ({ data: true }) };
class TestModule {}
Module({ controllers: [FormsController, NotificationsController], providers: [FormsService, { provide: EmailNotificationService, useValue: { processPending: async () => ({ processed: 0, sent: 0, failed: 0 }) } }, { provide: SupabaseService, useValue: { getClient: () => client } }, { provide: APP_GUARD, useClass: AuthGuard }, { provide: APP_FILTER, useClass: AllExceptionsFilter }] })(TestModule);
let app, base;
before(async () => { app = await NestFactory.create(TestModule, { logger: false, bodyParser: false }); configureApp(app); await app.listen(0, '127.0.0.1'); base = await app.getUrl(); });
after(async () => app?.close());
function request(path, method='GET', body, auth=true) { return fetch(`${base}/api/forms/${path}`, { method, headers: { ...(auth ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); }
const details = {
  'Barangay Clearance': { sitioPurok: 'Purok 1', yearsOfResidency: 5 },
  'Certificate of Indigency': { address: 'Purok 1', monthlyIncome: 1000, familyMembers: 4, reason: 'Medical assistance' },
  'Business Permit': { businessName: 'Sari Sari', businessAddress: 'Purok 1', natureOfBusiness: 'Retail', dtiSecRegNo: 'DTI-123' },
  'Building Permit': { propertyAddress: 'Purok 1', lotNumber: 'Lot 3', taxDeclarationNo: 'TD-1', constructionType: 'Residential', estimatedCost: 500000, floorArea: 60, engineerArchitect: 'Engineer' },
  'Zoning Clearance': { propertyAddress: 'Purok 1', lotNumber: 'Lot 3', taxDeclarationNo: 'TD-1' },
};
const body = (documentType) => ({ documentType, barangay: 'poblacion', fullName: 'Citizen', email: 'citizen@example.test', mobileNumber: '09171234567', purpose: 'Application', details: details[documentType] });
for (const type of Object.keys(details)) {
  test(`${type}: typed HTTP submission validation and persistence`, async () => {
    const dto = body(type);
    assert.equal((await request('submissions','POST',dto,false)).status,401);
    for (const bad of [{ ...dto, details: {} }, { ...dto, details: [] }, { ...dto, details: { ...dto.details, unexpected: true } }, { ...dto, user_id: stranger }, { ...dto, status: 'Approved' }, { ...dto, fullName: '   ' }, { ...dto, mobileNumber: 'bad' }, { ...dto, email: 'other@example.test' }]) {
      const res = await request('submissions','POST',bad); assert.equal(res.status,400,await res.text());
    }
    const res = await request('submissions','POST',dto); assert.equal(res.status,201,await res.clone().text());
    const saved = await res.json(); assert.deepEqual(saved.details,dto.details); assert.equal(saved.status,'Submitted');
    assert.equal(rows.at(-1).user_id,owner); assert.match(saved.ticketId,/^TAL-/);
  });
}
test('ownership applies to UUID and ticket lookup, lists, pagination and legacy tracking', async () => {
  const row = rows[0];
  assert.equal((await request(`certificate/${row.ticket_id}`,'GET',undefined,false)).status,401);
  userId = stranger;
  for (const key of [row.id,row.ticket_id]) assert.equal((await request(`submissions/${key}`)).status,404);
  assert.deepEqual((await (await request('submissions')).json()).data,[]);
  userId = owner;
  assert.equal((await request(`certificate/${row.ticket_id}`)).status,200);
  const result = await (await request('submissions?page=2&limit=2')).json(); assert.equal(result.data.length,2); assert.equal(result.pagination.total,5);
  assert.equal((await request('submissions?limit=101')).status,400);
  assert.equal((await request('submissions?user_id='+stranger)).status,400);
});
test('only verified municipal admins may view and update unrestricted submissions', async () => {
  const path = `certificate/${rows[0].id}/status`, dto={ status:'Processing',version:1,remarks:'Review started' };
  assert.equal((await request(path,'PUT',dto)).status,403);
  role='staff'; verified=true;
  assert.equal((await request(path,'PUT',dto)).status,403);
  assert.equal((await request('admin/submissions')).status,403);
  assert.equal((await request(`admin/submissions/${rows[0].id}`)).status,403);
  role='admin'; verified=false; assert.equal((await request(path,'PUT',dto)).status,403);
  verified=true;
  assert.equal((await request('admin/submissions')).status,200);
  assert.equal((await request(path,'PUT',{ ...dto, status:'Anything' })).status,400);
  assert.equal((await request(path,'PUT',{ status:'Processing' })).status,400);
  assert.equal((await request(path,'PUT',dto)).status,200);
  assert.equal((await request(path,'PUT',dto)).status,409);
  assert.equal(rows[0].status_actor_id,owner);
  role='citizen';
});
test('storage failures never report success or disclose provider errors', async () => {
  dbError=true;
  const res=await request('submissions','POST',body('Business Permit'));
  assert.equal(res.status,503); assert.doesNotMatch(await res.text(),/PRIVATE/);
  dbError=false;
});
test('OpenAPI exposes form detail schemas and bearer auth', async () => {
  const doc=await (await fetch(base+'/api/openapi.json')).json();
  for(const name of ['BarangayDetailsDto','IndigencyDetailsDto','BusinessDetailsDto','BuildingDetailsDto','ZoningDetailsDto']) assert.ok(doc.components.schemas[name]);
  assert.ok(doc.paths['/api/forms/submissions'].post.security.some(value => value.bearer));
});
test('email queue processing is restricted to verified administrators', async () => {
  const process = auth => fetch(base+'/api/notifications/process', { method:'POST',headers:auth?{Authorization:`Bearer ${token}`}:{}});
  assert.equal((await process(false)).status,401);
  for (const denied of ['citizen','staff']) { role=denied; assert.equal((await process(true)).status,403); }
  role='admin'; verified=false; assert.equal((await process(true)).status,403);
  verified=true; assert.equal((await process(true)).status,201);
  role='citizen';
});
