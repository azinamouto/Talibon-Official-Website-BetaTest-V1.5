import { test, expect } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const artifacts = resolve('node_modules/.cache/grouped-barangays');
const baseline = process.env.TALWEB_GROUPS_BASELINE === '1';
for (const width of [360, 768, 1280, 1920]) test(`interactive directory and compact offices at ${width}px`, async ({ page, context }) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await context.route('**/api/**', route => route.fulfill({ json: [] }));
  await page.goto('/');
  await page.addStyleTag({ content: 'html{scroll-behavior:auto!important}header{opacity:0!important}[style*="opacity"]{opacity:1!important}[style*="transform"]{transform:none!important}' });
  mkdirSync(artifacts, { recursive: true });
  for (const id of ['barangays', 'offices']) {
    const section = page.locator(`#${id}`);
    await section.scrollIntoViewIfNeeded();
    const dimensions = await section.boundingBox();
    const before = resolve(artifacts, `before-${id}-${width}.json`);
    if (baseline) writeFileSync(before, JSON.stringify(dimensions));
    else if (id === 'offices' && existsSync(before)) {
      const old = JSON.parse(readFileSync(before, 'utf8'));
      expect(dimensions!.height).toBeLessThan(old.height * .95);
    }
    await section.screenshot({ path: resolve(artifacts, `${baseline ? 'before' : 'after'}-${id}-${width}.png`) });
  }
  if (!baseline) {
    const directory = page.locator('#barangays');
    const choices = directory.getByRole('group', { name: 'Barangays' });
    await expect(choices.getByRole('radio')).toHaveCount(25);
    const details = directory.getByRole('complementary');
    await expect(details.getByRole('heading')).toHaveText('Poblacion');
    await expect(details).toHaveCSS('background-color', 'rgb(255, 255, 255)');

  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
