import { test, expect } from '@playwright/test';

// R1 transaction scenarios now assert retirement for the same entry points.
// Historical schemas and assistant components retain unit/React coverage.
test.beforeEach(async ({ context }) => {
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await context.route('http://127.0.0.1:54321/**', route => route.fulfill({ json: [] }));
  await context.route('**/api/**', route => route.fulfill({ json: [] }));
});
const types = ['Barangay Clearance', 'Certificate of Indigency', 'Business Permit', 'Building Permit', 'Zoning Clearance'];
const routes = [
  '/e-services', ...types.map(type => `/e-services?type=${encodeURIComponent(type)}`),
  '/e-services?view=submissions&page=2', '/e-services?track=TAL-test',
  '/e-services?service=e-cedula', '/e-services/legacy',
  '/forms/business', '/forms/building', '/forms/zoning', '/forms/unknown/deep',
  '/payment/success?status=paid&submission=id&receipt=forged',
  '/payment/cancel?submission=id', '/payment/failure?retry=true',
  '/payment/pending?status=paid', '/payment/unknown/deep',
];
for (const url of routes) test(`R2 entry point cannot submit, track or confirm: ${url}`, async ({ page }) => {
  const transactions: string[] = [];
  page.on('request', request => {
    if (/\/api\/(forms|payments|notifications|auth\/signup)|xendit|\/rest\/v1\/(certificate_requests|payments|form_email_jobs)|\/functions\/v1\/send-status-email/.test(request.url())) transactions.push(request.url());
  });
  await page.goto(url);
  await expect(page.getByRole('heading', { name: 'Electronic Services', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'To Be Implemented', exact: true })).toBeVisible();
  await expect(page.getByText('The Municipality of Talibon is preparing to introduce online services to make government transactions more accessible and convenient.', { exact: true })).toBeVisible();
  await expect(page.getByText('For now, please visit the appropriate municipal office for assistance with applications, permits, and other transactions.', { exact: true })).toBeVisible();
  await expect(page.locator('main form, main input, main select')).toHaveCount(0);
  await expect(page.getByText(/Application submitted|Payment successful|Payment confirmed|Official receipt|Current status:/)).toHaveCount(0);
  expect(transactions).toEqual([]);
  expect(await page.evaluate(() => Object.keys(localStorage).filter(key => /request|submission|payment/i.test(key)))).toEqual([]);
});
for (const width of [375, 1280]) test(`anonymous navigation and placeholder fit at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 850 });
  await page.goto('/');
  await page.locator('a[href="/e-services"]').filter({ visible: true }).first().click();
  await expect(page).toHaveURL(/\/e-services$/);
  await expect(page.getByRole('heading', { name: 'To Be Implemented', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem('sb-127-auth-token'))).toBeNull();
  await page.screenshot({ path: `test-results-eservices/r2-placeholder-${width}.png`, fullPage: true });
});
test('registration controls are absent while staff login and recovery remain', async ({ page }) => {
  await page.goto('/login?view=register');
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create account' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Forgot password?' }).click();
  await expect(page.getByRole('heading', { name: 'Reset your password', exact: true })).toBeVisible();
});
