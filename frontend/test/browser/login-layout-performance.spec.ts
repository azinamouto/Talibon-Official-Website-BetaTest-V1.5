import { expect, test } from '@playwright/test';

for (const width of [375, 1280]) {
  test(`login keeps its reserved layout and accessible controls at ${width}px`, async ({ page, context }, testInfo) => {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1'
      && route.request().method() === 'GET' ? route.continue() : route.abort());
    await context.route('**/api/**', route => route.fulfill({ json: [] }));
    await context.route('**/api/staff/me', route => route.fulfill({ status: 401, json: { message: 'Unauthorized' } }));
    let release!: () => void;
    const ready = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/assets/StaffLogin-*.js', async route => { await ready; await route.continue(); });
    await page.goto('/staff/login', { waitUntil: 'domcontentloaded' });
    let before: { height: number };
    try {
      await expect(page.getByRole('status').filter({ hasText: 'Loading page' })).toBeVisible();
      before = await page.evaluate(() => ({ height: document.querySelector('#main-content')!.getBoundingClientRect().height }));
    } finally { release(); }
    await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
    const after = await page.evaluate(() => ({ height: document.querySelector('#main-content')!.getBoundingClientRect().height,
      overflow: document.documentElement.scrollWidth > innerWidth }));
    expect(before!.height).toBeGreaterThanOrEqual(width === 375 ? 812 : 900);
    expect(after.height).toBeGreaterThanOrEqual(before!.height);
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0);
    await expect(page.getByRole('contentinfo')).toHaveCount(1);
    await expect(page.locator('#main-content footer')).toHaveCount(1);
    expect(after.overflow).toBe(false);
    await testInfo.attach('loading-and-login-geometry', { body: JSON.stringify({ before: before!, after }), contentType: 'application/json' });
    const email = page.getByLabel('Staff email', { exact: true });
    await expect(email).toHaveAttribute('autocomplete', 'username');
    await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('autocomplete', 'current-password');
    await email.focus();
    await expect(email).toHaveCSS('outline-style', 'solid');
    await email.fill('lab@example.invalid');
    await expect(page.getByRole('button', { name: /Forgot (?:your )?password/ })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Request recovery', exact: true })).toHaveCount(0);
    await expect(email).toHaveValue('lab@example.invalid');
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'CMS Administration' })).toHaveCount(0);
  });
}
