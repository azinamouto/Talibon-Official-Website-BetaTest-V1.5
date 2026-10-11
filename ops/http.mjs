export function origin(value) {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash) throw new Error('Expected a base origin URL.');
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error('Remote checks require HTTPS.');
  }
  return url.origin;
}

export async function probe(base, path, { expectedStatus = 200, json, html = false, timeoutMs = 10000 } = {}) {
  const started = performance.now();
  try {
    const headers = {};
    if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
      headers['x-vercel-protection-bypass'] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    }
    const response = await fetch(origin(base) + path, {
      headers, signal: AbortSignal.timeout(timeoutMs), redirect: 'error',
    });
    let ok = response.status === expectedStatus;
    if (json) {
      ok &&= (response.headers.get('content-type') || '').includes('application/json');
      const body = await response.json();
      ok &&= Object.entries(json).every(([key, value]) => body[key] === value);
      ok &&= /no-store/.test(response.headers.get('cache-control') || '');
    }
    if (html) ok &&= /<html[\s>]/i.test(await response.text());
    else await response.body?.cancel().catch(() => {});
    return { path, ok, status: response.status, durationMs: Math.round(performance.now() - started) };
  } catch {
    // Network error strings can contain URLs/credentials; only emit a fixed code.
    return { path, ok: false, status: 0, durationMs: Math.round(performance.now() - started) };
  }
}
