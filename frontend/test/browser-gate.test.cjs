const { test } = require('node:test');
const assert = require('node:assert/strict');

test('browser inventory rejects empty discovery, missing suites and skipped declarations', async () => {
  const { validateInventory } = await import('../scripts/strict-browser-reporter.mjs');
  const item = { title: 'MFA challenge', location: { file: '/test/admin.spec.ts' }, expectedStatus: 'passed' };
  assert.deepEqual(validateInventory([item], ['admin.spec.ts']), []);
  assert.ok(validateInventory([], ['admin.spec.ts']).some(issue => issue.includes('No tests')));
  assert.ok(validateInventory([item], ['admin.spec.ts'], 5).some(issue => issue.includes('Expected at least 5')));
  assert.ok(validateInventory([item], ['admin.spec.ts', 'staff-login.spec.ts']).some(issue => issue.includes('Missing expected')));
  assert.ok(validateInventory([{ ...item, expectedStatus: 'skipped' }], ['admin.spec.ts']).some(issue => issue.includes('Skipped test')));
  assert.ok(validateInventory([{ ...item, expectedStatus: 'failed' }], ['admin.spec.ts']).some(issue => issue.includes('Expected failure')));
});
