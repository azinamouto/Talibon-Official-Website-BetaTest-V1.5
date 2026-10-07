const { test } = require('node:test');
const assert = require('node:assert/strict');

test('mock serves OpenAPI examples, filtering, pagination, and explicit unsupported responses', async () => {
  const { createMockServer, contract } = await import('../mocks/server.mjs');
  const server = createMockServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const [path, item] of Object.entries(contract.paths)) {
      if (path.includes('{') || path.includes('/manage')) continue;
      for (const [method, operation] of Object.entries(item)) {
        if (!['get', 'post'].includes(method) || (method !== 'get' && !path.startsWith('/api/auth/'))) continue;
        const status = Object.keys(operation.responses).find(code => /^2\d\d$/.test(code));
        const example = operation.responses[status].content?.['application/json']?.schema?.example;
        assert.notEqual(example, undefined, `${method} ${path} needs an example`);
        const response = await fetch(base + path, { method });
        assert.equal(response.status, Number(status), path);
        assert.deepEqual(await response.json(), example, path);
      }
    }
    const empty = await fetch(base + '/api/pages?slug=missing');
    assert.deepEqual((await empty.json()).data, []);
    const page = await fetch(base + '/api/news?page=2&limit=1');
    assert.deepEqual((await page.json()).pagination, { page: 2, limit: 1, total: 1, totalPages: 1 });
    for (const query of ['limit=0', 'page=1.5', 'unknown=true', 'category=UPDATE']) {
      assert.equal((await fetch(base + '/api/pages?' + query)).status, 400);
    }
    assert.equal((await fetch(base + '/api/pages/missing')).status, 404);
    assert.equal((await fetch(base + '/api/pages', { method: 'POST' })).status, 501);
    assert.equal((await fetch(base + '/api/about/profile', { headers: { 'X-API-Version': '2' } })).status, 404);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
