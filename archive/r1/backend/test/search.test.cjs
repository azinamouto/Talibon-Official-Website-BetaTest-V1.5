require('reflect-metadata');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Module } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const { SearchController } = require('../dist/api/search/search.controller');
const { SearchService } = require('../dist/api/search/search.service');
const { SupabaseService } = require('../dist/supabase.service');
const { configureApp } = require('../dist/configure-app');

let failRpc = false;
let lastRpcArgs = null;

const sampleResults = [
  {
    id: randomUUID(),
    type: 'services',
    title: 'Business Permit Application',
    slug: 'business-permit',
    snippet: 'Requirements and guidelines for municipal business permit application.',
    category: 'BPLO',
    created_at: '2026-09-01T10:00:00Z',
    score: 0.9123,
  },
  {
    id: randomUUID(),
    type: 'news',
    title: 'Business One-Stop Shop Opens',
    slug: 'boss-opens',
    snippet: 'The Business One-Stop Shop (BOSS) is now open at the municipal gymnasium.',
    category: 'ANNOUNCEMENT',
    created_at: '2026-09-05T08:00:00Z',
    score: 0.7456,
  },
];

const mockClient = {
  rpc: async (name, args) => {
    if (name === 'is_api_session_active') return { data: true };
    if (name === 'search_content') {
      lastRpcArgs = args;
      if (failRpc) return { error: { message: 'INTERNAL DATABASE ERROR: connection timed out' } };
      return {
        data: {
          data: sampleResults,
          total: 2,
          facets: {
            byType: { news: 1, services: 1, pages: 0 },
            byCategory: { 'BPLO': 1, 'ANNOUNCEMENT': 1 },
          },
        },
      };
    }
    return { data: null };
  },
};

class TestSearchModule {}
Module({
  controllers: [SearchController],
  providers: [
    SearchService,
    { provide: SupabaseService, useValue: { getClient: () => mockClient } },
  ],
})(TestSearchModule);

let app;
let baseUrl;

before(async () => {
  app = await NestFactory.create(TestSearchModule, { logger: false });
  configureApp(app);
  await app.listen(0, '127.0.0.1');
  baseUrl = await app.getUrl();
});

after(async () => {
  if (app) await app.close();
});

test('public search returns results with relevance score, facets, and pagination', async () => {
  const res = await fetch(`${baseUrl}/api/search?q=business&type=all&limit=10&page=1`);
  assert.equal(res.status, 200);

  const body = await res.json();
  assert.equal(body.data.length, 2);
  assert.equal(body.meta.total, 2);
  assert.equal(body.meta.page, 1);
  assert.equal(body.meta.limit, 10);
  assert.equal(body.meta.totalPages, 1);
  assert.deepEqual(body.facets.byType, { news: 1, services: 1, pages: 0 });
  assert.equal(body.facets.byCategory['BPLO'], 1);

  assert.equal(lastRpcArgs.p_query, 'business');
  assert.equal(lastRpcArgs.p_type, 'all');
  assert.equal(lastRpcArgs.p_limit, 10);
  assert.equal(lastRpcArgs.p_offset, 0);
  assert.equal(lastRpcArgs.p_sort, 'relevance');
});

test('query parameter filtering and pagination offsets are mapped correctly to RPC', async () => {
  const res = await fetch(`${baseUrl}/api/search?q=clearance&type=services&category=Civil+Registry&limit=5&page=3&sort=date`);
  assert.equal(res.status, 200);

  assert.equal(lastRpcArgs.p_query, 'clearance');
  assert.equal(lastRpcArgs.p_type, 'services');
  assert.equal(lastRpcArgs.p_category, 'Civil Registry');
  assert.equal(lastRpcArgs.p_limit, 5);
  assert.equal(lastRpcArgs.p_offset, 10); // (page 3 - 1) * 5
  assert.equal(lastRpcArgs.p_sort, 'date');
});

test('input validation rejects empty queries, oversized lengths, bad limits and unknown fields', async () => {
  // Missing q
  let res = await fetch(`${baseUrl}/api/search`);
  assert.equal(res.status, 400);

  // Empty / whitespace q
  res = await fetch(`${baseUrl}/api/search?q=%20%20`);
  assert.equal(res.status, 400);

  // q > 100 characters
  res = await fetch(`${baseUrl}/api/search?q=${'a'.repeat(101)}`);
  assert.equal(res.status, 400);

  // limit > 50
  res = await fetch(`${baseUrl}/api/search?q=test&limit=51`);
  assert.equal(res.status, 400);

  // limit < 1
  res = await fetch(`${baseUrl}/api/search?q=test&limit=0`);
  assert.equal(res.status, 400);

  // invalid type enum
  res = await fetch(`${baseUrl}/api/search?q=test&type=invalid_type`);
  assert.equal(res.status, 400);

  // invalid sort enum
  res = await fetch(`${baseUrl}/api/search?q=test&sort=random`);
  assert.equal(res.status, 400);

  // unknown/overposted parameter (ValidationPipe whitelist + forbidNonWhitelisted)
  res = await fetch(`${baseUrl}/api/search?q=test&malicious=drop_table`);
  assert.equal(res.status, 400);
});

test('storage failures return 503 and do not disclose internal error details', async () => {
  failRpc = true;
  try {
    const res = await fetch(`${baseUrl}/api/search?q=test`);
    assert.equal(res.status, 503);
    const text = await res.text();
    assert.doesNotMatch(text, /INTERNAL DATABASE ERROR/);
    assert.doesNotMatch(text, /connection timed out/);
  } finally {
    failRpc = false;
  }
});

test('OpenAPI documentation includes /api/search with query parameters and response schemas', async () => {
  const res = await fetch(`${baseUrl}/api/openapi.json`);
  assert.equal(res.status, 200);

  const doc = await res.json();
  const searchPath = doc.paths['/api/search'];
  assert.ok(searchPath, 'OpenAPI must document /api/search');
  assert.ok(searchPath.get, 'OpenAPI must document GET method for /api/search');

  const getOp = searchPath.get;
  assert.equal(getOp.tags[0], 'Search');

  // Verify parameters
  const paramNames = getOp.parameters.map((p) => p.name);
  assert.ok(paramNames.includes('q'), 'Parameters must include q');
  assert.ok(paramNames.includes('type'), 'Parameters must include type');
  assert.ok(paramNames.includes('page'), 'Parameters must include page');
  assert.ok(paramNames.includes('limit'), 'Parameters must include limit');

  // Verify responses
  assert.ok(getOp.responses['200'], 'Must document 200 response');
  assert.ok(getOp.responses['400'], 'Must document 400 response');
  assert.ok(getOp.responses['503'], 'Must document 503 response');
});

