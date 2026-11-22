import { test, expect } from '@playwright/test';

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
    expect(await page.locator('#weather').evaluate(el => el.nextElementSibling?.id)).toBe('news-today');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
