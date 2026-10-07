const { performance } = require('node:perf_hooks');
const { setTimeout: delay } = require('node:timers/promises');
const { mkdir, writeFile } = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

function positive(value, name, max) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > max) throw Error(`Invalid ${name} (1..${max})`);
  return n;
}
function percentile(sorted, p) { return sorted[Math.ceil(sorted.length * p) - 1] ?? null; }
function summarize(samples, dropped = 0) {
  const times = samples.map(s => s.ms).sort((a, b) => a - b);
  const statuses = {};
  for (const sample of samples) statuses[sample.status] = (statuses[sample.status] || 0) + 1;
  const failures = samples.filter(s => !s.ok).length;
  const p95 = percentile(times, .95);
  const populatedResponses = samples.filter(s => s.hasData).length;
  return { requests: samples.length, failures, dropped, statuses, p50: percentile(times, .5), p95,
    p99: percentile(times, .99), max: times.at(-1) ?? null, populatedResponses,
    pass: samples.length >= 20 && populatedResponses > 0 && failures === 0 && dropped === 0 && p95 < 200 };
}
async function main() {
  if (!process.env.LOAD_BASE_URL) throw Error('LOAD_BASE_URL is required; no mock fallback is available.');
  const base = new URL(process.env.LOAD_BASE_URL);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash || base.pathname !== '/') {
    throw Error('LOAD_BASE_URL must be an HTTP(S) origin without credentials, path, or query');
  }
  const seconds = positive(process.env.LOAD_SECONDS ?? 120, 'LOAD_SECONDS', 300);
  const rate = positive(process.env.LOAD_RATES ?? 1, 'LOAD_RATES', 1);
  const search = (process.env.LOAD_SEARCH_TERM ?? 'permit').trim();
  if (!search || search.length > 100) throw Error('LOAD_SEARCH_TERM must contain 1..100 characters');
  const endpoints = ['/api/pages?limit=20', '/api/news?limit=20', '/api/services?limit=20', `/api/search?q=${encodeURIComponent(search)}&limit=10`];
  const report = { ticket: 'S6-BE-04', startedAt: new Date().toISOString(), mode: 'real-api',
    targetOrigin: base.origin,
    environment: { node: process.version, platform: process.platform, arch: process.arch, cpus: os.cpus().length },
    threshold: { p95MsExclusive: 200, maxFailures: 0, minSamplesPerEndpoint: 20 },
    stages: [], abortReason: null };
    let consecutiveSlow = 0;
    async function request(endpoint) {
      const started = performance.now();
      let sample, status = 'transport-error';
      try {
        const response = await fetch(new URL(endpoint, base), { redirect: 'error', signal: AbortSignal.timeout(5000),
          headers: { 'X-API-Version': '1' } });
        status = response.status;
        const body = await response.json(); // Include complete body transfer and decoding.
        const meta = endpoint.startsWith('/api/search') ? body.meta : body.pagination;
        const ok = status === 200 && Array.isArray(body.data) &&
          body.data.every(row => typeof row.id === 'string') && Number.isInteger(meta?.total) && meta.total >= 0;
        sample = { ms: performance.now() - started, status, ok, hasData: ok && body.data.length > 0 };
      } catch { sample = { ms: performance.now() - started, status, ok: false, hasData: false }; }
      consecutiveSlow = sample.ms >= 2000 ? consecutiveSlow + 1 : 0;
      if (!sample.ok) report.abortReason ??= 'HTTP, transport or response-contract failure';
      if (consecutiveSlow >= 3) report.abortReason ??= 'Three consecutive responses took at least 2000 ms';
      return sample;
    }
    // Separate cold samples from steady-state measurements; failures still fail the run.
    report.cold = [];
    for (const endpoint of endpoints) {
      report.cold.push({ endpoint, ...await request(endpoint) });
      if (report.abortReason) break;
      await delay(1000);
    }
    if (!report.abortReason) {
      const samples = endpoints.map(() => []), dropped = endpoints.map(() => 0), pending = new Set();
      const started = performance.now();
      for (let i = 0; i < rate * seconds; i++) {
        const due = started + i * 1000 / rate;
        await delay(Math.max(0, due - performance.now()));
        if (report.abortReason) break;
        const index = i % endpoints.length;
        if (pending.size >= 2 || performance.now() - due > 1000) { dropped[index]++; continue; }
        const task = request(endpoints[index]).then(sample => samples[index].push(sample));
        pending.add(task);
        task.finally(() => pending.delete(task));
      }
      await Promise.all(pending);
      const elapsedSeconds = (performance.now() - started) / 1000;
      const results = endpoints.map((endpoint, i) => ({ endpoint, ...summarize(samples[i], dropped[i]) }));
      report.stages.push({ offeredRps: rate, durationSeconds: seconds, elapsedSeconds,
        achievedRps: samples.flat().length / elapsedSeconds, results });
      console.log(JSON.stringify({ offeredRps: rate, results }));
    }
    report.pass = !report.abortReason && report.cold.length === endpoints.length && report.cold.every(s => s.ok) &&
      report.stages.length === 1 && report.stages.every(stage => stage.results.every(r => r.pass));
    const output = path.resolve(process.env.LOAD_OUTPUT ?? 'test/load/results/latest.json');
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, JSON.stringify(report, null, 2) + '\n');
    console.log(`Load result: ${report.pass ? 'PASS' : 'FAIL'} (${report.mode}); ${output}`);
    if (!report.pass) process.exitCode = 1;
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { summarize };
