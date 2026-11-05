import { test, expect } from '@playwright/test';

for (const width of [375, 1440]) {
  test(`social previews and location at ${width}px`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 1000 });
    await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    await context.route('**/api/**', route => route.fulfill({ json: [] }));
    await context.route('**/data/social-updates.json', route => route.fulfill({ json: {
      updatedAt: '2026-11-04T00:00:00Z',
      posts: [1, 2, 3].map(id => ({ id: String(id), title: `Preview layout fixture ${id}`, date: '2026-11-03T00:00:00Z', url: `https://www.facebook.com/posts/${id}`, image: null })),
    } }));
    await page.goto('/');
    const social = page.locator('#social-updates');
    await social.scrollIntoViewIfNeeded();
    await expect(social.locator('article')).toHaveCount(3);
    await expect(social.locator('iframe')).toHaveCount(0);
    const location = page.locator('#location');
    await location.scrollIntoViewIfNeeded();
    await expect(location.locator('iframe')).toHaveCount(1);
    await expect(location.locator('iframe')).toHaveAttribute('loading', 'eager');
    expect(await location.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    expect(await social.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.screenshot({ path: `test-results/homepage-location-${width}.png`, fullPage: false });
    await social.screenshot({ path: `test-results/homepage-social-${width}.png` });
    await expect(location.getByRole('button', { name: 'Close map' })).toHaveCount(0);
    await expect(location.getByRole('link', { name: /^Get directions/ })).toBeVisible();
  });
}
