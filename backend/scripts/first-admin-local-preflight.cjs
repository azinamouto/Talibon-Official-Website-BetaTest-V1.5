// Pure local validation. Never constructs a pool, verifies hosted metadata or runs bootstrap.
const { Readable } = require('node:stream');
const { timingSafeEqual } = require('node:crypto');
const cli = require('./bootstrap-first-staging-admin.cjs');
const { validateFirstAdminInput, FIRST_ADMIN_AUTHORIZATION, BootstrapError } = require('../dist/authentication/first-admin-bootstrap');

async function inspectFirstAdminPreflight(args, env, input, confirmation) {
  const passedChecks = [];
  let check = 'authorization', parsed;
  const rejected = code => ({ passed: false, failed_check: check, error_code: code, passed_checks: passedChecks });
  try {
    cli.authorize(args, env);
    passedChecks.push(check);
    check = 'private_input_shape';
    parsed = await cli.readInput(Readable.from([JSON.stringify(input)]));
    passedChecks.push(check);
    check = 'password_confirmation';
    if (typeof confirmation !== 'string') throw new BootstrapError('invalid_input');
    const passwordBytes = Buffer.from(parsed.password, 'utf8'), confirmationBytes = Buffer.from(confirmation, 'utf8');
    let matches;
    try { matches = passwordBytes.length === confirmationBytes.length && timingSafeEqual(passwordBytes, confirmationBytes); }
    finally { passwordBytes.fill(0); confirmationBytes.fill(0); }
    if (!matches) return rejected('password_confirmation_mismatch');
    passedChecks.push(check);
    check = 'account_input';
    validateFirstAdminInput({ authorization: FIRST_ADMIN_AUTHORIZATION, emailOwnershipConfirmed: true,
      email: parsed.email, displayName: parsed.displayName, password: parsed.password });
    passedChecks.push(check);
    check = 'database_configuration';
    cli.config(parsed.databaseUrl);
    passedChecks.push(check);
    return { passed: true, passed_checks: passedChecks, mode: 'local_validation_only' };
  } catch (error) {
    // Reuse the bootstrap's bounded allowlist. Never emit exception messages,
    // input values, arbitrary codes, connection settings or private file paths.
    let code = 'failed_or_unconfirmed';
    try { code = cli.diagnostic(error).code; } catch { /* Hostile accessors must not escape diagnostics. */ }
    return rejected(code);
  } finally {
    if (parsed) parsed.password = parsed.databaseUrl = parsed.neonApiKey = '';
    confirmation = '';
  }
}
module.exports = { inspectFirstAdminPreflight };
