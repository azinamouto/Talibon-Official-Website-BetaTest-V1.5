import { expect, test } from '@playwright/test';
for (const width of [1440, 768, 375]) test(`visible page chips and quiet barangay selection at ${width}px`, async ({ page, context }, info) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await context.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
  await context.route('**/api/**', r => r.fulfill({ json: [] }));
  await context.route('**/data/social-updates.json', r => r.fulfill({ json: { posts: [] } }));
  await page.goto('/');
  const pages = page.getByRole('navigation', { name: 'More Talibon pages' });
  await expect(pages.getByRole('listitem')).toHaveCount(6);
  await expect(pages.getByRole('link')).toHaveCount(7);
  for (const link of await pages.getByRole('link').all()) {
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', 'https://www.facebook.com/TalibonOfficialPage');
    if (width <= 768) expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await link.focus();
    await expect(link).toHaveCSS('outline-width', '3px');
  }
  const section = page.locator('#barangays');
  await section.scrollIntoViewIfNeeded();
  const tab = section.getByRole('radio', { name: 'All', exact: true }).locator('..').locator('span').first();
  const chip = section.getByRole('radio', { name: 'Poblacion', exact: true }).locator('..').locator('span').first();
  const primary = section.getByRole('link', { name: 'View barangay page' });
  const solid = await primary.evaluate(el => getComputedStyle(el).backgroundColor);
  expect(await tab.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe(solid);
  expect(await chip.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe(solid);
  expect(await chip.locator('svg').evaluate(el => getComputedStyle(el).color)).toBe(await chip.evaluate(el => getComputedStyle(el).color));
  const pill = section.locator('[class*="location_"]');
  expect(await pill.evaluate(el => !!el.parentElement?.querySelector('#selected-barangay-heading'))).toBe(true);
  expect(await pill.evaluate(el => getComputedStyle(el).position)).toBe('static');
  await section.getByRole('radio', { name: 'Busalian', exact: true }).check({ force: true });
  await expect(section.getByRole('heading', { name: 'Busalian', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await section.screenshot({ path: info.outputPath(`barangays-${width}.png`), style: 'header{visibility:hidden!important}' });
});
