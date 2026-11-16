const STAGING_PROJECT_ID = 'prj_bi8GqnCkvRLBz850HiJKU5RRhXq8';
const STAGING_HOST = /^talgov-r2-staging-[a-z0-9]{1,27}-rynzz22s-projects\.vercel\.app$/;

/** Trust configured origins or attested staging metadata, never request headers. */
export function staffOriginConfiguration(env: Record<string, unknown>) {
  const flag = env.STAFF_AUTH_DEPLOYMENT_ORIGIN_ENABLED;
  if (flag !== undefined && flag !== 'false' && flag !== 'true') {
    throw new Error('Invalid environment variable: STAFF_AUTH_DEPLOYMENT_ORIGIN_ENABLED');
  }
  let origin = typeof env.STAFF_AUTH_ORIGIN === 'string' ? env.STAFF_AUTH_ORIGIN : undefined;
  const deploymentScoped = flag === 'true';
  if (deploymentScoped) {
    for (const [key, expected] of Object.entries({ NODE_ENV: 'production', VERCEL: '1',
      VERCEL_PROJECT_ID: STAGING_PROJECT_ID, VERCEL_ENV: 'production', VERCEL_TARGET_ENV: 'production' })) {
      if (env[key] !== expected) throw new Error(`Invalid staging origin configuration: ${key}`);
    }
    const hostname = env.VERCEL_URL;
    if (typeof hostname !== 'string' || hostname !== hostname.trim() || !STAGING_HOST.test(hostname)) {
      throw new Error('Invalid staging origin configuration: VERCEL_URL');
    }
    origin = `https://${hostname}`;
  }
  // One exact origin; no wildcard, suffix matching, cross-domain cookie or fallback.
  return Object.freeze({ origin, deploymentScoped,
    trustedOrigins: Object.freeze(origin ? [origin] : []) });
}

export function isStaffMutationOrigin(origin: unknown, env: Record<string, unknown>): boolean {
  try {
    const config = staffOriginConfiguration(env);
    return typeof origin === 'string' && config.trustedOrigins.includes(origin);
  } catch { return false; }
}
