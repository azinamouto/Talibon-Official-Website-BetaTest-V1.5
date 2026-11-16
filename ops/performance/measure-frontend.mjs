import http from 'node:http';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { createMockServer } from '../../frontend/mocks/server.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(root, 'frontend/dist');
const require = createRequire(path.join(root, 'frontend/package.json'));
const { chromium } = require('playwright');
const label = process.argv[2] || 'baseline';
if (!/^[a-z0-9-]+$/.test(label)) throw new Error('Use a simple evidence label.');
const manifest = JSON.parse(await readFile(path.join(dist, '.vite/manifest.json'), 'utf8'));
const entry = Object.values(manifest).find(item => item.isEntry);
const initial = new Set();
function visit(key) {
  const item = manifest[key];
  if (!item || initial.has(item.file)) return;
  initial.add(item.file);
  for (const dependency of item.imports || []) visit(dependency);
}
visit(Object.keys(manifest).find(key => manifest[key] === entry));
const javascript = [];
for (const item of Object.values(manifest)) {
  if (!item.file.endsWith('.js') || javascript.some(file => file.file === item.file)) continue;
  const bytes = await readFile(path.join(dist, item.file));
  javascript.push({ file: item.file, initial: initial.has(item.file), rawBytes: bytes.length,
    gzipBytes: gzipSync(bytes).length, brotliBytes: brotliCompressSync(bytes).length });
}
const sum = (files, key) => files.reduce((total, file) => total + file[key], 0);
const mock = createMockServer().listeners('request')[0];
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const server = http.createServer(async (req, res) => {
  if (req.url === '/api/about/profile' && req.method === 'GET') {
    // The contract's empty profile example cannot measure a populated profile.
    // This fixed, explicitly synthetic fixture is identical before and after.
    const profile = { title: 'Synthetic public profile', content: 'Synthetic municipal profile for local performance verification.\n\n'.repeat(8) };
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(profile));
    return;
  }
  if (req.url.startsWith('/api/')) return mock(req, res);
  try {
    let filename = path.resolve(dist, '.' + decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname));
    if (!filename.startsWith(dist + path.sep) && filename !== dist) throw new Error('Path');
    if (!path.extname(filename) || filename === dist) filename = path.join(dist, 'index.html');
    if (!(await stat(filename)).isFile()) throw new Error('File');
    let bytes = await readFile(filename);
    const type = mime[path.extname(filename)] || 'application/octet-stream';
    res.setHeader('Content-Type', type);
    res.setHeader('Cache-Control', 'no-store');
    if (/text|javascript|json|svg/.test(type)) { bytes = gzipSync(bytes); res.setHeader('Content-Encoding', 'gzip'); }
    res.setHeader('Content-Length', bytes.length);
    res.end(bytes);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const report = { label, measuredAt: new Date().toISOString(), scope: 'local production build; contract API fixtures plus fixed synthetic profile; external requests blocked; not hosted or field Core Web Vitals',
  environment: { node: process.version, platform: process.platform, cpus: os.cpus().length, cpu: os.cpus()[0]?.model,
    head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim() },
  bundle: { initialRawBytes: sum(javascript.filter(file => file.initial), 'rawBytes'),
    initialGzipBytes: sum(javascript.filter(file => file.initial), 'gzipBytes'),
    totalRawBytes: sum(javascript, 'rawBytes'), totalGzipBytes: sum(javascript, 'gzipBytes'), javascript }, runs: [] };
let browser;
try {
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true });
  report.environment.browser = browser.version();
  for (const profile of ['mobile', 'desktop']) {
    const repetitions = profile === 'mobile' ? 3 : 1;
    for (const route of ['/', '/about/profile', '/downloads', '/staff/login']) {
      for (let repetition = 1; repetition <= repetitions; repetition++) {
        const context = await browser.newContext({ viewport: profile === 'mobile' ? { width: 375, height: 812 } : { width: 1280, height: 900 },
          reducedMotion: 'reduce', serviceWorkers: 'block' });
        const page = await context.newPage();
        const blocked = new Set();
        const requests = [];
        const failures = [];
        await page.route('**/*', interception => {
          const url = new URL(interception.request().url());
          if (url.origin === origin || url.protocol === 'data:' || url.protocol === 'blob:') return interception.continue();
          blocked.add(url.origin);
          return interception.abort('blockedbyclient');
        });
        page.on('request', request => { if (request.url().startsWith(origin + '/api/')) requests.push(new URL(request.url()).pathname + new URL(request.url()).search); });
        page.on('pageerror', error => failures.push(error.name));
        const cdp = await context.newCDPSession(page);
        await cdp.send('Network.enable');
        await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
        if (profile === 'mobile') {
          await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
          await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150,
            downloadThroughput: 1600000 / 8, uploadThroughput: 750000 / 8, connectionType: 'cellular4g' });
        }
        await page.addInitScript(() => {
          window.__localPerf = { lcp: null, cls: 0, longTasks: [], events: [] };
          let sessionStart = 0, sessionLast = 0, sessionScore = 0;
          new PerformanceObserver(list => { for (const item of list.getEntries()) window.__localPerf.lcp = item.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
          new PerformanceObserver(list => { for (const item of list.getEntries()) {
            if (item.hadRecentInput) continue;
            if (item.startTime - sessionLast > 1000 || item.startTime - sessionStart > 5000) { sessionStart = item.startTime; sessionScore = 0; }
            sessionLast = item.startTime; sessionScore += item.value;
            window.__localPerf.cls = Math.max(window.__localPerf.cls, sessionScore);
          } }).observe({ type: 'layout-shift', buffered: true });
          new PerformanceObserver(list => { for (const item of list.getEntries()) window.__localPerf.longTasks.push(item.duration); }).observe({ type: 'longtask', buffered: true });
          new PerformanceObserver(list => { for (const item of list.getEntries()) if (item.interactionId) window.__localPerf.events.push(item.duration); }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
        });
        const started = performance.now();
        // Polling widgets can prevent network idle indefinitely. Observe a bounded,
        // rendered route instead, identically for the before/after measurements.
        await page.goto(origin + route, { waitUntil: 'domcontentloaded', timeout: 60000 });
        const readySelector = route === '/' ? '#home h1'
          : route === '/about/profile' ? 'article[aria-label="Brief Profile text"]' : 'h1';
        await page.locator(readySelector).first().waitFor({ state: 'visible', timeout: 30000 });
        await page.waitForTimeout(1500);
        const metrics = await page.evaluate(() => {
          const resources = performance.getEntriesByType('resource');
          const js = resources.filter(item => /\/assets\/.*\.js$/.test(new URL(item.name).pathname));
          return { ...window.__localPerf, javascriptTransferredBytes: js.reduce((sum, item) => sum + item.encodedBodySize, 0),
            javascriptDecodedBytes: js.reduce((sum, item) => sum + item.decodedBodySize, 0),
            localImageBytes: resources.filter(item => item.initiatorType === 'img').reduce((sum, item) => sum + item.encodedBodySize, 0),
            navigationLoadMs: performance.getEntriesByType('navigation')[0].loadEventEnd };
        });
        report.runs.push({ profile, route, repetition, cpuSlowdown: profile === 'mobile' ? 4 : 1,
          rttMs: profile === 'mobile' ? 150 : 0, downloadMbps: profile === 'mobile' ? 1.6 : null,
          observationMs: performance.now() - started, ...metrics,
          apiRequests: requests, duplicateApiRequests: requests.length - new Set(requests).size,
          blockedExternalOrigins: [...blocked], pageErrors: failures });
        console.log(`${label} ${profile} ${route} ${repetition}: LCP=${metrics.lcp}ms JS=${metrics.javascriptTransferredBytes}B API=${requests.length}`);
        await context.close();
      }
    }
  }
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
const output = path.join(root, 'docs/r2/evidence/performance', `${label}-frontend.json`);
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(report, null, 2) + '\n');
console.log(output);
