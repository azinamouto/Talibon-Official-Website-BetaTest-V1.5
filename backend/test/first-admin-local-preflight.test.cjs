const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { inspectFirstAdminPreflight } = require('../scripts/first-admin-local-preflight.cjs');
const cli = require('../scripts/bootstrap-first-staging-admin.cjs');
const target = require('../scripts/staging/target.json');
const args = ['--authorize-first-staging-admin', '--confirm-email-ownership'];
const fixture = () => ({ email: 'synthetic@example.invalid', displayName: 'Synthetic administrator',
  password: randomBytes(24).toString('base64url'), neonApiKey: randomBytes(24).toString('base64url'),
  databaseUrl: `postgresql://${target.migrationLogin}:synthetic@${target.host}/neondb?sslmode=verify-full&channel_binding=require` });

test('successful local validation reports stages without running bootstrap or contacting a service', async () => {
  const savedRun = cli.run, savedFetch = global.fetch;
  cli.run = () => assert.fail('bootstrap must not run');
  global.fetch = () => assert.fail('hosted requests must not run');
  try {
    const input = fixture();
    assert.deepEqual(await inspectFirstAdminPreflight(args, {}, input, input.password), {
      passed: true, passed_checks: ['authorization', 'private_input_shape', 'password_confirmation', 'account_input', 'database_configuration'],
      mode: 'local_validation_only',
    });
  } finally { cli.run = savedRun; global.fetch = savedFetch; }
});

for (const [name, patch, env, confirmation, check, code] of [
  ['hosted context', {}, { VERCEL: '1' }, null, 'authorization', 'authorization_required'],
  ['missing metadata credential', { neonApiKey: '' }, {}, null, 'private_input_shape', 'invalid_input'],
  ['password confirmation mismatch', {}, {}, 'different-synthetic-confirmation', 'password_confirmation', 'password_confirmation_mismatch'],
  ['malformed email', { email: 'missing-at-synthetic-mailbox' }, {}, null, 'account_input', 'invalid_input'],
  ['short password', { password: 'synthetic' }, {}, null, 'account_input', 'invalid_input'],
  ['malformed URL', { databaseUrl: 'synthetic-invalid-url' }, {}, null, 'database_configuration', 'failed_or_unconfirmed'],
  ['wrong database identity', { databaseUrl: `postgresql://${target.migrationLogin}:synthetic@${target.host}/other?sslmode=verify-full&channel_binding=require` }, {}, null, 'database_configuration', 'wrong_identity'],
  ['weakened TLS', { databaseUrl: `postgresql://${target.migrationLogin}:synthetic@${target.host}/neondb?sslmode=require&channel_binding=require` }, {}, null, 'database_configuration', 'wrong_identity'],
  ['missing channel binding', { databaseUrl: `postgresql://${target.migrationLogin}:synthetic@${target.host}/neondb?sslmode=verify-full` }, {}, null, 'database_configuration', 'wrong_identity'],
]) {
  test(`attributes ${name} to a bounded preflight stage`, async () => {
    const input = { ...fixture(), ...patch };
    const result = await inspectFirstAdminPreflight(args, env, input, confirmation ?? input.password);
    assert.equal(result.passed, false); assert.equal(result.failed_check, check); assert.equal(result.error_code, code);
    const output = JSON.stringify(result);
    for (const secret of [input.email, input.password, input.neonApiKey, input.databaseUrl]) {
      if (secret) assert.equal(output.includes(secret), false);
    }
  });
}

test('unexpected errors cannot insert arbitrary messages or codes into diagnostic output', async () => {
  const payload = randomBytes(24).toString('base64url');
  const input = { toJSON() { throw Object.assign(new Error(payload), { code: payload }); } };
  const result = await inspectFirstAdminPreflight(args, {}, input, 'synthetic');
  assert.deepEqual(result, { passed: false, failed_check: 'private_input_shape', error_code: 'failed_or_unconfirmed', passed_checks: ['authorization'] });
  assert.equal(JSON.stringify(result).includes(payload), false);
});

test('throwing diagnostic accessors still produce a bounded rejection', async () => {
  const { BootstrapError } = require('../dist/authentication/first-admin-bootstrap');
  const payload = randomBytes(24).toString('base64url');
  const error = new BootstrapError('invalid_input');
  Object.defineProperty(error, 'code', { get() { throw new Error(payload); } });
  const result = await inspectFirstAdminPreflight(args, {}, { toJSON() { throw error; } }, 'synthetic');
  assert.deepEqual(result, { passed: false, failed_check: 'private_input_shape', error_code: 'failed_or_unconfirmed', passed_checks: ['authorization'] });
  assert.equal(JSON.stringify(result).includes(payload), false);
});
