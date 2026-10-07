const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { transformSync } = require('esbuild');
const code = transformSync(fs.readFileSync(require('node:path').join(__dirname, '../src/lib/authSession.ts'), 'utf8'), { loader: 'ts', format: 'cjs' }).code;
const runtime = { module: { exports: {} }, setTimeout, clearTimeout };
vm.runInNewContext(code, runtime);
const { observeAuthSession } = runtime.module.exports;
const tick = () => new Promise(resolve => setTimeout(resolve, 10));
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const session = (id, token = 'first') => ({ user: { id }, access_token: token });
function harness(load = async user => ({ id: user.id, role: 'admin' })) {
  let callback, unsubscribed = false;
  const initial = deferred();
  const states = [];
  const observer = observeAuthSession({
    onAuthStateChange(fn) { callback = fn; return { data: { subscription: { unsubscribe() { unsubscribed = true; } } } }; },
    getSession() { return initial.promise; },
  }, load, state => states.push(state));
  return { observer, initial, states, emit: (event, value) => callback(event, value), latest: () => states.at(-1), unsubscribed: () => unsubscribed };
}
test('profile work is deferred outside the auth callback; refresh preserves content', async () => {
  let calls = 0;
  const h = harness(async user => { calls++; return { id: user.id }; });
  assert.equal(h.emit('SIGNED_IN', session('a')), undefined);
  assert.equal(calls, 0);
  await tick();
  const profile = h.latest().profile;
  h.emit('TOKEN_REFRESHED', session('a', 'new-token'));
  h.emit('SIGNED_IN', session('a', 'new-token'));
  assert.equal(h.latest().state, 'AUTHENTICATED');
  assert.equal(h.latest().session.access_token, 'new-token');
  assert.equal(h.latest().profile, profile);
  await tick();
  assert.equal(calls, 1);
  h.observer.dispose();
});
test('late profile and bootstrap results cannot undo logout', async () => {
  const pending = deferred();
  const h = harness(() => pending.promise);
  h.emit('SIGNED_IN', session('a'));
  await tick();
  h.emit('SIGNED_OUT', null);
  pending.resolve({ id: 'a' });
  h.initial.resolve({ data: { session: session('a') } });
  await tick();
  assert.equal(h.latest().state, 'UNAUTHENTICATED');
  assert.equal(h.latest().profile, null);
  h.observer.dispose();
});
test('switching accounts discards the previous account profile', async () => {
  const a = deferred();
  const h = harness(user => user.id === 'a' ? a.promise : Promise.resolve({ id: 'b' }));
  h.emit('SIGNED_IN', session('a'));
  await tick();
  h.emit('SIGNED_IN', session('b'));
  await tick();
  a.resolve({ id: 'a' });
  await tick();
  assert.equal(h.latest().profile.id, 'b');
  h.observer.dispose();
});
test('profile failure is recoverable and does not fabricate a signout', async () => {
  let fails = true;
  const h = harness(async () => { if (fails) throw Error('offline'); return { id: 'a' }; });
  h.emit('INITIAL_SESSION', session('a'));
  await tick();
  assert.equal(h.latest().state, 'ERROR');
  assert.equal(h.latest().session.user.id, 'a');
  fails = false;
  await h.observer.refreshProfile();
  assert.equal(h.latest().state, 'AUTHENTICATED');
  h.observer.dispose();
});
test('bootstrap rejection exits loading and disposal prevents updates', async () => {
  const h = harness();
  h.initial.reject(Error('network'));
  await tick();
  assert.equal(h.latest().state, 'ERROR');
  h.observer.dispose();
  const count = h.states.length;
  h.emit('SIGNED_IN', session('a'));
  await tick();
  assert.equal(h.states.length, count);
  assert.equal(h.unsubscribed(), true);
});
test('password recovery survives refresh until explicitly completed', async () => {
  const h = harness();
  h.emit('PASSWORD_RECOVERY', session('a'));
  await tick();
  h.emit('TOKEN_REFRESHED', session('a', 'refreshed'));
  assert.equal(h.latest().isPasswordRecovery, true);
  h.observer.finishPasswordRecovery();
  assert.equal(h.latest().isPasswordRecovery, false);
  h.observer.dispose();
});
