// Run from a credential-bearing staging shell. Never prints SQL, values, URLs or error messages.
const { AsyncLocalStorage } = require('node:async_hooks');
const { performance } = require('node:perf_hooks');
const { setTimeout: delay } = require('node:timers/promises');
const { writeFileSync } = require('node:fs');
const { Client, Pool } = require('pg');
const context = new AsyncLocalStorage();
const traces = [];
const endpoints = ['/api/news','/api/services','/api/tourism/festivities'];
const clients = new WeakMap();
let clientSequence = 0;
function clientId(client) {
  if (!clients.has(client)) clients.set(client, ++clientSequence);
  return clients.get(client);
}
const round = n => Math.round(n * 10) / 10;
function safeCode(e) {
  if (/^(?:[0-9A-Z]{5}|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE)$/.test(e?.code || '')) return e.code;
  if (e?.message === 'timeout exceeded when trying to connect') return 'pool-acquire-timeout';
  if (e?.message === 'Connection terminated due to connection timeout') return 'connect-timeout';
  if (e?.message === 'Query read timeout') return 'client-query-timeout';
  if (e?.message === 'Database operation forbidden') return 'runtime-role-denied';
  return 'unclassified';
}
function stage(sql) {
  if (sql.startsWith('BEGIN')) return 'setup';
  if (sql.startsWith('SET LOCAL')) return 'setup';
  if (sql.includes('WITH RECURSIVE inherited')) return 'runtime-role-check';
  if (/^(COMMIT|ROLLBACK)$/.test(sql)) return sql.toLowerCase();
  if (sql.includes('staff_auth_throttle')) return 'rate-limit';
  if (sql.includes('staff_auth_audit')) return 'audit';
  if (sql.includes('published_content')) return 'public-content';
  return 'other';
}
const originalQuery = Client.prototype.query;
Client.prototype.query = function (...args) {
  // Reproduce the original six sequential setup exchanges for an A/B run.
  // Fixed setup SQL only; application statements/values are never rewritten.
  if (process.argv.includes('--legacy-setup') && typeof args[0] === 'string' &&
      args[0].startsWith('BEGIN') && args[0].includes('; SET LOCAL')) {
    return (async () => {
      let result;
      for (const sql of args[0].split('; ')) result = await this.query(sql);
      return result;
    })();
  }
  const started = performance.now();
  const result = originalQuery.apply(this, args);
  if (!result?.then) return result;
  const record = error => context.getStore()?.push({ client: clientId(this), stage: stage(typeof args[0] === 'string' ? args[0] : ''),
    ms: round(performance.now() - started), ...(error ? { code: safeCode(error) } : {}) });
  return result.then(value => { record(); return value; }, error => { record(error); throw error; });
};
const originalConnect = Pool.prototype.connect;
Pool.prototype.connect = function (...args) {
  const started = performance.now();
  const counts = { total: this.totalCount, idle: this.idleCount, waiting: this.waitingCount };
  const result = originalConnect.apply(this, args);
  if (!result?.then) return result;
  const record = error => context.getStore()?.push({ stage: 'acquire', ms: round(performance.now() - started),
    ...counts, ...(error ? { code: safeCode(error) } : {}) });
  return result.then(value => { record(); return value; }, error => { record(error); throw error; });
};
function summary(samples) {
  const times = samples.map(s => s.ms).sort((a,b) => a-b);
  return { n: samples.length, p50: times[Math.ceil(times.length*.5)-1], p95: times[Math.ceil(times.length*.95)-1],
    statuses: samples.reduce((out,s) => (out[s.status] = (out[s.status] || 0)+1, out), {}) };
}
async function main() {
  // Public GETs write throttle/audit records: pin staging before app bootstrap.
  const config = require('./r2-staging-qualify.cjs').config(process.env.DATABASE_URL);
  require('reflect-metadata');
  const { NestFactory } = require('@nestjs/core');
  const { AppModule } = require('../dist/app.module');
  const { configureApp } = require('../dist/configure-app');
  const runtime = { pooledEndpoint: new URL(process.env.DATABASE_URL).hostname.includes('-pooler.'),
    verifiedTLS: config.ssl?.rejectUnauthorized === true,
    bindingRequired: new URL(process.env.DATABASE_URL).searchParams.get('channel_binding') === 'require',
    max: config.max, connectionTimeoutMillis: config.connectionTimeoutMillis, idleTimeoutMillis: config.idleTimeoutMillis,
    queryTimeoutMillis: config.query_timeout };
  const app = await NestFactory.create(AppModule, { bodyParser: false, logger: false, abortOnError: false });
  app.use((req,res,next) => {
    const entries = [];
    traces.push({ endpoint: endpoints.includes(req.path) ? req.path : 'other', entries });
    context.run(entries, next);
  });
  configureApp(app);
  await app.listen(0, '127.0.0.1');
  const origin = await app.getUrl();
  const samples = [];
  async function request(endpoint, phase) {
    const started = performance.now();
    let status = 'transport-error';
    try {
      const res = await fetch(origin+endpoint, { signal: AbortSignal.timeout(60000) });
      await res.arrayBuffer();
      status = res.status;
    } catch { /* no raw error output */ }
    samples.push({ endpoint, phase, status, ms: round(performance.now()-started) });
  }
  try {
    // Only the first request has process-cold pools; endpoint-first is not Neon-cold.
    for (const endpoint of endpoints) await request(endpoint, 'first-pass');
    for (let i=0;i<5;i++) for (const endpoint of endpoints) await request(endpoint, 'steady');
    for (let i=0;i<2;i++) await Promise.all(endpoints.map(endpoint => request(endpoint, 'concurrent-3')));
    await delay(11000); // Exercise the existing 10-second pool idle eviction.
    for (const endpoint of endpoints) await request(endpoint, 'after-idle');
    const report = { timestamp: new Date().toISOString(), runtime, setup: process.argv.includes('--legacy-setup') ? 'reconstructed-original-sequential' : 'batched', note: 'First-pass means process-cold, not verified Neon compute-cold. Acquire includes connection/auth/role-check time; query timings include network RTT. No automatic retries.',
      summaries: Object.fromEntries(['first-pass','steady','concurrent-3','after-idle'].map(phase => [phase,
        Object.fromEntries(endpoints.map(endpoint => [endpoint,summary(samples.filter(s => s.phase===phase && s.endpoint===endpoint))]))])), samples, traces };
    if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report,null,2));
    console.log(JSON.stringify(report));
    if (samples.some(s => s.status !== 200)) process.exitCode = 1;
  } finally { await app.close(); }
}
main().catch(() => { console.error('Benchmark could not complete; check runtime configuration (details suppressed).'); process.exitCode = 1; });
