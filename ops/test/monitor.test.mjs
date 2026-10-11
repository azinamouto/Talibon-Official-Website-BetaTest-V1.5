import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monitor } from '../monitor.mjs';

test('monitor tolerates one cold start, alerts on repeated latency/outage, fails on delivery error', async () => {
  const env = { DEPLOYMENT_URL: 'https://example.com', ALERT_WEBHOOK_URL: 'https://example.com/private-webhook' };
  let calls = [];
  const send = async (url, options) => { calls.push({ url, options }); return { ok: true }; };
  let sample = 0;
  const cold = await monitor(env, async () => ({ ok: true, durationMs: sample++ === 0 ? 4000 : 50 }), send);
  assert.equal(cold.failed, false);
  assert.equal(calls.length, 0);
  const slow = await monitor(env, async () => ({ ok: true, durationMs: 3000 }), send);
  assert.equal(slow.failed, true);
  assert.equal(calls.length, 1);
  assert.match(JSON.parse(calls[0].options.body).text, /latency exceeded 2000ms in 3\/3/);
  calls = [];
  const outage = await monitor(env, async () => ({ ok: false, durationMs: 50 }), send);
  assert.equal(outage.failed, true);
  assert.match(JSON.parse(calls[0].options.body).text, /readiness failed 3\/3/);
  await assert.rejects(monitor(env, async () => ({ ok: false, durationMs: 50 }), async () => ({ ok: false })), /delivery failed/);
  await assert.rejects(monitor({ ...env, MONITOR_LATENCY_MS: 'bad' }), /Invalid latency/);
});
