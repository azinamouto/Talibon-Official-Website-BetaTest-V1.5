// Loopback-only, database-free process startup and liveness benchmark.
const { performance } = require('node:perf_hooks');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const osKeys = ['SystemRoot','WINDIR','PATH','TEMP','TMP','COMSPEC','PATHEXT','LOCALAPPDATA','APPDATA'];
const benchmarkEnv = Object.fromEntries(osKeys.filter(key => process.env[key]).map(key => [key, process.env[key]]));
const label = process.argv[2] || 'baseline';
if (!/^[a-z0-9-]+$/.test(label)) throw new Error('Invalid evidence label');
const percentile = (values, p) => [...values].sort((a, b) => a - b)[Math.ceil(values.length * p) - 1];
async function worker() {
  for (const key of Object.keys(process.env)) if (!osKeys.includes(key)) delete process.env[key];
  process.env.NODE_ENV = 'test';
  console.log = console.warn = console.error = () => {};
  const started = performance.now();
  const handler = require('../dist/serverless').default;
  const importMs = performance.now() - started;
  const server = require('node:http').createServer((req, res) => {
    Promise.resolve(handler(req, res)).catch(() => { res.writeHead(503); res.end(); });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const first = performance.now();
  let response = await fetch(base + '/api/health');
  await response.text();
  if (response.status !== 200) throw new Error('Local liveness failed');
  const firstRequestMs = performance.now() - first;
  const warm = [];
  for (let i = 0; i < 30; i++) {
    const requestStarted = performance.now();
    response = await fetch(base + '/api/health'); await response.text();
    if (response.status !== 200) throw new Error('Local liveness failed');
    warm.push(performance.now() - requestStarted);
  }
  const loaded = Object.keys(require.cache);
  const result = { importMs, firstRequestMs, initializationAndFirstRequestMs: importMs + firstRequestMs,
    warmP50Ms: percentile(warm, .5), warmP95Ms: percentile(warm, .95), warmSamples: warm.length,
    loadedModules: loaded.length, heavyImports: { sharp: loaded.some(item => item.includes(`${path.sep}sharp${path.sep}`)),
      pdf: loaded.some(item => item.includes(`${path.sep}pdf-lib${path.sep}`)),
      s3: loaded.some(item => item.includes(`${path.sep}@aws-sdk${path.sep}client-s3${path.sep}`)),
      betterAuth: loaded.some(item => item.includes(`${path.sep}better-auth${path.sep}`)) }, heapMiB: process.memoryUsage().heapUsed / 1024 / 1024 };
  await new Promise(resolve => server.close(resolve));
  process.stdout.write(JSON.stringify(result));
}
if (process.argv.includes('--worker')) worker().then(() => process.exit(0), () => { process.stderr.write('Local benchmark failed; details suppressed.'); process.exit(1); });
else {
  const samples = [];
  for (let i = 0; i < 5; i++) {
    const child = spawnSync(process.execPath, ['--no-experimental-require-module', __filename, label, '--worker'], { encoding: 'utf8', timeout: 60000,
      cwd: path.resolve(__dirname, '../..'), env: benchmarkEnv });
    if (child.status !== 0) throw new Error('Local startup benchmark failed; inspect prerequisites.');
    samples.push(JSON.parse(child.stdout));
  }
  const output = path.resolve(__dirname, '../../docs/r2/evidence/performance', `${label}-startup.json`);
  const report = { label, measuredAt: new Date().toISOString(), scope: 'local fresh Node process, require(ESM) disabled; no database; warm liveness only; not hosted API latency',
    environment: { node: process.version, platform: process.platform, cpus: os.cpus().length, cpu: os.cpus()[0]?.model }, samples,
    medianInitializationMs: percentile(samples.map(sample => sample.initializationAndFirstRequestMs), .5),
    medianLoadedModules: percentile(samples.map(sample => sample.loadedModules), .5) };
  fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ output, medianInitializationMs: report.medianInitializationMs, medianLoadedModules: report.medianLoadedModules }));
}
