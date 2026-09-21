/** Validate configuration without printing secret values. */
export function validateEnvironment(env: Record<string, unknown>) {
  const fail = (key: string): never => { throw new Error(`Invalid or missing environment variable: ${key}`); };
  const mode = env.NODE_ENV ?? 'development';
  if (!['development', 'test', 'production'].includes(String(mode))) fail('NODE_ENV');
  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) fail('PORT');
  if (env.SUPABASE_URL) {
    try {
      const url = new URL(String(env.SUPABASE_URL));
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) fail('SUPABASE_URL');
    } catch { fail('SUPABASE_URL'); }
  }
  const origins = String(env.ALLOWED_ORIGINS ?? '').split(',').map(v => v.trim()).filter(Boolean);
  for (const origin of origins) {
    try {
      const url = new URL(origin);
      if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) fail('ALLOWED_ORIGINS');
    } catch { fail('ALLOWED_ORIGINS'); }
  }
  if (mode === 'production') {
    for (const key of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
      if (!String(env[key] ?? '').trim()) fail(key);
    }
    if (!env.SUPABASE_PUBLISHABLE_KEY && !env.SUPABASE_ANON_KEY) fail('SUPABASE_PUBLISHABLE_KEY');
    if (!origins.length) fail('ALLOWED_ORIGINS');
    if (env.ENABLE_MOCK_DATA === 'true') fail('ENABLE_MOCK_DATA');
  }
  return { ...env, NODE_ENV: mode, PORT: port };
}
