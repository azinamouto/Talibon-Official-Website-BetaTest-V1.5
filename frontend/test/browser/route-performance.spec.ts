import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await context.route('**/api/**', route => route.fulfill({ json: [] }));
  await context.route('**/api/media?**', route => route.fulfill({ json: { data: [], hasMore: false } }));
  await context.route('**/api/about/profile', route => route.fulfill({ json: { content: 'Synthetic public profile.' } }));
  await context.route('**/api/staff/me', route => route.fulfill({ status: 401, json: { message: 'Unauthorized' } }));
});

test('homepage keeps critical content and avoids secondary page chunks', async ({ page }) => {
  const scripts: string[] = [];
  const errors: string[] = [];
  page.on('request', request => { if (request.resourceType() === 'script') scripts.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#home h1')).toBeVisible();
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.locator('link[rel="stylesheet"][href*="fonts.googleapis.com"]')).toHaveCount(1);
  expect(scripts.filter(url => /(?:StaffPortal|StaffLogin|ProfileView|GadIms|PublicMapCanvas|DownloadsPage)-/.test(url))).toEqual([]);
  await expect(page.locator('#tourism img')).toHaveCount(3);
  for (const image of await page.locator('#tourism img').all()) await expect(image).toHaveAttribute('loading', 'lazy');
  await expect(page.locator('footer img').first()).toHaveAttribute('loading', 'lazy');
  expect(errors).toEqual([]);
});

test('keyboard navigation announces delayed chunks and survives deep-link refresh', async ({ page }) => {
  let release!: () => void;
  const ready = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/assets/ProfileView-*.js', async route => { await ready; await route.continue(); });
  await page.goto('/');
  await page.locator('a[href="/about/profile"]').filter({ visible: true }).first().focus();
  await page.keyboard.press('Enter');
  try {
    await expect(page.getByRole('status').filter({ hasText: 'Loading page' })).toBeVisible();
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();
  } finally { release(); }
  await expect(page.getByRole('article', { name: 'Brief Profile text' })).toContainText('Synthetic public profile.');
  await page.reload();
  await expect(page.getByRole('article', { name: 'Brief Profile text' })).toContainText('Synthetic public profile.');
  await expect(page.locator('#main-content')).toHaveAttribute('tabindex', '-1');
});

test('public redirects and downloads preserve deep links', async ({ page }) => {
  await page.goto('/about');
  await expect(page).toHaveURL(/\/about\/profile$/);
  await expect(page.getByRole('article', { name: 'Brief Profile text' })).toBeVisible();
  await page.goto('/downloads');
  await expect(page.getByText('No downloadable files are currently published.')).toBeVisible();
  await page.reload();
  await expect(page.getByText('No downloadable files are currently published.')).toBeVisible();
});

test('every staff portal alias still rejects anonymous sessions', async ({ page }) => {
  for (const route of ['/admin', '/dashboard', '/cms', '/manage/photos']) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/staff\/login$/);
    await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'CMS Administration' })).toHaveCount(0);
  }
});

for (const role of ['admin', 'editor'] as const) {
  test(`${role} session retains its staff workspace controls`, async ({ page }) => {
    const privilegedReads: string[] = [];
    page.on('request', request => { if (/\/api\/staff(?:\?|\/audit)/.test(request.url())) privilegedReads.push(request.url()); });
    await page.route('**/api/staff/me', route => route.fulfill({ json: { id: 'synthetic-staff', role } }));
    await page.route('**/api/admin/**', route => route.fulfill({ json: { data: [], hasMore: false, pagination: { totalPages: 0 }, categories: [], sources: [] } }));
    await page.route('**/api/staff?**', route => route.fulfill({ json: { data: [], pagination: { hasMore: false } } }));
    await page.route('**/api/staff/audit?**', route => route.fulfill({ json: { data: [], pagination: { hasMore: false } } }));
    await page.goto('/cms');
    await expect(page.getByRole('heading', { name: 'CMS Administration' })).toBeVisible();
    await expect(page.getByText(role === 'admin' ? 'Administrator' : 'Editor', { exact: true })).toBeVisible();
    const navigation = page.getByRole('navigation', { name: 'CMS navigation' });
    await expect(navigation.getByRole('button', { name: 'Photos', exact: true })).toBeVisible();
    await expect(navigation.getByRole('button', { name: 'Documents', exact: true })).toBeVisible();
    await expect(page.getByLabel('Current authenticator code', { exact: true })).toHaveCount(0);
    await expect(navigation.getByRole('button', { name: 'Staff management', exact: true })).toHaveCount(role === 'admin' ? 1 : 0);
    await expect(navigation.getByRole('button', { name: 'Audit logs', exact: true })).toHaveCount(role === 'admin' ? 1 : 0);
    if (role === 'admin') {
      await navigation.getByRole('button', { name: 'Staff management', exact: true }).click();
      await expect(page.getByLabel('Current authenticator code', { exact: true })).toBeVisible();
    }
    if (role === 'editor') expect(privilegedReads).toEqual([]);
  });
}

test('staff initialization failure remains closed and retryable', async ({ page }) => {
  await page.route('**/api/staff/me', route => route.fulfill({ status: 503, json: { message: 'Unavailable' } }));
  await page.goto('/cms');
  await expect(page.getByRole('alert').filter({ hasText: 'Staff authentication is unavailable' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'CMS Administration' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
});

test('failed route chunk uses the existing recoverable error page', async ({ page }) => {
  await page.route('**/assets/ProfileView-*.js', route => route.abort());
  await page.goto('/about/profile');
  await expect(page.getByRole('heading', { name: 'Something went wrong' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reload page' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Go to home page' })).toBeVisible();
  await expect(page.getByRole('banner')).toBeVisible();
});
