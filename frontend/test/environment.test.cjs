const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { transformSync } = require('esbuild');
const frontend = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(frontend, 'src/lib/envValidator.ts'), 'utf8');
const code = transformSync(source, { loader: 'ts', format: 'cjs', define: { 'import.meta.env': '{}' } }).code;
const context = { module: { exports: {} } };
vm.runInNewContext(code, context);
const { validateEnvironment } = context.module.exports;

test('public frontend needs no provider credentials', () => {
  assert.equal(validateEnvironment({}).isValid, true);
  assert.equal(validateEnvironment({ VITE_API_URL: 'http://localhost:3000' }).isValid, true);
});

test('rejects private values exposed with the Vite public prefix', () => {
  for (const name of ['VITE_SECRET_KEY', 'VITE_SERVICE_ROLE_KEY', 'VITE_PRIVATE_KEY', 'VITE_DATABASE_URL']) {
    const result = validateEnvironment({ [name]: 'sensitive-marker' });
    assert.equal(result.isValid, false);
    assert.doesNotMatch(result.issues.join(' '), /sensitive-marker/);
  }
});

test('active frontend source and manifests exclude Supabase', () => {
  const sourceFiles = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(fullPath) : [fullPath];
  });
  for (const file of sourceFiles(path.join(frontend, 'src'))) {
    const content = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(content, /@supabase\/supabase-js|VITE_SUPABASE|lib\/supabase|SupabaseAuthContext/, file);
  }
  for (const manifest of [
    path.join(frontend, 'package.json'),
    path.join(frontend, 'package-lock.json'),
    path.join(frontend, '..', 'package.json'),
    path.join(frontend, '..', 'package-lock.json'),
  ]) {
    assert.doesNotMatch(fs.readFileSync(manifest, 'utf8'), /@supabase\/supabase-js/, manifest);
  }
  assert.doesNotMatch(fs.readFileSync(path.join(frontend, '.env.example'), 'utf8'), /SUPABASE/i);
  assert.match(fs.readFileSync(path.join(frontend, 'vite.config.ts'), 'utf8'), /envPrefix:\s*\[\]/);
});
