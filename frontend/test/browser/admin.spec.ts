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
  await expect(page.getByText('Mock data — Week 7', { exact: false })).toBeVisible();
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
for (const kind of ['pages', 'news', 'services'] as const) test(`${kind}: create, publish, edit and delete`, async ({ page, context }) => {
  await setup(page, context); let record: Record<string, unknown> | null = null;
  await context.route(`**/api/${kind}/manage*`, route => route.fulfill({ json: { data: record ? [record] : [], pagination: { page: 1, total: record ? 1 : 0, totalPages: 1 } } }));
  await context.route(new RegExp(`/api/${kind}(?:/${target.id})?$`), route => {
    if (route.request().method() === 'DELETE') { record = null; return route.fulfill({ status: 204 }); }
    record = { ...record, id: target.id, ...route.request().postDataJSON() }; return route.fulfill({ json: { data: record } });
  });
  await page.goto(`/admin?tab=${kind}`); await page.getByRole('button', { name: `Create ${kind}` }).click();
  await page.getByLabel(kind === 'services' ? 'Service name' : 'Title', { exact: true }).fill('Test entry');
  await page.getByLabel('Slug', { exact: false }).fill('test-entry');
  await page.getByLabel(kind === 'services' ? 'Description' : 'Content', { exact: true }).fill('Municipal information.');
  if (kind === 'news') await page.getByLabel('Summary').fill('Summary.');
  if (kind === 'services') await page.getByLabel('Responsible department ID', { exact: false }).fill('mayor');
  await page.getByRole('button', { name: 'Save and publish' }).click(); await expect(page.getByText('Content saved.', { exact: true })).toBeVisible();
  expect(record!['status']).toBe(kind === 'services' ? 'available' : 'published');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel(kind === 'services' ? 'Service name' : 'Title', { exact: true }).fill('Updated entry');
  await page.getByRole('button', { name: 'Save', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Updated entry' })).toBeVisible();
  await page.getByRole('button', { name: 'Delete', exact: true }).click(); await page.getByRole('button', { name: 'Confirm deletion' }).click();
  await expect(page.getByText('Content deleted.', { exact: true })).toBeVisible(); expect(record).toBeNull();
});
test('CMS rejects blank text, retains drafts after failures and blocks browser Back', async ({ page, context }) => {
  await setup(page, context); await page.goto('/admin');
  await page.getByRole('navigation', { name: 'Admin sections' }).getByRole('link', { name: 'Pages', exact: true }).click();
  await page.getByRole('button', { name: 'Create pages' }).click();
  await page.getByLabel('Title', { exact: true }).fill('   '); await page.getByLabel('Slug', { exact: false }).fill('draft'); await page.getByLabel('Content', { exact: true }).fill('Body');
  await page.getByRole('button', { name: 'Save', exact: true }).click(); await expect(page.getByRole('dialog').getByRole('alert')).toContainText('non-blank');
  await page.getByLabel('Title', { exact: true }).fill('My draft');
  await context.route('**/api/pages', route => route.fulfill({ status: 503, json: {} }));
  await page.getByRole('button', { name: 'Save', exact: true }).click(); await expect(page.getByRole('dialog').getByRole('alert')).toContainText('unavailable');
  page.once('dialog', dialog => dialog.dismiss()); await page.goBack();
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('My draft');
  page.once('dialog', dialog => dialog.dismiss()); await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: 'Cancel', exact: true }).click(); await expect(page.getByRole('dialog')).toHaveCount(0);
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
