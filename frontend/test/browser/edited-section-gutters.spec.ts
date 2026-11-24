import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const barangays = JSON.parse(readFileSync('test/fixtures/barangay-profiles.json', 'utf8'));
const contentSelectors = [
  '#about .mayor-content',
  '#services .dg-inner',
  '#charter > [class*="container_"]',
  '#barangays > [class*="container_"]',
  '#offices > .site-container',
  '#tourism > .site-container',
  '#transparency > .site-container',
  '#connect-talibon > .site-container',
];

for (const width of [375, 768, 769, 1280, 1920]) {
  test(`edited sections share the site gutters at ${width}px`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    await context.route('**/api/**', route => route.fulfill({ json: route.request().url().includes('/about/barangays') ? barangays : [] }));
    await page.goto('/');
    const gutter = width <= 768 ? 16 : 24;
    for (const selector of contentSelectors) {
      const content = page.locator(selector);
      await expect(content, selector).toHaveCount(1);
      const bounds = await content.evaluate(el => {
        const box = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return { left: box.left + parseFloat(style.paddingLeft), right: innerWidth - box.right + parseFloat(style.paddingRight) };
      });
      expect(bounds.left, `${selector} left gutter`).toBeCloseTo(gutter, 1);
      expect(bounds.right, `${selector} right gutter`).toBeCloseTo(gutter, 1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByRole('complementary', { name: 'Weather & tides' })).toHaveCount(1);
    await page.goto('/about/barangays');
    await expect(page.getByRole('heading', { name: 'Barangay profiles', exact: true })).toBeVisible();
    const directoryBounds = await page.locator('main > .site-container').evaluate(el => {
      const box = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return { left: box.left + parseFloat(style.paddingLeft), right: innerWidth - box.right + parseFloat(style.paddingRight) };
    });
    expect(directoryBounds.left).toBeCloseTo(gutter, 1);
    expect(directoryBounds.right).toBeCloseTo(gutter, 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
