const { test } = require('node:test');
const assert = require('node:assert/strict');

test('search mock validates the contract and applies filters, facets and pagination', async () => {
  const { createMockServer, contract } = await import('../mocks/server.mjs');
  assert.ok(contract.paths['/api/search'].get);
  const server = createMockServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/search`;
  const search = async query => (await fetch(`${base}?${query}`)).json();
  try {
    const all = await search('q=municipal');
    assert.equal(all.meta.total, 3);
    assert.deepEqual(all.facets.byType, { news: 1, services: 1, pages: 1 });
    assert.deepEqual(all.facets.byCategory, { UPDATE: 1, mayor: 1, Page: 1 });
    for (const type of ['news', 'services', 'pages']) {
      const result = await search(`q=municipal&type=${type}`);
      assert.equal(result.data.length, 1);
      assert.equal(result.data[0].type, type);
      assert.deepEqual(result.facets, all.facets);
    }
    const category = await search('q=municipal&category=mayor');
    assert.equal(category.data[0].type, 'services');
    assert.deepEqual((await search('q=municipal&type=news&category=mayor')).data, []);
    const first = await search('q=municipal&limit=1');
    const second = await search('q=municipal&limit=1&page=2');
    assert.equal(first.meta.totalPages, 3);
    assert.notEqual(first.data[0].type, second.data[0].type);
    const beyond = await search('q=municipal&page=9');
    assert.deepEqual(beyond.data, []);
    assert.equal(beyond.meta.total, 3);
    assert.equal((await search('q=not-a-match')).meta.totalPages, 0);
    for (const query of ['', 'q=', 'q=%20', `q=${'a'.repeat(101)}`, 'q=test&type=bad', 'q=test&sort=bad', 'q=test&page=0', 'q=test&page=1.5', 'q=test&limit=51', 'q=test&limit=', 'q=test&unknown=x', 'q=a&q=b', `q=test&category=${'a'.repeat(101)}`]) {
      assert.equal((await fetch(`${base}?${query}`)).status, 400, query);
    }
    const example = contract.paths['/api/search'].get.responses['200'].content['application/json'].schema.example;
    const response = await search('q=details&type=services');
    assert.deepEqual(response, example);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('fixture ranking, date sorting, phrases and exclusions are deterministic', async () => {
  const { mockSearch } = await import('../mocks/search.mjs');
  const { contract } = await import('../mocks/server.mjs');
  const fixtures = structuredClone(contract);
  fixtures.paths['/api/news'].get.responses['200'].content['application/json'].schema.example.data[0].created_at = '2026-10-01T00:00:00.000Z';
  fixtures.paths['/api/services'].get.responses['200'].content['application/json'].schema.example.data[0].name = 'Municipal service details';
  const run = query => mockSearch(new URLSearchParams(query), fixtures);
  assert.equal(run('q=details OR municipal&sort=relevance').data[0].type, 'services');
  assert.equal(run('q=details OR municipal&sort=date').data[0].type, 'news');
  assert.equal(run('q="Service details"').data[0].type, 'services');
  assert.equal(run('q=municipal -update').data.some(item => item.type === 'news'), false);
});
