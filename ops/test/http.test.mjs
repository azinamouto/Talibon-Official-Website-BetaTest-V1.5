import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { origin, probe } from '../http.mjs';
import { smoke } from '../smoke.mjs';

test('reject credential-bearing, non-HTTPS remote and path URLs', () => {
  for (const value of ['https://user:secret@example.com', 'http://example.com', 'https://example.com/api', 'https://example.com/?token=x']) {
    assert.throws(() => origin(value));
  }
});

test('smoke rejects SPA fallback, cached health, dependency failures and redirects', async () => {
  let mode = 'ok';
  const server = createServer((req, res) => {
    if (req.url === '/slow') { setTimeout(() => res.end('ok'), 100); return; }
    if (req.url.startsWith('/api/health')) {
      if (mode === 'redirect') { res.writeHead(302, { Location: '/' }); res.end(); return; }
      if (mode === 'spa') { res.end('<html>SPA</html>'); return; }
      res.writeHead(mode === 'down' ? 503 : 200, {
        'Content-Type': 'application/json', 'Cache-Control': mode === 'cached' ? 'public, max-age=60' : 'no-store',
      });
      res.end(JSON.stringify({ status: 'ok', service: 'talibon-api', database: 'reachable' }));
    } else if (req.url === '/api/forms/certificate') { res.writeHead(401); res.end(); }
    else res.end('<html><body>Talibon</body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    assert.equal((await smoke(base)).ok, true);
    for (mode of ['spa', 'cached', 'down', 'redirect']) assert.equal((await smoke(base)).ok, false, mode);
    assert.equal((await probe(base, '/slow', { timeoutMs: 10 })).ok, false);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
