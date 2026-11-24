import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';

test.beforeEach(async ({ context }) => {
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await context.route('**/api/**', route => route.fulfill({ json: [] }));
});

for (const width of [360, 768, 1280, 1920]) {
  test(`homepage omits the quick access section at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await expect(page.getByRole('region', { name: 'What do you need today?' })).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: 'What do you need today?' })).toHaveCount(0);
    const weather = page.getByRole('complementary', { name: 'Weather & tides' });
    await expect(weather).toHaveCount(1);
    expect(await weather.evaluate(el => el.closest('section')?.id)).toBe('tourism');
    await expect(weather.getByRole('link', { name: 'View public advisories' })).toHaveAttribute('href', '/news/advisories');
    await expect(page.getByText('LIVE WEATHER DATA', { exact: true })).toHaveCount(0);
    await weather.scrollIntoViewIfNeeded();
    await expect(weather).toBeVisible();
    const row = weather.locator('../..');
    const image = row.getByRole('img', { name: 'Sandbars', exact: true });
    const copy = row.locator('[class*="destinationCopy_"]');
    const panelBounds = await weather.boundingBox();
    const imageBounds = await image.boundingBox();
    const copyBounds = await copy.boundingBox();
    if (width >= 1200) {
      expect(panelBounds!.x).toBeGreaterThanOrEqual(copyBounds!.x + copyBounds!.width);
      expect(imageBounds!.x).toBeLessThan(copyBounds!.x);
      expect(panelBounds!.width).toBeLessThanOrEqual(360);
    } else {
      expect(panelBounds!.y).toBeGreaterThanOrEqual(copyBounds!.y + copyBounds!.height);
    }
    const advisories = weather.getByRole('link', { name: 'View public advisories' });
    await advisories.focus();
    await expect(advisories).toHaveCSS('outline-width', '3px');
    await advisories.blur();
    mkdirSync('node_modules/.cache/sandbar-weather-review', { recursive: true });
    await row.screenshot({ path: `node_modules/.cache/sandbar-weather-review/after-${width}.png`, animations: 'disabled' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
