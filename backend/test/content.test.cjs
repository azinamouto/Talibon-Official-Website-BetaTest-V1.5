const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
require('reflect-metadata');
const { Module } = require('@nestjs/common');
const { NestFactory, APP_GUARD, APP_FILTER } = require('@nestjs/core');
const { ContentService } = require('../dist/api/content/content.service');
const { PageContentController } = require('../dist/api/content/pages.controller');
const { NewsContentController } = require('../dist/api/content/news.controller');
const { ServiceContentController } = require('../dist/api/content/services.controller');
const { NewsController } = require('../dist/api/news/news.controller');
const { NewsService } = require('../dist/api/news/news.service');
const { SupabaseService } = require('../dist/supabase.service');
const { AuthGuard } = require('../dist/security/auth.guard');
const { AllExceptionsFilter } = require('../dist/security/all-exceptions.filter');
const { CacheControlMiddleware } = require('../dist/security/cache-control.middleware');
const { configureApp } = require('./legacy-controller-harness.cjs');

// In-memory persistence double; real RLS and schema are exercised by content-security.sql.
const tables = { pages: [], news: [], services_cms: [] };
let role = 'editor', verified = true, databaseError = null;
const sessionId = randomUUID();
const token = `header.${Buffer.from(JSON.stringify({ session_id: sessionId })).toString('base64url')}.signature`;
function query(table) {
  let filters = [], operation, payload, bounds, single = false;
  const builder = {
    select: () => builder, order: () => builder,
    eq: (key, value) => { filters.push(row => row[key] === value); return builder; },
    is: (key, value) => { filters.push(row => (row[key] ?? null) === value); return builder; },
    ilike: (key, value) => { filters.push(row => row[key].toLowerCase().includes(value.slice(1, -1).toLowerCase())); return builder; },
    range: (start, end) => { bounds = [start, end]; return builder; },
    insert: body => { operation = 'insert'; payload = body; return builder; },
    update: body => { operation = 'update'; payload = body; return builder; },
    single: () => { single = true; return builder; },
    maybeSingle: () => { single = true; return builder; },
    returns: () => builder,
    then: (resolve, reject) => Promise.resolve().then(() => {
      if (table === 'profiles') return { data: { role, is_verified: verified }, error: null };
      if (databaseError) return { data: null, error: databaseError };
      if (operation === 'insert') {
        if (tables[table].some(row => row.slug === payload.slug)) return { data: null, error: { code: '23505' } };
        const row = { id: randomUUID(), category: 'ARTICLE', ...payload };
        tables[table].push(row);
        return { data: row, error: null };
      }
      let rows = tables[table].filter(row => filters.every(filter => filter(row)));
      if (operation === 'update') rows.forEach(row => Object.assign(row, payload));
      const count = rows.length;
      if (bounds) rows = rows.slice(bounds[0], bounds[1] + 1);
      return { data: single ? rows[0] ?? null : rows, count, error: null };
    }).then(resolve, reject),
  };
  return builder;
}
const client = { from: query, rpc: async () => ({ data: true }), auth: { getUser: async value => ({ data: { user: value === token ? { id: sessionId } : null } }) } };
class TestModule {}
Module({ controllers: [NewsController, PageContentController, NewsContentController, ServiceContentController], providers: [ContentService, NewsService,
  { provide: SupabaseService, useValue: { getClient: () => client } },
  { provide: APP_GUARD, useClass: AuthGuard }, { provide: APP_FILTER, useClass: AllExceptionsFilter },
] })(TestModule);
let app, base;
before(async () => {
  app = await NestFactory.create(TestModule, { logger: false, bodyParser: false });
  configureApp(app);
  app.use(new CacheControlMiddleware().use);
  await app.listen(0, '127.0.0.1'); base = await app.getUrl();
});
after(async () => app?.close());
function request(path, method = 'GET', body, auth = false) {
  return fetch(base + '/api/' + path, { method, headers: { ...(auth ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
}
const bodies = {
  pages: { title: 'Municipal profile', slug: 'municipal-profile', content: 'Details' },
  news: { title: 'Latest update', slug: 'latest-update', content: 'Details', summary: 'Summary', category: 'UPDATE' },
  services: { name: 'Business permit', slug: 'business-permit', description: 'Details', office_responsible: 'mayor' },
};
for (const kind of Object.keys(bodies)) {
  test(`${kind}: CRUD, publication, pagination, role protection and soft deletion through HTTP`, async () => {
    role = 'editor'; verified = true;
    const body = bodies[kind];
    for (const method of ['POST', 'PATCH', 'DELETE']) {
      const path = kind + (method === 'POST' ? '' : '/' + randomUUID());
      assert.equal((await request(path, method, method === 'DELETE' ? undefined : body)).status, 401);
      for (const denied of ['citizen', 'guest', 'staff', 'barangay_admin', 'department_admin']) {
        role = denied;
        assert.equal((await request(path, method, method === 'DELETE' ? undefined : body, true)).status, 403);
      }
    }
    role = 'editor'; verified = false;
    assert.equal((await request(kind, 'POST', body, true)).status, 403);
    verified = true;
    for (const invalid of [{ ...body, title: null }, { ...body, slug: '../bad' }, { ...body, role: 'admin' }]) {
      assert.equal((await request(kind, 'POST', invalid, true)).status, 400);
    }
    const created = await request(kind, 'POST', body, true);
    assert.equal(created.status, 201);
    assert.match(created.headers.get('cache-control'), /no-store/);
    const { data } = await created.json();
    const path = `${kind}/${data.id}`;
    assert.equal((await request(path)).status, 404);
    assert.equal((await request(kind, 'POST', body, true)).status, 409);
    assert.equal((await request(`${kind}/manage`)).status, 401);
    const preview = await request(`${kind}/manage/${data.id}`, 'GET', undefined, true);
    assert.equal(preview.status, 200);
    assert.match(preview.headers.get('cache-control'), /no-store/);
    for (const allowed of ['super_admin', 'admin', 'municipal_admin', 'editor']) {
      role = allowed;
      assert.equal((await request(`${kind}/manage`, 'GET', undefined, true)).status, 200);
    }
    for (const invalid of [{}, { status: null }, { slug: null }, { content: 'x', deleted_at: 'today' }]) {
      assert.equal((await request(path, 'PATCH', invalid, true)).status, 400);
    }
    assert.equal((await request(path, 'PATCH', { status: kind === 'services' ? 'available' : 'published' }, true)).status, 200);
    const visible = await request(path);
    assert.equal(visible.status, 200);
    assert.match(visible.headers.get('cache-control'), /public, max-age=60/);
    assert.match(visible.headers.get('vary'), /X-API-Version/);
    const filter = kind === 'news' ? '&category=UPDATE' : kind === 'services' ? '&office_responsible=mayor' : '';
    const list = await request(`${kind}?page=1&limit=1&slug=${body.slug}${filter}`);
    assert.equal(list.status, 200);
    assert.deepEqual((await list.json()).pagination, { page: 1, limit: 1, total: 1, totalPages: 1 });
    assert.equal((await (await request(`${kind}?page=2&limit=1`)).json()).data.length, 0);
    for (const query of ['page=0', 'limit=101', 'page=1.5', 'status=draft', 'page=abc', 'page=1&page=2']) {
      const response = await request(`${kind}?${query}`);
      assert.equal(response.status, 400, query);
      assert.match(response.headers.get('cache-control'), /no-store/);
    }
    assert.equal((await request(`${kind}/not-a-uuid`)).status, 400);
    assert.equal((await request(`${kind}/${randomUUID()}`, 'PATCH', { slug: 'missing' }, true)).status, 404);
    if (kind === 'news') {
      const updates = await request('news/updates');
      assert.equal(updates.status, 200);
      assert.equal((await updates.json())[0].id, data.id);
    }
    const removed = await request(path, 'DELETE', undefined, true);
    assert.equal(removed.status, 204); assert.equal(await removed.text(), '');
    assert.equal((await request(path)).status, 404);
    assert.equal((await request(`${kind}/manage/${data.id}`, 'GET', undefined, true)).status, 404);
    assert.equal((await request(path, 'DELETE', undefined, true)).status, 404);
  });
}
test('storage failures are sanitized and not cached', async () => {
  databaseError = { code: 'XX000', message: 'secret database details' };
  try {
    const response = await request('pages');
    assert.equal(response.status, 500);
    assert.match(response.headers.get('cache-control'), /no-store/);
    assert.doesNotMatch(await response.text(), /secret database/);
  } finally { databaseError = null; }
});
test('published OpenAPI includes CRUD contracts, examples, pagination and bearer security', async () => {
  const response = await request('openapi.json');
  const spec = await response.json();
  for (const kind of Object.keys(bodies)) {
    const collection = spec.paths[`/api/${kind}`];
    assert.ok(collection.post.security[0].bearer);
    assert.ok(collection.get.responses['200'].content['application/json'].schema.example.pagination);
    assert.ok(collection.get.parameters.some(parameter => parameter.name === 'limit'));
    assert.ok(spec.paths[`/api/${kind}/{id}`].patch.requestBody);
    assert.ok(spec.paths[`/api/${kind}/{id}`].delete.responses['410']);
  }
  assert.ok(spec.components.schemas.CreateNewsDto.properties.summary);
});
