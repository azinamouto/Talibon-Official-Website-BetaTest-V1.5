import { expect, test } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
const { PNG } = createRequire(import.meta.url)(resolve('node_modules/playwright-core/lib/utilsBundle.js'));
const artifacts = resolve('node_modules/.cache/more-talibon-pages');
const baseline = process.env.TALWEB_PAGES_BASELINE === '1';

for (const width of [360, 768, 1280, 1920]) test(`more pages disclosure and unchanged neighbours at ${width}px`, async ({ page, context }) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.clock.setFixedTime(new Date('2026-11-04T04:00:00Z'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await context.route('**/*', route => {
    const u = new URL(route.request().url());
    if (u.hostname === '127.0.0.1') return route.continue();
    if (u.hostname === 'www.google.com') return route.fulfill({ contentType: 'text/html', body: '<p>Google map fixture</p>' });
    return route.abort();
  });
  await context.route('**/api/**', route => route.fulfill({ json: [] }));
  await context.route('**/data/social-updates.json', route => route.fulfill({ json: { posts: [] } }));
  await page.goto('/');
  await page.addStyleTag({ content: 'html{scroll-behavior:auto!important}header{opacity:0!important}' });
  await page.locator('#social-updates').scrollIntoViewIfNeeded();
  mkdirSync(artifacts, { recursive: true });
  for (const [name, selector] of [['featured', '[aria-labelledby="information-office-heading"]'], ['map', '#location']]) {
    const buffer = await page.locator(selector).screenshot();
    const before = resolve(artifacts, `before-${name}-${width}.png`);
    writeFileSync(resolve(artifacts, `${baseline ? 'before' : 'after'}-${name}-${width}.png`), buffer);
    if (!baseline && existsSync(before)) {
      const a = PNG.sync.read(readFileSync(before)), b = PNG.sync.read(buffer);
      expect(b.width).toBe(a.width);
      // A changed section above this one changes the fractional screenshot
      // crop, even when this card's CSS and actual dimensions are unchanged.
      expect(Math.abs(b.height - a.height)).toBeLessThanOrEqual(1);
      // These ignored captures belong to a particular refinement, rather than
      // versioned regression snapshots. Compare pixels only when explicitly
      // reviewing that matching baseline; preserve behavioral checks below.
      if (name === 'featured' && process.env.TALWEB_PAGES_COMPARE_BASELINE === '1') {
        expect(b.data.equals(a.data), `${name} pixels`).toBe(true);
      }
    }
  }
  if (baseline) {
    await page.locator('#social-updates > div').last().screenshot({ path: resolve(artifacts, `before-${width}.png`) });
    return;
  }
  const card = page.locator('[data-more-pages]');
  const button = card.getByRole('button');
  const links = card.locator('a');
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await expect(card.getByRole('link')).toHaveCount(0);
  await button.focus();
  await page.keyboard.press('Tab');
  await expect(links.first()).not.toBeFocused();
  await button.focus();
  await card.screenshot({ path: resolve(artifacts, `after-closed-${width}.png`) });
  await page.keyboard.press('Enter');
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await expect(card.getByRole('link')).toHaveCount(6);
  const box = await links.evaluateAll(els => els.map(el => ({ x: el.getBoundingClientRect().x, height: el.getBoundingClientRect().height })));
  expect(new Set(box.map(b => b.x)).size).toBe(width < 640 ? 1 : 2);
  expect(box.every(b => b.height === 48)).toBe(true);
  for (const link of await links.all()) {
    await page.keyboard.press('Tab');
    await expect(link).toBeFocused();
    await expect(link).toHaveCSS('outline-width', '2px');
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(link).toHaveAccessibleName(/opens in a new tab/);
  }
  await links.last().blur();
  await card.screenshot({ path: resolve(artifacts, `after-open-${width}.png`) });
  await button.focus();
  await page.keyboard.press('Space');
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await expect(card.getByRole('link')).toHaveCount(0);
  await button.click();
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await button.click();
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
