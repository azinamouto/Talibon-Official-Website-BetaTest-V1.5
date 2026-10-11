import { origin, probe } from './http.mjs';
import { pathToFileURL } from 'node:url';

export async function monitor(env, check = probe, send = fetch) {
  const base = origin(env.DEPLOYMENT_URL);
  const limit = Number(env.MONITOR_LATENCY_MS || 2000);
  if (!Number.isFinite(limit) || limit <= 0) throw new Error('Invalid latency limit');
  const results = [];
  for (let sample = 0; sample < 3; sample++) {
    results.push(await check(base, '/api/health/ready', { json: { status: 'ok', database: 'reachable' } }));
  }
  const failures = results.filter(result => !result.ok).length;
  const slow = results.filter(result => result.durationMs > limit).length;
  const failed = failures >= 2 || slow >= 2;
  if (failed) {
    if (!env.ALERT_WEBHOOK_URL) throw new Error('Alert destination missing');
    const webhook = new URL(env.ALERT_WEBHOOK_URL);
    if (webhook.protocol !== 'https:') throw new Error('HTTPS required');
    const response = await send(webhook, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `Talibon production alert: readiness failed ${failures}/3 checks; latency exceeded ${limit}ms in ${slow}/3 checks. Inspect the monitoring workflow and Vercel RequestMetrics logs.` }),
      signal: AbortSignal.timeout(10000), redirect: 'error',
    });
    if (!response.ok) throw new Error('Alert delivery failed');
  }
  return { event: 'uptime_probe', failed, failures, slow, results };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await monitor(process.env);
    console.log(JSON.stringify(result));
    if (result.failed) process.exitCode = 1;
  } catch {
    console.error('Monitoring failed. Check configuration, probe results and alert delivery; secret values are suppressed.');
    process.exitCode = 1;
  }
}
