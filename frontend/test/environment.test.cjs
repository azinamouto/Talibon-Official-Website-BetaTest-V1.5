const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { transformSync } = require('esbuild');
const source = fs.readFileSync(path.join(__dirname, '../src/lib/envValidator.ts'), 'utf8');
const code = transformSync(source, { loader: 'ts', format: 'cjs', define: { 'import.meta.env': '{}' } }).code;
const context = { module: { exports: {} }, atob, URL };
vm.runInNewContext(code, context);
const { validateEnvironment } = context.module.exports;
const key = role => ['test', Buffer.from(JSON.stringify({ role })).toString('base64url'), 'test'].join('.');
const valid = { VITE_SUPABASE_URL: 'http://localhost:54321', VITE_SUPABASE_ANON_KEY: key('anon') };
test('accepts anon configuration and local projects', () => assert.equal(validateEnvironment(valid).isValid, true));
test('prefers publishable keys while retaining the legacy anon variable', () => {
  assert.equal(validateEnvironment({ ...valid, VITE_SUPABASE_ANON_KEY: '', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example' }).isValid, true);
  assert.equal(validateEnvironment({ ...valid, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_example' }).isValid, false);
});
test('rejects missing, placeholder, malformed, secret, and elevated keys', () => {
  for (const value of ['', 'your_supabase_anon_key', 'sb_secret_test', key('service_role'), key('authenticated')]) {
    const result = validateEnvironment({ ...valid, VITE_SUPABASE_ANON_KEY: value });
    assert.equal(result.isValid, false);
    if (value) assert.equal(result.issues.join(' ').includes(value), false);
  }
  assert.equal(validateEnvironment({}).isValid, false);
});
test('rejects sensitive Vite names and URLs containing credentials', () => {
  for (const name of ['VITE_SECRET_KEY', 'VITE_SUPABASE_SERVICE_ROLE_KEY', 'VITE_PRIVATE_KEY']) {
    assert.equal(validateEnvironment({ ...valid, [name]: 'sensitive-marker' }).isValid, false);
  }
  assert.equal(validateEnvironment({ ...valid, VITE_SUPABASE_URL: 'https://user:password@example.com' }).isValid, false);
});
test('browser configuration contains no privileged or canonical fallback and no Gemini injection', () => {
  const client = fs.readFileSync(path.join(__dirname, '../src/lib/supabase.ts'), 'utf8');
  assert.doesNotMatch(client, /CANONICAL_|process\.env|SERVICE_ROLE/);
  assert.ok(client.indexOf('validateEnvironment()') < client.indexOf('export const supabase = createClient'));
  const config = fs.readFileSync(path.join(__dirname, '../vite.config.ts'), 'utf8');
  assert.doesNotMatch(config, /JSON\.stringify\(.*GEMINI/);
});

test('invalid configuration prevents Supabase client creation', () => {
  const clientSource = fs.readFileSync(path.join(__dirname, '../src/lib/supabase.ts'), 'utf8');
  const compiled = transformSync(clientSource, { loader: 'ts', format: 'cjs', define: { 'import.meta.env': '{}' } }).code;
  let calls = 0;
  const runtime = { module: { exports: {} }, require: name => name === '@supabase/supabase-js' ? { createClient: () => { calls++; } } : { validateEnvironment } };
  assert.throws(() => vm.runInNewContext(compiled, runtime), /Invalid frontend configuration/);
  assert.equal(calls, 0);
});
