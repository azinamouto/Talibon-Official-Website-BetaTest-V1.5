import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await context.route('http://127.0.0.1:54321/**', route => route.fulfill({ json: [] }));
  await context.route('**/api/**', route => route.fulfill({ json: [] }));
});

test('mobile direct links remain informational', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const path of ['/forms/business', '/forms/building', '/forms/zoning', '/forms/arbitrary/nested', '/payment/success?paid=true']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: 'To Be Implemented' })).toBeVisible();
    await expect(page.locator('main input, main form')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('home shortcuts no longer advertise applications, tracking or payment', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: /Pay Online|Track My Request|Apply for Permit|Access FiliPizen/ })).toHaveCount(0);
  await page.locator('a[href="/e-services"]').filter({ visible: true }).first().focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Electronic Services', exact: true })).toBeVisible();
  await expect(page.getByRole('banner')).toBeVisible();
});

for (const role of ['citizen', 'admin', 'editor']) test(`${role} persisted session cannot reopen workflow UI`, async ({ page, context }) => {
  const user = { id: '11111111-1111-4111-8111-111111111111', email: 'test@example.test', role: 'authenticated', aud: 'authenticated', app_metadata: {}, user_metadata: {} };
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const session = { user, access_token: `h.${Buffer.from(JSON.stringify({ sub: user.id, exp, role })).toString('base64url')}.s`, refresh_token: 'synthetic', expires_at: exp, expires_in: 3600, token_type: 'bearer' };
  await page.addInitScript(value => localStorage.setItem('sb-127-auth-token', JSON.stringify(value)), session);
  await context.route('http://127.0.0.1:54321/**', route => route.fulfill({ json: route.request().url().includes('/profiles') ? { ...user, role, is_verified: true, is_active: true } : route.request().url().includes('/auth/v1/user') ? user : [] }));
  const requests: string[] = [];
  page.on('request', request => { if (/\/api\/(forms|payments|notifications)|\/rest\/v1\/notifications|\/realtime\//.test(request.url())) requests.push(request.url()); });
  await page.goto('/e-services?view=submissions&track=TAL-test');
  await expect(page.getByRole('heading', { name: 'To Be Implemented' })).toBeVisible();
  await expect(page.locator('main input, main form')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Notification Center/ })).toHaveCount(0);
  expect(requests).toEqual([]);
});
