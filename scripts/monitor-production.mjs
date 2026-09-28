import { pathToFileURL } from 'node:url';

function httpsOrigin(value, name) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.origin !== value) throw new Error();
    return url.origin;
  } catch { throw new Error(`${name} must be an HTTPS origin without credentials or a path`); }
}

export async function probeHealth({ apiUrl, maxLatencyMs = 2000, timeoutMs = 10000, fetchImpl = fetch }) {
  const origin = httpsOrigin(apiUrl, 'MONITOR_API_ORIGIN');
  if (!Number.isFinite(maxLatencyMs) || maxLatencyMs <= 0 ||
      !Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('Invalid monitor timing configuration');
  const results = [];
  for (const path of ['/api/health', '/api/health/ready']) {
    const started = performance.now();
    let status = 0, reason = null;
    try {
      const response = await fetchImpl(origin + path, {
        redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(timeoutMs),
        headers: { Accept: 'application/json' },
      });
      status = response.status;
      const body = await response.json();
      if (status !== 200 || body?.status !== 'ok' ||
          (path.endsWith('/ready') && body?.checks?.database !== 'ok')) reason = 'unhealthy';
      else if (!/\bno-store\b/i.test(response.headers.get('cache-control') || '')) reason = 'cacheable-health';
    } catch { reason = 'request-failed'; }
    const durationMs = Math.round(performance.now() - started);
    if (!reason && durationMs > maxLatencyMs) reason = 'latency';
    results.push({ path, status, durationMs, ok: !reason, reason });
  }
  return { event: 'uptime_probe', checkedAt: new Date().toISOString(),
    ok: results.every(result => result.ok), results };
}

export async function sendAlert(webhook, report, fetchImpl = fetch) {
  // Webhook paths/tokens are secrets. Never print them or remote response bodies.
  let url;
  try {
    url = new URL(webhook);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error();
  } catch { throw new Error('MONITOR_ALERT_WEBHOOK must be a configured HTTPS webhook'); }
  try {
    const response = await fetchImpl(url, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Talibon API monitoring check failed. Inspect the monitoring workflow and Vercel runtime logs.', ...report }),
    });
    if (!response.ok) throw new Error();
    await response.body?.cancel();
  } catch { throw new Error('Monitoring alert delivery failed'); }
}

async function main() {
  const smokeOnly = process.argv.includes('--smoke');
  if (!smokeOnly && !process.env.MONITOR_ALERT_WEBHOOK) throw new Error('MONITOR_ALERT_WEBHOOK is required for alerting');
  const report = await probeHealth({ apiUrl: process.env.MONITOR_API_ORIGIN,
    maxLatencyMs: Number(process.env.MONITOR_MAX_LATENCY_MS || 2000) });
  console.log(JSON.stringify(report));
  if (!report.ok) {
    if (!smokeOnly) await sendAlert(process.env.MONITOR_ALERT_WEBHOOK, report);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
