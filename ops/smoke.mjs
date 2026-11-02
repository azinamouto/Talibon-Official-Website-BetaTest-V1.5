import { pathToFileURL } from 'node:url';
import { origin, probe } from './http.mjs';

export async function smoke(base) {
  base = origin(base);
  const results = [];
  for (const [path, options] of [
    ['/api/health', { json: { status: 'ok', service: 'talibon-api' } }],
    ['/api/health/ready', { json: { status: 'ok', database: 'reachable' } }],
    ['/api/forms/certificate', { expectedStatus: 410 }],
    ['/', { html: true }],
    ['/login', { html: true }],
  ]) results.push(await probe(base, path, options));
  return { ok: results.every(result => result.ok), results };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await smoke(process.env.DEPLOYMENT_URL);
    console.log(JSON.stringify(result));
    if (!result.ok) process.exitCode = 1;
  } catch { console.error('Smoke check configuration failed. Set DEPLOYMENT_URL to the HTTPS origin.'); process.exitCode = 1; }
}
