import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
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

test('authenticated staff cannot reopen disabled workflow UI', async ({ page }) => {
  await page.route('**/api/staff/me', route => route.fulfill({ json: { id: 'test-staff', role: 'admin' } }));
  const requests: string[] = [];
  page.on('request', request => { if (/\/api\/(forms|payments|notifications)/.test(request.url())) requests.push(request.url()); });
  await page.goto('/e-services?view=submissions&track=TAL-test');
  await expect(page.getByRole('heading', { name: 'To Be Implemented' })).toBeVisible();
  await expect(page.locator('main input, main form')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Notification Center/ })).toHaveCount(0);
  expect(requests).toEqual([]);
  expect(await page.evaluate(() => Object.keys(localStorage).filter(key => /auth|token|request|submission|payment/i.test(key)))).toEqual([]);
});
