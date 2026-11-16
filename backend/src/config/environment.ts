import { connectionConfig } from '../database/postgres';
import { staffOriginConfiguration } from './staff-origin';
/** Email recovery is opt-in; this flag never controls login, MFA or authorization. */
export function staffPasswordRecoveryEnabled(value: unknown, key = 'STAFF_PASSWORD_RECOVERY_ENABLED'): boolean {
  if (value === undefined || value === 'false') return false;
  if (value === 'true') return true;
  throw new Error(`Invalid environment variable: ${key}`);
}
/** Validate configuration without printing secret values. */
export function validateEnvironment(env: Record<string, unknown>) {
  const fail = (key: string): never => { throw new Error(`Invalid or missing environment variable: ${key}`); };
  for (const key of Object.keys(env)) {
    if (key === 'VITE_STAFF_PASSWORD_RECOVERY_ENABLED') {
      staffPasswordRecoveryEnabled(env[key], key);
    } else if (/^VITE_.*(SECRET|SERVICE_ROLE|PRIVATE|PASSWORD|ADMIN|DATABASE)/i.test(key)) {
      throw new Error('Private environment variables must not use the VITE_ prefix.');
    }
  }
  const mode = env.NODE_ENV ?? 'development';
  const recoveryEnabled = staffPasswordRecoveryEnabled(env.STAFF_PASSWORD_RECOVERY_ENABLED);
  const staffOrigin = staffOriginConfiguration(env);
  if (!['development', 'test', 'production'].includes(String(mode))) fail('NODE_ENV');
  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) fail('PORT');
  const origins = String(env.ALLOWED_ORIGINS ?? '').split(',').map(v => v.trim()).filter(Boolean);
  for (const origin of origins) {
    try {
      const url = new URL(origin);
      if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) fail('ALLOWED_ORIGINS');
    } catch { fail('ALLOWED_ORIGINS'); }
  }
  if (mode === 'production') {
    const mailKeys = recoveryEnabled ? ['STAFF_MAIL_API_KEY', 'STAFF_MAIL_FROM'] : [];
    for (const key of ['DATABASE_URL', 'STAFF_AUTH_DATABASE_URL', 'STAFF_AUTH_SECRET', 'STAFF_AUTH_ORIGIN', 'MEDIA_DATABASE_URL', 'MEDIA_BUCKET', 'AWS_ENDPOINT_URL_S3', 'AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', ...mailKeys]) {
      if (!String(env[key] ?? '').trim()) fail(key);
    }
    for (const key of ['DATABASE_URL','STAFF_AUTH_DATABASE_URL','MEDIA_DATABASE_URL']) {
      try { connectionConfig(String(env[key])); } catch { fail(key); }
    }
    if (String(env.STAFF_AUTH_SECRET).length < 43) fail('STAFF_AUTH_SECRET');
    try {
      const origin = new URL(String(env.STAFF_AUTH_ORIGIN));
      if (origin.protocol !== 'https:' || origin.origin !== env.STAFF_AUTH_ORIGIN || !origins.includes(origin.origin)) fail('STAFF_AUTH_ORIGIN');
      const endpoint = new URL(String(env.AWS_ENDPOINT_URL_S3));
      if (endpoint.protocol !== 'https:' || !/^br-[a-z0-9-]+\.storage\.c-\d+\.(us-east-1|us-east-2|eu-central-1|ap-southeast-1)\.aws\.neon\.tech$/.test(endpoint.hostname) || endpoint.username || endpoint.password || endpoint.search || endpoint.hash || endpoint.pathname !== '/') fail('AWS_ENDPOINT_URL_S3');
    } catch { fail('STAFF_AUTH_ORIGIN/AWS_ENDPOINT_URL_S3'); }
    if (!origins.length) fail('ALLOWED_ORIGINS');
    if (env.ENABLE_MOCK_DATA === 'true') fail('ENABLE_MOCK_DATA');
  }
  return { ...env, NODE_ENV: mode, PORT: port,
    ...(staffOrigin.deploymentScoped ? { STAFF_AUTH_ORIGIN: staffOrigin.origin,
      ALLOWED_ORIGINS: staffOrigin.trustedOrigins.join(',') } : {}) };
}
