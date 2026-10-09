import http from 'node:http';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { mockSearch } from './search.mjs';

export const contract = JSON.parse(readFileSync(new URL('../../contracts/openapi.json', import.meta.url), 'utf8'));

export function createMockServer() {
  return http.createServer((req, res) => {
    const send = (status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Mock-API': 'contract-examples' });
      res.end(body === undefined ? undefined : JSON.stringify(body));
    };
    const fail = (status, message) => send(status, { success: false, statusCode: status, error: message, message, timestamp: new Date().toISOString(), requestId: 'mock-request' });
    const url = new URL(req.url, 'http://localhost');
    if (req.headers['x-api-version'] && req.headers['x-api-version'] !== '1') return fail(404, 'Unsupported API version');
    if (url.pathname === '/api/openapi.json') return send(200, contract);
    if (url.pathname === '/api/search' && req.method === 'GET') {
      const body = mockSearch(url.searchParams, contract);
      return body ? send(200, body) : fail(400, 'Invalid search query');
    }
    const path = Object.keys(contract.paths).find(path => path === url.pathname)
      ?? Object.keys(contract.paths).find(path => path.includes('{id}') && new RegExp('^' + path.replace('{id}', '[^/]+') + '$').test(url.pathname));
    const operation = contract.paths[path]?.[req.method.toLowerCase()];
    if (!operation) return fail(404, 'No contract operation');
    // This fixture server never models authorization or persists writes.
    if (url.pathname.includes('/manage') || (!url.pathname.startsWith('/api/auth/') && req.method !== 'GET')) return fail(501, 'Content writes and staff reads are not mocked');
    const status = Object.keys(operation.responses).find(code => /^2\d\d$/.test(code));
    const media = operation.responses[status]?.content?.['application/json'];
    const example = media?.example ?? media?.schema?.example;
    if (example === undefined) return fail(501, 'No response example in contract');
    const body = structuredClone(example);
    if (path.includes('{id}') && body.data?.id !== url.pathname.split('/').at(-1)) return fail(404, 'Content not found');
    if (body.pagination) {
      const allowed = new Set(['page', 'limit', 'q', 'slug', 'category', 'office_responsible']);
      if ([...url.searchParams.keys()].some(key => !allowed.has(key))) return fail(400, 'Unknown query parameter');
      const page = Number(url.searchParams.get('page') ?? 1);
      const limit = Number(url.searchParams.get('limit') ?? 20);
      if (!Number.isInteger(page) || page < 1 || page > 10000 || !Number.isInteger(limit) || limit < 1 || limit > 100) return fail(400, 'Invalid pagination');
      if (url.searchParams.has('category') && path !== '/api/news') return fail(400, 'category is only supported for news');
      if (url.searchParams.has('office_responsible') && path !== '/api/services') return fail(400, 'office_responsible is only supported for services');
      let rows = body.data.filter(row => ['slug', 'category', 'office_responsible'].every(key => !url.searchParams.has(key) || row[key] === url.searchParams.get(key)));
      if (url.searchParams.has('q')) rows = rows.filter(row => (row.title ?? row.name).toLowerCase().includes(url.searchParams.get('q').toLowerCase()));
      body.data = rows.slice((page - 1) * limit, page * limit);
      body.pagination = { page, limit, total: rows.length, totalPages: Math.ceil(rows.length / limit) };
    }
    send(Number(status), body);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createMockServer().listen(4010, '127.0.0.1', () => console.log('Contract example API: http://127.0.0.1:4010'));
}
