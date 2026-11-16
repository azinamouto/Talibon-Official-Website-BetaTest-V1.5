const { test } = require('node:test');
const assert = require('node:assert/strict');
const { BetterAuthAdapter, providerOptions } = require('../dist/authentication/better-auth.adapter');

for (const enabled of [false, undefined]) test(`password recovery ${enabled === false ? 'disabled explicitly' : 'disabled by default'} rejects both endpoints before database or mail work`, async () => {
  let databaseCalls = 0, mailCalls = 0;
  const options = { databaseUrl: 'postgresql://synthetic@127.0.0.1:1/synthetic',
    origin: 'http://127.0.0.1', localTest: true, secret: 'x'.repeat(48),
    passwordRecoveryEnabled: enabled, sendResetPassword: async () => { mailCalls++; } };
  const adapter = new BetterAuthAdapter(options);
  adapter.pool.query = async () => { databaseCalls++; throw new Error('Must not query'); };
  try {
    for (const path of ['/request-password-reset', '/reset-password']) {
      const response = { headers: {}, setHeader(k,v) { this.headers[k]=v; },
        status(value) { this.statusCode=value; return this; }, json(value) { this.body=value; } };
      await adapter.handle({ path: '/api/staff-auth'+path, method: 'POST', headers: {}, body: {} }, response,
        () => assert.fail('Recovery must not fall through'));
      assert.equal(response.statusCode,503);
      assert.equal(response.headers['Cache-Control'],'no-store');
      assert.deepEqual(response.body,{message:'Password recovery is temporarily unavailable.'});
    }
    const config = await providerOptions(adapter.pool,options);
    assert.equal(config.emailAndPassword.sendResetPassword,undefined);
    assert.equal(config.emailAndPassword.disableSignUp,true);
    assert.equal(config.emailAndPassword.requireEmailVerification,true);
    assert.equal(config.rateLimit.enabled,true);
    assert.equal(config.plugins[0].id,'two-factor');
    assert.equal(databaseCalls,0); assert.equal(mailCalls,0);
  } finally { await adapter.close(); }
});

test('email recovery opt-in requires a delivery callback', async () => {
  const options = { origin: 'http://127.0.0.1', localTest: true, secret: 'x'.repeat(48), passwordRecoveryEnabled: true };
  await assert.rejects(providerOptions({}, options), /Recovery delivery is not configured/);
  const config = await providerOptions({}, {...options,sendResetPassword:async()=>{}});
  assert.equal(typeof config.emailAndPassword.sendResetPassword,'function');
  assert.equal(config.emailAndPassword.revokeSessionsOnPasswordReset,true);
});
