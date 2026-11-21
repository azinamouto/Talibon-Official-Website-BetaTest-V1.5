import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  // Keep UI verification independent of live authentication and recovery systems.
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await context.route('**/api/**', route => route.fulfill({ status: 404, json: { message: 'Unmocked test request' } }));
  await context.route('**/api/staff/me', route => route.fulfill({ status: 401, json: { message: 'Unauthorized' } }));
});

for (const viewport of [
  { path: '/staff/login', width: 1440, height: 900 },
  { path: '/staff/login', width: 768, height: 1024 },
  { path: '/staff/login', width: 375, height: 812 },
  { path: '/staff/login', width: 320, height: 568 },
  { path: '/login', width: 1440, height: 900 },
]) {
  test(`${viewport.path} has a dedicated, accessible layout at ${viewport.width}px`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    await page.goto(viewport.path, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Welcome back.', exact: true })).toBeVisible();
    await expect(page.getByRole('banner')).toHaveCount(1);
    await expect(page.getByRole('contentinfo')).toHaveCount(1);
    await expect(page.locator('footer#contact')).toHaveCount(0);
    await expect(page.locator('a[href="/"]')).toHaveAttribute('href', '/');
    if (viewport.width >= 520 && viewport.width <= 1100) await expect(page.locator('a[href="/"]')).toBeHidden();
    else await expect(page.getByRole('link', { name: 'Back to public website' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Privacy policy', exact: true })).toHaveAttribute('href', '/privacy-policy');
    const seal = page.getByRole('img', { name: 'Official seal of the Municipality of Talibon' });
    await expect.poll(() => seal.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);

    for (const control of [page.getByLabel('Staff email'), page.getByLabel('Password', { exact: true }),
      page.getByRole('button', { name: 'Show password' }), page.getByRole('button', { name: 'Sign in', exact: true })]) {
      const bounds = await control.boundingBox();
      expect(bounds!.height).toBeGreaterThanOrEqual(44);
      expect(bounds!.width).toBeGreaterThanOrEqual(44);
    }
    await expect(page.getByLabel('Staff email')).toHaveAttribute('autocomplete', 'username');
    await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('autocomplete', 'current-password');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`staff-login-${viewport.width}.png`), fullPage: true });
  });
}

