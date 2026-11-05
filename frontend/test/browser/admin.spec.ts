import { test, expect, type BrowserContext, type Page } from '@playwright/test';

const admin = { id: '11111111-1111-4111-8111-111111111111', role: 'admin' as const };
const target = { id: '22222222-2222-4222-8222-222222222222', email: 'editor@example.test', role: 'editor' as const, active: true, version: 3 };
const events = [{ id: 'event-1', source: 'authentication', action: 'mfa.success', actorId: null,
  subjectId: target.id, occurredAt: '2026-11-02T00:00:00.000Z' }];

async function isolate(context: BrowserContext) {
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await context.route('**/api/admin/media?page=*', route => route.fulfill({ json: { data: [], hasMore: false } }));
  await context.route('**/api/admin/media/options', route => route.fulfill({ json: { categories: [], sources: [] } }));
}

async function staffSession(context: BrowserContext, role: 'admin' | 'editor') {
  await context.route('**/api/staff/me', route => route.fulfill({ json: { id: admin.id, role } }));
  await context.route('**/api/staff?*', route => route.fulfill({ json: {
    data: role === 'admin' ? [target] : [], pagination: { page: 1, limit: 50, hasMore: false },
  } }));
  await context.route('**/api/staff/audit?*', route => route.fulfill({ json: {
    data: role === 'admin' ? events : [], pagination: { page: 1, limit: 50, hasMore: false },
  } }));
}

test('R2 staff portal remains responsive with authorized records', async ({ page, context }, info) => {
  await isolate(context);
  await staffSession(context, 'admin');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Staff workspace' })).toBeVisible();
  await expect(page.getByText('editor@example.test')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('admin-mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: info.outputPath('admin-desktop.png'), fullPage: true });
  await expect(page.getByRole('heading', { name: 'Staff audit' })).toBeVisible();
});

test('staff portal redirects unauthenticated visitors to staff-only sign in', async ({ page, context }) => {
  await isolate(context);
  await context.route('**/api/staff/me', route => route.fulfill({ status: 401, json: { message: 'Unauthorized' } }));
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/staff\/login$/);
  await expect(page.getByRole('heading', { name: 'Staff sign in' })).toBeVisible();
  await expect(page.getByLabel('Staff email')).toBeVisible();
  await expect(page.getByRole('link', { name: /sign up|register/i })).toHaveCount(0);
});

test('staff sign in requires MFA before opening the portal and stores no browser token', async ({ page, context }) => {
  await isolate(context);
  let verified = false;
  await context.route('**/api/staff/me', route => route.fulfill(verified
    ? { json: admin } : { status: 401, json: { message: 'Unauthorized' } }));
  await context.route('**/api/staff-auth/sign-in/email', route => route.fulfill({ json: { success: true, mfaRequired: true } }));
  await context.route('**/api/staff-auth/two-factor/verify-totp', async route => {
    expect(route.request().postDataJSON()).toEqual({ code: '123456' });
    verified = true;
    await route.fulfill({ json: { success: true } });
  });
  await context.route('**/api/staff?*', route => route.fulfill({ json: { data: [], pagination: { page: 1, limit: 50, hasMore: false } } }));
  await context.route('**/api/staff/audit?*', route => route.fulfill({ json: { data: [], pagination: { page: 1, limit: 50, hasMore: false } } }));
  const legacyRequests: string[] = [];
  page.on('request', request => { if (/\/api\/(auth|admin\/users|admin\/reports)/.test(request.url())) legacyRequests.push(request.url()); });
  await page.goto('/staff/login');
  await page.getByLabel('Staff email').fill('admin@example.test');
  await page.getByLabel('Password').fill('synthetic-password');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByLabel('Authenticator code')).toBeVisible();
  await page.getByLabel('Authenticator code').fill('123456');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Staff workspace' })).toBeVisible();
  expect(await page.evaluate(() => Object.keys(localStorage).filter(key => /auth|token/i.test(key)))).toEqual([]);
  expect(legacyRequests).toEqual([]);
});

test('admin can perform a versioned role change only after entering a fresh MFA code', async ({ page, context }) => {
  await isolate(context);
  await staffSession(context, 'admin');
  let role = 'editor';
  await context.route('**/api/staff?*', route => route.fulfill({ json: {
    data: [{ ...target, role }], pagination: { page: 1, limit: 50, hasMore: false },
  } }));
  await page.goto('/admin');
  await expect(page.getByText('editor@example.test')).toBeVisible();
  await page.getByRole('button', { name: 'Make admin' }).click();
  await expect(page.getByRole('status')).toContainText('Enter a current authenticator code');
  await page.getByLabel('Current authenticator code').fill('654321');
  await context.route('**/api/staff-auth/two-factor/verify-totp', route => {
    expect(route.request().postDataJSON()).toEqual({ code: '654321' });
    return route.fulfill({ json: { success: true } });
  });
  await context.route(`**/api/staff/${target.id}/role`, route => {
    expect(route.request().postDataJSON()).toEqual({ version: 3, role: 'admin' });
    role = 'admin';
    return route.fulfill({ json: { success: true } });
  });
  await page.getByRole('button', { name: 'Make admin' }).click();
  await expect(page.getByRole('status')).toContainText('Staff access action completed');
  await expect(page.getByText('admin · Active')).toBeVisible();
});

test('editors cannot view staff administration or audit', async ({ page, context }) => {
  await isolate(context);
  await staffSession(context, 'editor');
  const adminRequests: string[] = [];
  page.on('request', request => { if (/\/api\/staff(?:\?|\/audit)/.test(request.url())) adminRequests.push(request.url()); });
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Staff workspace' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Staff access' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Staff audit' })).toHaveCount(0);
  expect(adminRequests).toEqual([]);
});
