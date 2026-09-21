require('reflect-metadata');
const { Reflector } = require('@nestjs/core');
const { AuthGuard, Public, Roles } = require('../dist/security/auth.guard');
const { Permissions } = require('../dist/security/permissions');
const id = '11111111-1111-4111-8111-111111111111';
const token = `header.${Buffer.from(JSON.stringify({ session_id: id })).toString('base64url')}.signature`;

function fixture({ role = 'guest', verified = false, deleted = null, active = true, userError = null, profileError = null, sessionError = null } = {}) {
  const profile = { role, is_verified: verified, deleted_at: deleted };
  const client = {
    auth: { getUser: jest.fn(async () => ({ data: { user: { id, app_metadata: { role: 'super_admin' }, user_metadata: { role: 'super_admin' } } }, error: userError })) },
    rpc: jest.fn(async () => ({ data: active, error: sessionError })),
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: profile, error: profileError }) }) }) }),
  };
  class Controller { route() {} }
  const request = { headers: { authorization: `Bearer ${token}` } };
  const context = { getHandler: () => Controller.prototype.route, getClass: () => Controller, switchToHttp: () => ({ getRequest: () => request }) };
  return { guard: new AuthGuard(new Reflector(), { getClient: () => client }), context, request, client, Controller };
}

test.each(['guest','citizen','staff','editor','barangay_admin','department_admin','unknown','constructor'])('denies dashboard permission to %s even with forged metadata', async role => {
  const f = fixture({ role, verified: true });
  Public()(f.Controller); Permissions('reports:read')(f.Controller);
  await expect(f.guard.canActivate(f.context)).rejects.toMatchObject({ status: 403 });
});

test.each(['admin','municipal_admin','super_admin'])('verified %s can read reports but role assignment is super-admin only', async role => {
  const f = fixture({ role, verified: true }); Permissions('reports:read')(f.Controller);
  expect(await f.guard.canActivate(f.context)).toBe(true);
  Permissions('users:roles')(f.Controller);
  if (role === 'super_admin') expect(await f.guard.canActivate(f.context)).toBe(true);
  else await expect(f.guard.canActivate(f.context)).rejects.toMatchObject({ status: 403 });
});

test('public endpoints skip authentication, but role metadata overrides Public', async () => {
  const f = fixture(); Public()(f.Controller);
  expect(await f.guard.canActivate(f.context)).toBe(true);
  expect(f.client.auth.getUser).not.toHaveBeenCalled();
  Roles('admin')(f.Controller);
  await expect(f.guard.canActivate(f.context)).rejects.toMatchObject({ status: 403 });
});

test.each([undefined, 'Basic abc', 'Bearer ', 'Bearer malformed'])('rejects invalid bearer header %s', async header => {
  const f = fixture(); f.request.headers.authorization = header;
  await expect(f.guard.canActivate(f.context)).rejects.toMatchObject({ status: 401 });
});

test('invalid JWT is rejected before session/profile access', async () => {
  const f = fixture({ userError: { message: 'expired' } });
  await expect(f.guard.canActivate(f.context)).rejects.toMatchObject({ status: 401 });
  expect(f.client.rpc).not.toHaveBeenCalled();
});

test.each([
  [{ active: false }, 401], [{ sessionError: {} }, 503],
  [{ profileError: {} }, 503], [{ deleted: '2026-01-01' }, 403],
])('fails closed for unavailable or revoked accounts %j', async (options, status) => {
  const f = fixture(options);
  await expect(f.guard.canActivate(f.context)).rejects.toMatchObject({ status });
});

test('role authorization uses verified database profile, never JWT metadata', async () => {
  for (const [role, verified, allowed] of [['guest', true, false], ['admin', false, false], ['admin', true, true], ['barangay_admin', true, false]]) {
    const f = fixture({ role, verified }); Roles('admin')(f.Controller);
    if (allowed) {
      expect(await f.guard.canActivate(f.context)).toBe(true);
      expect(f.request.user.id).toBe(id);
      expect(f.client.rpc).toHaveBeenCalledWith('is_api_session_active', { p_session_id: id, p_user_id: id });
    } else await expect(f.guard.canActivate(f.context)).rejects.toMatchObject({ status: 403 });
  }
});
