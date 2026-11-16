import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await context.route('**/api/staff/me', route => route.fulfill({ status: 401, json: { message: 'Unauthorized' } }));
});

for (const path of ['/staff/login', '/login']) test(`disabled recovery at ${path} discards fragments and makes no recovery request`, async ({ page }) => {
  const recoveryRequests: string[] = [];
  page.on('request', request => { if (/\/api\/staff-auth\/(request-password-reset|reset-password)/.test(request.url())) recoveryRequests.push(request.url()); });
  await page.goto(`${path}#token=synthetic-expired-token`, { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(new RegExp(`${path}$`));
  const recovery = page.getByRole('button', { name: 'Forgot password? (temporarily unavailable)', exact: true });
  await expect(recovery).toBeDisabled();
  await expect(recovery).toHaveAttribute('tabindex', '-1');
  await expect(recovery).toHaveAccessibleDescription('Password recovery is temporarily unavailable.');
  await expect(page.getByLabel('New password', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Request recovery', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Sign in', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Privacy policy', exact: true })).toBeFocused();
  expect(recoveryRequests).toEqual([]);
});
