require('reflect-metadata');
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { ForbiddenException, UnauthorizedException } = require('@nestjs/common');
const runtime = require('../dist/authentication/runtime');
const originalAuthentication = runtime.staffAuthentication;
let principal = null;
let verificationCalls = 0;
runtime.staffAuthentication = () => ({
  verify: async headers => {
    verificationCalls++;
    return headers.get('cookie') === 'staff=valid' ? principal : null;
  },
});
const { StaffGuard } = require('../dist/authentication/staff.guard');
const guard = new StaffGuard({
  getAllAndOverride: (key, _targets) => currentMetadata[key],
});
let currentMetadata = {};
const requestContext = cookie => ({
  getHandler: () => ({}), getClass: () => ({}),
  switchToHttp: () => ({ getRequest: () => ({ headers: { cookie } }) }),
});
after(() => { runtime.staffAuthentication = originalAuthentication; });

test('unmarked routes fail closed and public routes bypass staff auth', async () => {
  currentMetadata = {};
  await assert.rejects(guard.canActivate(requestContext('')), ForbiddenException);
  const calls = verificationCalls;
  currentMetadata = { isPublic: true };
  assert.equal(await guard.canActivate(requestContext('')), true);
  assert.equal(verificationCalls, calls);
});

test('staff role and permission metadata use verified app-owned roles', async () => {
  principal = { id: 'editor-id', role: 'editor' };
  currentMetadata = { roles: ['admin', 'editor'] };
  assert.equal(await guard.canActivate(requestContext('staff=valid')), true);
  currentMetadata = { roles: ['admin'] };
  await assert.rejects(guard.canActivate(requestContext('staff=valid')), ForbiddenException);
  currentMetadata = { permissions: ['users:roles'] };
  await assert.rejects(guard.canActivate(requestContext('staff=valid')), ForbiddenException);
  currentMetadata = { permissions: ['media:write'] };
  assert.equal(await guard.canActivate(requestContext('staff=valid')), true);
  currentMetadata = { requireAuth: true };
  await assert.rejects(guard.canActivate(requestContext('')), UnauthorizedException);
  principal = { id: 'admin-id', role: 'admin' };
  currentMetadata = { permissions: ['users:roles'] };
  assert.equal(await guard.canActivate(requestContext('staff=valid')), true);
});
