import { test, expect, type BrowserContext } from '@playwright/test';

const staff = { id: '11111111-1111-4111-8111-111111111111', role: 'admin' as const };

async function isolate(context: BrowserContext) {
  await context.route('**/api/**', route => route.fulfill({ status: 404, json: {} }));
  await context.route('**/api/admin/media?page=*', route => route.fulfill({ json: { data: [], hasMore: false } }));
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.fallback() : route.abort());
}

test('protected staff URL redirects to staff-only login without a citizen session', async ({ page, context }) => {
  await isolate(context);
  const legacy: string[] = [];
  await context.route('**/api/staff/me', route => route.fulfill({ status: 401, json: { message: 'Unauthorized' } }));
  page.on('request', request => { if (/\/api\/(auth|admin\/users|admin\/reports)/.test(request.url())) legacy.push(request.url()); });
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/staff\/login$/, { timeout: 15000 });
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
  await expect(page.getByRole('link', { name: /sign up|register/i })).toHaveCount(0);
  expect(legacy).toEqual([]);
});

test('staff identity is loaded from the HttpOnly-cookie API and editors see no admin controls', async ({ page, context }) => {
  await isolate(context);
  await context.route('**/api/staff/me', route => route.fulfill({ json: { ...staff, role: 'editor' } }));
  const requests: string[] = [];
  page.on('request', request => { if (/\/api\/staff(?:\?|\/audit)/.test(request.url())) requests.push(request.url()); });
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'CMS Administration' })).toBeVisible();
  await expect(page.getByText('Editor', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Staff management' })).toHaveCount(0);
  expect(requests).toEqual([]);
});

test('password challenge requires an authenticator step before staff access', async ({ page, context }) => {
  await isolate(context);
  let verified = false;
  await context.route('**/api/staff/me', route => route.fulfill(verified
    ? { json: staff } : { status: 401, json: { message: 'Unauthorized' } }));
  await context.route('**/api/staff-auth/sign-in/email', route => route.fulfill({ json: { success: true, mfaRequired: true } }));
  await context.route('**/api/staff-auth/two-factor/verify-totp', async route => {
    expect(route.request().postDataJSON()).toEqual({ code: '123456' });
    verified = true;
    await route.fulfill({ json: { success: true } });
  });
  await context.route('**/api/staff?*', route => route.fulfill({ json: { data: [], pagination: { page: 1, limit: 50, hasMore: false } } }));
  await context.route('**/api/staff/audit?*', route => route.fulfill({ json: { data: [], pagination: { page: 1, limit: 50, hasMore: false } } }));
  await page.goto('/staff/login');
  await page.getByLabel('Staff email').fill('staff@example.test');
  await page.getByLabel('Password', { exact: true }).fill('synthetic-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByLabel('Authenticator code')).toBeVisible();
  await page.getByLabel('Authenticator code').fill('123456');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'CMS Administration' })).toBeVisible();
  expect(await page.evaluate(() => Object.keys(localStorage).filter(key => /auth|token/i.test(key)))).toEqual([]);
});

test('disabled password recovery cannot submit an email or reveal account eligibility', async ({ page, context }) => {
  await isolate(context);
  await context.route('**/api/staff/me', route => route.fulfill({ status: 401, json: { message: 'Unauthorized' } }));
  let recoveryRequests=0;
  await context.route('**/api/staff-auth/request-password-reset', route => { recoveryRequests++; return route.fulfill({status:503,json:{message:'Password recovery is temporarily unavailable.'}}); });
  await page.goto('/staff/login');
  await page.getByLabel('Staff email').fill('staff@example.test');
  const recovery = page.getByRole('button', { name: /Forgot your password/i });
  await expect(recovery).toBeDisabled();
  await expect(recovery).toHaveAttribute('tabindex', '-1');
  await expect(recovery).toHaveAccessibleDescription('Ask your system administrator to reset it.');
  await expect(page.getByRole('button', { name: 'Request recovery' })).toHaveCount(0);
  expect(recoveryRequests).toBe(0);
});

test('sign out clears the in-memory staff identity and returns to login', async ({ page, context }) => {
  await isolate(context);
  let active = true;
  await context.route('**/api/staff/me', route => route.fulfill(active
    ? { json: staff } : { status: 401, json: { message: 'Unauthorized' } }));
  await context.route('**/api/staff-auth/sign-out', async route => {
    active = false;
    await route.fulfill({ json: { success: true } });
  });
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'CMS Administration' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/staff\/login$/);
});

test('public 404 and the legacy auth callback recover to public routes', async ({ page, context }) => {
  await isolate(context);
  await context.route('**/api/staff/me', route => route.fulfill({ status: 401, json: { message: 'Unauthorized' } }));
  await page.goto('/missing-page');
  await expect(page.getByRole('heading', { name: 'Municipal Resource Missing' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Return to Homepage' })).toHaveAttribute('href', '/');
  await page.goto('/auth/callback?error=access_denied');
  await expect(page).toHaveURL(/\/staff\/login$/);
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
});

test('mobile staff login controls are labelled and avoid horizontal overflow', async ({ page, context }) => {
  await isolate(context);
  await context.route('**/api/staff/me', route => route.fulfill({ status: 401, json: { message: 'Unauthorized' } }));
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/staff/login');
  const input = page.getByLabel('Staff email');
  await input.focus();
  expect(await input.evaluate(element => getComputedStyle(element).outlineStyle)).toBe('solid');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
