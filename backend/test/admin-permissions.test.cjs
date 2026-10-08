require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { clientPermissions, ROLE_NAMES, ROLE_PERMISSIONS, CONTENT_ROLES } = require('../dist/security/permissions');
const { AuthController } = require('../dist/api/auth/auth.controller');
test('client permission contract matches server policies and excludes inactive/unverified roles', () => {
  for (const role of [...ROLE_NAMES, 'unknown', 'constructor']) {
    const profile = { role, is_verified: true, deleted_at: null };
    const actual = new AuthController({}).me({ user: { id: 'actor' }, profile }).data;
    const expected = [...(Object.hasOwn(ROLE_PERMISSIONS, role) ? ROLE_PERMISSIONS[role] : []), ...(CONTENT_ROLES.includes(role) ? ['content:manage'] : [])];
    assert.deepEqual(actual.permissions, expected);
    assert.deepEqual(clientPermissions({ ...profile, is_verified: false }), []);
    assert.deepEqual(clientPermissions({ ...profile, deleted_at: '2026-10-01' }), []);
  }
});
