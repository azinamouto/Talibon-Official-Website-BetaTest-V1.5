const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('compiled staff auth loads with native ESM imports when require(ESM) is disabled', () => {
  const result = spawnSync(process.execPath, ['--no-experimental-require-module', '-e', `
    const assert = require('node:assert/strict');
    const { BetterAuthAdapter, providerOptions } = require('./dist/authentication/better-auth.adapter');
    (async () => {
      const options = { databaseUrl: 'postgresql://synthetic@127.0.0.1:1/synthetic',
        origin: 'http://127.0.0.1:3000', localTest: true, secret: 'x'.repeat(48),
        sendResetPassword: async () => {} };
      const adapter = new BetterAuthAdapter(options);
      try {
        assert.equal(adapter.auth, adapter.auth);
        const auth = await adapter.auth;
        assert.equal(typeof auth.handler, 'function');
        assert.equal(typeof auth.api.getSession, 'function');
        const config = await providerOptions(adapter.pool, { ...options, localTest: false,
          origin: 'https://staff.example.invalid' });
        assert.equal(config.advanced.useSecureCookies, true);
        assert.equal(config.emailAndPassword.disableSignUp, true);
        assert.equal(config.plugins[0].id, 'two-factor');
      } finally { await adapter.close(); }
    })().catch(error => { console.error(error); process.exitCode = 1; });
  `], { cwd: path.resolve(__dirname, '..'), encoding: 'utf8', timeout: 30000 });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
