import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await context.route('**/api/**', route => route.fulfill({ status: 404, json: { message: 'Unmocked test request' } }));
  await context.route('**/api/staff/me', route => route.fulfill({ status: 401, json: { message: 'Unauthorized' } }));
});

test('password reset keeps fragment handling, the minimum length, and the reset payload', async ({ page, context }) => {
  const resets: unknown[] = [];
  await context.route('**/api/staff-auth/reset-password', route => {
    resets.push(route.request().postDataJSON());
    return route.fulfill({ json: { success: true } });
  });
  await page.goto('/staff/login#token=synthetic-reset-token', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/staff\/login$/);
  const password = page.getByLabel('New password', { exact: true });
  await expect(password).toHaveAttribute('minlength', '14');
  await expect(password).toHaveAttribute('autocomplete', 'new-password');
  await expect(password).toHaveAccessibleDescription('Use at least 14 characters.');
  await password.fill('short');
  await page.getByRole('button', { name: 'Reset password', exact: true }).click();
  expect(resets).toEqual([]);
  await password.fill('synthetic-new-passphrase');
  await page.getByRole('button', { name: 'Show password' }).click();
  await page.getByRole('button', { name: 'Reset password', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Password reset. Sign in and complete MFA.');
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'password');
  expect(resets).toEqual([{ token: 'synthetic-reset-token', newPassword: 'synthetic-new-passphrase' }]);
});

test('explicit recovery opt-in retains the non-enumerating request flow', async ({ page, context }) => {
  let requests = 0;
  await context.route('**/api/staff-auth/request-password-reset', route => { requests++; return route.fulfill({ json: { success: true } }); });
  await page.goto('/staff/login', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Forgot password?', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeFocused();
  await page.getByLabel('Staff email').fill('synthetic@example.invalid');
  await page.getByRole('button', { name: 'Request recovery', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('If the account is eligible, recovery instructions will be sent.');
  expect(requests).toBe(1);
});
