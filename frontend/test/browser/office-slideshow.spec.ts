import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page, context }) => {
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await context.route('**/api/**', route => route.fulfill({ json: [] }));
  await page.goto('/');
});

test('office grid supports keyboard navigation through all six office links', async ({ page }) => {
  const cards = page.locator('#offices [data-office-card]');
  await cards.first().focus();
  for (let i = 0; i < 6; i++) {
    await expect(cards.nth(i)).toBeFocused();
    await expect(cards.nth(i)).toHaveCSS('outline-width', '3px');
    await page.keyboard.press('Tab');
  }
  await expect(page.locator('#offices').getByRole('link', { name: 'View all offices and departments' })).toBeFocused();
});

test('office grid supports the existing dark theme', async ({ page }, info) => {
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  const section = page.locator('#offices');
  await section.scrollIntoViewIfNeeded();
  const card = section.locator('[data-office-card]').first();
  expect(await card.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe('rgb(255, 255, 255)');
  await section.screenshot({ path: info.outputPath('offices-dark.png') });
});

test('office cards retain complete uncropped seals', async ({ page }) => {
  const images = page.locator('#offices img');
  await expect(images).toHaveCount(6);
  for (const img of await images.all()) {
    await expect(img).toHaveCSS('object-fit', 'contain');
    await expect(img).toHaveAttribute('loading', 'lazy');
    await expect(img).toHaveAttribute('alt', /Office.*logo|Agriculturist logo/);
  }
});

test('all office names remain unconfirmed', async ({ page }) => {
  await expect(page.locator('#offices [data-office-card]').getByText('N/A', { exact: true })).toHaveCount(6);
  await expect(page.getByRole('region', { name: 'Municipal offices slideshow' })).toHaveCount(0);
});

test('office cards open the existing directory', async ({ page }) => {
  const card = page.locator('#offices [data-office-card]').first();
  await card.click();
  await expect(page).toHaveURL('/executive/directory');
});