test('keyboard users can reveal and conceal a password without submitting or losing its value', async ({ page }) => {
  const signIns: unknown[] = [];
  page.on('request', request => { if (request.url().endsWith('/api/staff-auth/sign-in/email')) signIns.push(request.postDataJSON()); });
  await page.goto('/staff/login', { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: 'Back to public website' }).focus();
  await page.keyboard.press('Tab');
  const email = page.getByLabel('Staff email');
  await expect(email).toBeFocused();
  expect(await email.evaluate(element => getComputedStyle(element).outlineColor)).toBe('rgb(29, 78, 216)');
  await page.keyboard.type('staff@example.test');
  await page.keyboard.press('Tab');
  const password = page.getByLabel('Password', { exact: true });
  await expect(password).toBeFocused();
  await page.keyboard.type('synthetic-password');
  await page.keyboard.press('Tab');
  const toggle = page.getByRole('button', { name: 'Show password' });
  await expect(toggle).toBeFocused();
  expect(await toggle.evaluate(element => getComputedStyle(element).outlineStyle)).toBe('solid');
  await page.keyboard.press('Space');
  await expect(password).toHaveAttribute('type', 'text');
  await expect(page.getByRole('button', { name: 'Hide password' })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Space');
  await expect(password).toHaveAttribute('type', 'password');
  await expect(password).toHaveValue('synthetic-password');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Privacy policy', exact: true })).toBeFocused();
  await expect(page.getByRole('button', { name: /Forgot (?:your )?password/ })).toBeDisabled();
  expect(signIns).toEqual([]);
  await expect(password).toHaveValue('synthetic-password');
  await expect(password).toHaveAttribute('type', 'password');
});

test('required fields and email validation prevent invalid authentication requests', async ({ page }) => {
  const signIns: string[] = [];
  page.on('request', request => { if (request.url().endsWith('/api/staff-auth/sign-in/email')) signIns.push(request.url()); });
  await page.goto('/staff/login', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByLabel('Staff email')).toBeFocused();
  expect(await page.getByLabel('Staff email').evaluate(input => (input as HTMLInputElement).validity.valueMissing)).toBe(true);
  await page.getByLabel('Staff email').fill('invalid-address');
  await page.getByLabel('Password', { exact: true }).fill('synthetic-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  expect(await page.getByLabel('Staff email').evaluate(input => (input as HTMLInputElement).validity.typeMismatch)).toBe(true);
  expect(signIns).toEqual([]);
});

test('pending authentication disables form actions and exposes the existing failure feedback', async ({ page, context }) => {
  let finish!: () => void;
  const pending = new Promise<void>(resolve => { finish = resolve; });
  const signIns: unknown[] = [];
  await context.route('**/api/staff-auth/sign-in/email', async route => {
    signIns.push(route.request().postDataJSON());
    await pending;
    await route.fulfill({ status: 401, json: { message: 'Unauthorized' } });
  });
  await page.goto('/staff/login', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Staff email').fill('staff@example.test');
  await page.getByLabel('Password', { exact: true }).fill('synthetic-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Signing in', exact: true })).toBeDisabled();
  await expect(page.getByRole('form')).toHaveAttribute('aria-busy', 'true');
  await expect(page.getByLabel('Staff email')).toBeDisabled();
  await expect(page.getByLabel('Password', { exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Show password' })).toBeDisabled();
  await expect(page.getByRole('button', { name: /Forgot (?:your )?password/ })).toBeDisabled();
  finish();
  await expect(page.getByRole('alert')).toHaveText('Sign in and complete MFA to continue.');
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeEnabled();
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('synthetic-password');
  expect(signIns).toEqual([{ email: 'staff@example.test', password: 'synthetic-password' }]);
  await expect(page.getByRole('button', { name: /Forgot (?:your )?password/ })).toBeDisabled();
  await expect(page.getByRole('alert')).toBeVisible();
});

test('authenticator enrollment displays the unchanged setup key and recovery codes', async ({ page, context }, info) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await context.route('**/api/staff-auth/sign-in/email', route => route.fulfill({ json: { mfaRequired: false } }));
  await context.route('**/api/staff-auth/two-factor/enable', route => {
    expect(route.request().postDataJSON()).toEqual({ password: 'synthetic-password' });
    return route.fulfill({ json: { totpURI: 'otpauth://totp/Test?secret=SYNTHETICSETUPKEY', backupCodes: ['recovery-one', 'recovery-two'] } });
  });
  await page.goto('/staff/login', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Staff email').fill('staff@example.test');
  await page.getByLabel('Password', { exact: true }).fill('synthetic-password');
  await page.getByRole('button', { name: 'Show password' }).click();
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'password');
  await page.getByLabel('Password', { exact: true }).fill('synthetic-password');
  await page.getByRole('button', { name: 'Set up MFA', exact: true }).click();
  const setup = page.getByRole('region', { name: 'Set up your authenticator' });
  await expect(setup).toContainText('SYNTHETICSETUPKEY');
  await expect(setup.getByRole('listitem')).toHaveText(['recovery-one', 'recovery-two']);
  await expect(page.getByLabel('Authenticator code')).toHaveAttribute('inputmode', 'numeric');
  await expect(page.getByRole('button', { name: 'Use recovery code', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('staff-authenticator-setup-mobile.png'), fullPage: true });
});

test('recovery-code sign in preserves verification and the final staff redirect', async ({ page, context }) => {
  let verified = false;
  await context.route('**/api/staff/me', route => route.fulfill(verified
    ? { json: { id: '11111111-1111-4111-8111-111111111111', role: 'editor' } }
    : { status: 401, json: { message: 'Unauthorized' } }));
  await context.route('**/api/staff-auth/sign-in/email', route => route.fulfill({ json: { mfaRequired: true } }));
  await context.route('**/api/staff-auth/two-factor/verify-backup-code', route => {
    expect(route.request().postDataJSON()).toEqual({ code: 'synthetic-recovery-code' });
    verified = true;
    return route.fulfill({ json: { success: true } });
  });
  await page.goto('/staff/login', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Staff email').fill('staff@example.test');
  await page.getByLabel('Password', { exact: true }).fill('synthetic-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/staff\/login$/);
  await expect(page.getByRole('heading', { name: 'Verify your identity' })).toBeFocused();
  await page.getByRole('button', { name: 'Use recovery code', exact: true }).click();
  await page.getByLabel('Recovery code', { exact: true }).fill('synthetic-recovery-code');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('heading', { name: 'CMS Administration' })).toBeVisible();
});
