const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { requestTelemetry } = require('../dist/observability/request-telemetry');

test('request telemetry emits one safe event and marks 5xx / aborted requests', () => {
  const logs = [], errors = [];
  const middleware = requestTelemetry({ log: value => logs.push(JSON.parse(value)), error: value => errors.push(JSON.parse(value)) });
  for (const status of [200, 500]) {
    const res = Object.assign(new EventEmitter(), { statusCode: status, writableFinished: true });
    middleware({ method: 'GET', requestId: 'generated-id', route: { path: '/api/items/:id' },
      url: '/api/items/private-marker?token=secret-marker', headers: { authorization: 'secret-marker' } }, res, () => {});
    res.emit('finish'); res.emit('close');
  }
  assert.equal(logs.length, 1); assert.equal(errors.length, 1);
  assert.equal(errors[0].status, 500);
  assert.ok(errors[0].durationMs >= 0);
  assert.doesNotMatch(JSON.stringify({ logs, errors }), /private-marker|secret-marker/);
  const aborted = Object.assign(new EventEmitter(), { statusCode: 200, writableFinished: false });
  middleware({ method: 'GET' }, aborted, () => {});
  aborted.emit('close'); aborted.emit('finish');
  assert.equal(logs[1].status, 499); assert.equal(logs[1].route, 'unmatched');
});

test('monitor rejects outages, cached responses, wrong JSON and slow probes', async () => {
  const { probeHealth } = await import('../../scripts/monitor-production.mjs');
  const healthy = () => new Response(JSON.stringify({ status: 'ok', checks: { database: 'ok' } }),
    { headers: { 'cache-control': 'no-store' } });
  const options = { apiUrl: 'https://monitor.example.test', fetchImpl: async () => healthy() };
  assert.equal((await probeHealth(options)).ok, true);
  for (const fetchImpl of [
    async () => new Response('{}', { status: 503 }),
    async () => new Response('<html>SPA</html>'),
    async () => new Response('{"status":"ok"}'),
    async () => { throw new Error('private-provider-marker'); },
    async () => { await new Promise(resolve => setTimeout(resolve, 20)); return healthy(); },
  ]) {
    const report = await probeHealth({ ...options, fetchImpl, maxLatencyMs: 5 });
    assert.equal(report.ok, false);
    assert.doesNotMatch(JSON.stringify(report), /private-provider-marker/);
  }
  await assert.rejects(probeHealth({ ...options, apiUrl: 'https://user:password@example.test' }));
  await assert.rejects(probeHealth({ ...options, maxLatencyMs: NaN }));
});

test('alert delivery is awaited and fails without exposing the webhook secret', async () => {
  const { sendAlert } = await import('../../scripts/monitor-production.mjs');
  let received;
  await sendAlert('https://alerts.example.test/private-marker', { ok: false }, async (url, options) => {
    received = JSON.parse(options.body);
    assert.equal(options.redirect, 'error');
    return new Response(null, { status: 204 });
  });
  assert.equal(received.ok, false);
  await assert.rejects(sendAlert('https://alerts.example.test/private-marker', {}, async () => {
    throw new Error('private-marker');
  }), { message: 'Monitoring alert delivery failed' });
  await assert.rejects(sendAlert('http://alerts.example.test', {}), /HTTPS/);
});
