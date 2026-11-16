// Local operator CLI only. No environment loading, public endpoint, migrations or grant changes.
const { Pool } = require('pg');
const { connectionConfig } = require('../dist/database/postgres');
const { bootstrapFirstAdmin, validateFirstAdminInput, FIRST_ADMIN_AUTHORIZATION, BootstrapError } = require('../dist/authentication/first-admin-bootstrap');
const { target, verifyTarget } = require('./staging/target.cjs');

function authorize(args, env) {
  if (args.length !== 2 || new Set(args).size !== 2 || !args.includes('--authorize-first-staging-admin') ||
      !args.includes('--confirm-email-ownership') || env.VERCEL !== undefined || env.CI !== undefined ||
      env.NODE_OPTIONS !== undefined || env.NODE_EXTRA_CA_CERTS !== undefined || env.NODE_TLS_REJECT_UNAUTHORIZED !== undefined ||
      Object.keys(env).some(key => /^(PG|R2_AUTH_HOSTED|R2_STAGING_TEST)/.test(key))) {
    throw new BootstrapError('authorization_required');
  }
  const expected = { project: 'misty-silence-69777617', branch: 'br-steep-sea-ao0qw05a', database: 'neondb',
    endpoint: 'ep-sparkling-bird-ao5precf', host: 'ep-sparkling-bird-ao5precf.c-2.ap-southeast-1.aws.neon.tech',
    migrationLogin: 'talgov_staging_migrator' };
  if (Object.entries(expected).some(([key, value]) => target[key] !== value)) throw new BootstrapError('wrong_identity');
}
function config(raw) {
  const url = new URL(raw);
  if (url.hostname !== target.host || url.pathname !== '/neondb' || (url.port && url.port !== '5432') ||
      decodeURIComponent(url.username) !== target.migrationLogin || !url.password || url.hash ||
      url.searchParams.get('sslmode') !== 'verify-full' || url.searchParams.get('channel_binding') !== 'require') {
    throw new BootstrapError('wrong_identity');
  }
  return { ...connectionConfig(raw), max: 1, application_name: 'talgov-r2-first-admin-bootstrap' };
}
async function readInput(stream) {
  let bytes = 0;
  const chunks = [];
  let combined;
  try {
    for await (const chunk of stream) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      bytes += buffer.length;
      if (bytes > 16384) { buffer.fill(0); throw new BootstrapError('invalid_input'); }
      chunks.push(buffer);
    }
    combined = Buffer.concat(chunks);
    const input = JSON.parse(combined.toString('utf8'));
    const fields = ['email', 'displayName', 'password', 'databaseUrl', 'neonApiKey'];
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length !== fields.length ||
        !fields.every(key => typeof input[key] === 'string') || !input.neonApiKey) throw new BootstrapError('invalid_input');
    return input;
  } finally { combined?.fill(0); for (const chunk of chunks) chunk.fill(0); }
}
async function run(args, env, input) {
  authorize(args, env);
  const account = { authorization: FIRST_ADMIN_AUTHORIZATION, emailOwnershipConfirmed: true,
    email: input.email, displayName: input.displayName, password: input.password };
  input.password = '';
  let pool;
  try {
    validateFirstAdminInput(account);
    const settings = config(input.databaseUrl);
    input.databaseUrl = '';
    // Bounded read-only metadata proof of non-default branch/endpoint BEFORE connecting.
    await verifyTarget(input.neonApiKey);
    input.neonApiKey = '';
    pool = new Pool(settings);
    pool.on('error', () => undefined);
    return await bootstrapFirstAdmin(pool, account);
  } finally {
    input.password = input.databaseUrl = input.neonApiKey = account.password = '';
    await pool?.end();
  }
}
function diagnostic(error) {
  const allowed = new Set(['authorization_required','invalid_input','wrong_identity','already_initialized','provider_rejected']);
  return { event: 'first_admin_bootstrap_failed', code: error instanceof BootstrapError && allowed.has(error.code) ? error.code : 'failed_or_unconfirmed' };
}
module.exports = { authorize, config, readInput, run, diagnostic };
if (require.main === module) {
  (async () => {
    try {
      authorize(process.argv.slice(2), process.env);
      const result = await run(process.argv.slice(2), process.env, await readInput(process.stdin));
      console.log(JSON.stringify({ event: 'first_admin_bootstrap_completed', ...result }));
    } catch (error) { console.error(JSON.stringify(diagnostic(error))); process.exitCode = 1; }
  })();
}
