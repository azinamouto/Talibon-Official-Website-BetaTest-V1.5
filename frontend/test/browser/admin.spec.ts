import { test, expect, type Page, type BrowserContext } from '@playwright/test';
const actor = '11111111-1111-4111-8111-111111111111';
const target = { id: '22222222-2222-4222-8222-222222222222', full_name: 'Maria Cruz', email: 'maria@example.test', role: 'citizen', version: 3, is_verified: true, deleted_at: null };
const allPermissions = ['users:read', 'users:update', 'users:deactivate', 'users:roles', 'reports:read', 'content:manage'];
async function setup(page: Page, context: BrowserContext, role = 'super_admin', permissions = allPermissions) {
  const user = { id: actor, email: 'admin@example.test', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const token = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: actor, exp, aud: 'authenticated', role: 'authenticated' })).toString('base64url')}.test`;
  const session = { user, access_token: token, refresh_token: 'test-refresh', expires_in: 3600, expires_at: exp, token_type: 'bearer' };
  await page.addInitScript(value => localStorage.setItem('sb-127-auth-token', JSON.stringify(value)), session);
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await context.route('http://127.0.0.1:54321/**', route => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill({ json: path.endsWith('/token') ? session : path.endsWith('/user') ? user : path.endsWith('/profiles') ? { ...user, full_name: 'Administrator', role, is_verified: true, is_active: true } : [] });
  });
  await context.route('**/api/**', route => route.fulfill({ json: {} }));
  await context.route('**/api/auth/me', route => route.fulfill({ json: { success: true, data: { user, profile: { role }, permissions } } }));
  await context.route('**/api/admin/users**', route => {
    expect(route.request().headers().authorization).toBe(`Bearer ${token}`);
    return route.fulfill({ json: { data: [target], pagination: { total: 1, totalPages: 1, page: 1 } } });
  });
  await context.route(/\/api\/(pages|news|services)\/manage/, route => route.fulfill({ json: { data: [], pagination: { total: 0, totalPages: 0, page: 1 } } }));
  await context.route('**/api/admin/reports/**', route => route.fulfill({ json: { data: [], nextCursor: null } }));
}
test('mock layout is responsive and does not query protected APIs', async ({ page, context }, info) => {
  await setup(page, context);
  const requests: string[] = []; page.on('request', req => { if (/\/api\/(admin|auth\/me|.+\/manage)/.test(req.url())) requests.push(req.url()); });
  await page.setViewportSize({ width: 375, height: 812 }); await page.goto('/admin-preview');
  await expect(page.getByText(/Mock data.*Week 7/)).toBeVisible();
  await expect(page.getByText('128', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('admin-mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: info.outputPath('admin-desktop.png'), fullPage: true });
  expect(requests).toEqual([]);
});
test('editor cannot reach users or reports by navigation or direct tab URL', async ({ page, context }) => {
  await setup(page, context, 'editor', ['content:manage']);
  const requests: string[] = []; page.on('request', req => { if (req.url().includes('/api/admin/')) requests.push(req.url()); });
  await page.goto('/admin?tab=users');
  await expect(page.getByRole('alert')).toContainText('do not have access');
  await expect(page.getByRole('navigation', { name: 'Admin sections' }).getByRole('link', { name: 'Users' })).toHaveCount(0);
  await page.goto('/admin?tab=reports'); await expect(page.getByRole('alert')).toContainText('do not have access');
  expect(requests).toEqual([]);
});
test('unknown or absent permission contract fails closed', async ({ page, context }) => {
  await setup(page, context, 'admin', []); await page.goto('/admin');
  await expect(page.getByRole('alert')).toContainText('no dashboard permissions');
  await expect(page.getByRole('navigation', { name: 'Admin sections' })).toHaveCount(0);
});
test('admin controls hide role assignment and disable self, privileged and inactive targets', async ({ page, context }) => {
  await setup(page, context, 'admin', allPermissions.filter(permission => permission !== 'users:roles'));
  await context.route('**/api/admin/users**', route => route.fulfill({ json: { data: [
    { ...target, id: actor, full_name: 'My account', role: 'admin' },
    { ...target, full_name: 'Privileged account', role: 'super_admin' },
    { ...target, id: 'inactive', full_name: 'Inactive account', deleted_at: '2026-10-01' },
    { ...target, id: 'active', full_name: 'Active citizen' },
  ], pagination: { page: 1, total: 4, totalPages: 1 } } }));
  await page.goto('/admin?tab=users');
  await expect(page.getByRole('button', { name: 'Assign role', exact: true })).toHaveCount(0);
  for (const name of ['My account', 'Privileged account', 'Inactive account']) await expect(page.getByRole('row').filter({ hasText: name }).getByRole('button', { name: 'Deactivate', exact: true })).toBeDisabled();
  await expect(page.getByRole('row').filter({ hasText: 'Active citizen' }).getByRole('button', { name: 'Deactivate', exact: true })).toBeEnabled();
});
test('identity failures do not load live dashboard data and can be retried', async ({ page, context }) => {
  await setup(page, context); let fail = true; let reads = 0;
  await context.route('**/api/auth/me', route => route.fulfill({ status: fail ? 503 : 200, json: { data: { user: { id: actor }, profile: { role: 'admin' }, permissions: ['reports:read'] } } }));
  page.on('request', req => { if (req.url().includes('/api/admin/')) reads++; });
  await page.goto('/admin?tab=reports'); await expect(page.getByRole('alert')).toContainText('unavailable'); expect(reads).toBe(0);
  fail = false; await page.getByRole('button', { name: 'Reload permissions' }).click();
  await expect(page.getByRole('heading', { name: 'Reports', exact: true })).toBeVisible();
  await expect.poll(() => reads).toBe(1);
});
test('users search and filters reach API; role confirmation sends current version', async ({ page, context }) => {
  await setup(page, context); await page.goto('/admin?tab=users');
  await page.getByLabel('Search name or email').fill('Maria');
  const search = page.waitForRequest(req => req.url().includes('q=Maria')); await page.getByRole('button', { name: 'Search users' }).click(); await search;
  await page.getByLabel('Role filter').selectOption('citizen'); await page.getByLabel('Account status').selectOption('all');
  await page.getByRole('button', { name: 'Assign role', exact: true }).click();
  await page.getByLabel('New role').selectOption('editor');
  await context.route('**/api/admin/users/*/role', route => { expect(route.request().postDataJSON()).toEqual({ version: 3, role: 'editor' }); return route.fulfill({ json: { data: { ...target, role: 'editor', version: 4 } } }); });
  await page.getByRole('button', { name: 'Confirm role change' }).click();
  await expect(page.getByText('Role updated. Verification remains unchanged.')).toBeVisible();
});
test('deactivation needs confirmation; conflict requires reload before retry', async ({ page, context }) => {
  await setup(page, context); let mutations = 0;
  await context.route('**/api/admin/users/*/deactivate', route => { mutations++; return route.fulfill({ status: mutations === 1 ? 409 : 200, json: {} }); });
  await context.route(`**/api/admin/users/${target.id}`, route => route.fulfill({ json: { data: { ...target, version: 4 } } }));
  await page.goto('/admin?tab=users'); await page.getByRole('button', { name: 'Deactivate', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click(); expect(mutations).toBe(0);
  await page.getByRole('button', { name: 'Deactivate', exact: true }).click(); await page.getByRole('button', { name: 'Confirm deactivation', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('changed');
  await expect(page.getByRole('button', { name: 'Confirm deactivation', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Reload latest account' }).click();
  const mutation = page.waitForRequest(req => req.method() === 'POST'); await page.getByRole('button', { name: 'Confirm deactivation', exact: true }).click();
  expect((await mutation).postDataJSON()).toEqual({ version: 4 });
  await expect(page.getByText('Account deactivated.', { exact: true })).toBeVisible();
});
for (const kind of ['pages', 'news', 'services'] as const) test(`${kind}: editing is retired even for super admin`, async ({ page, context }) => {
  await setup(page, context);
  const writes: string[] = [];
  page.on('request', request => { if (request.method() !== 'GET' && request.url().includes(`/api/${kind}`)) writes.push(request.url()); });
  await page.goto(`/admin?tab=${kind}`);
  await expect(page.getByRole('alert')).toContainText('do not have access');
  await expect(page.getByRole('button', { name: /Create|Save|Publish|Delete/ })).toHaveCount(0);
  expect(writes).toEqual([]);
});
test('reports expose only retained security activity', async ({ page, context }) => {
  await setup(page, context); await page.goto('/admin?tab=reports');
  await expect(page.getByLabel('Report type').locator('option')).toHaveText(['user-activity']);
});

test('reports validate ranges, preserve cursor precision and clear data on 403', async ({ page, context }) => {
  await setup(page, context); let denied = false;
  const cursor = { before: '2026-10-01T00:00:00.123456+00:00', beforeId: target.id };
  await context.route('**/api/admin/reports/**', route => {
    if (denied) return route.fulfill({ status: 403, json: {} });
    return route.fulfill({ json: { data: [{ id: target.id, amount: '1234.56', currency: 'PHP' }], nextCursor: new URL(route.request().url()).searchParams.has('before') ? null : cursor } });
  });
  await page.goto('/admin?tab=reports'); await expect(page.getByRole('cell', { name: '1234.56' })).toBeVisible();
  await page.getByLabel('From (UTC)', { exact: true }).fill('2026-10-02'); await page.getByLabel('To (UTC, exclusive)', { exact: true }).fill('2026-10-01');
  await page.getByRole('button', { name: 'Apply filters' }).click(); await expect(page.getByRole('alert')).toContainText('after the start');
  const next = page.waitForRequest(req => req.url().includes('beforeId=')); await page.getByRole('button', { name: 'Next report page' }).click();
  expect(new URL((await next).url()).searchParams.get('before')).toBe(cursor.before);
  denied = true; await page.getByRole('button', { name: 'Previous report page' }).click();
  await expect(page.getByRole('alert')).toContainText('Access changed'); await expect(page.getByRole('cell', { name: '1234.56' })).toHaveCount(0);
});
