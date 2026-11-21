import { expect, test } from '@playwright/test';

const people = ['Hon. Michael I. Doria', 'Elmer B. Magalona', 'Juliet D. Lumbo-an', 'Rogelia L. Cellan'];
for (const width of [360, 768, 1024, 1280, 1920, 2560]) test(`municipal cards preserve order, links and page gutters at ${width}px`, async ({ page, context }, info) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await context.route('**/api/**', route => route.fulfill({ json: [] }));
  await page.goto('/');
  const section = page.locator('#offices');
  await section.scrollIntoViewIfNeeded();
  await expect(section.getByRole('heading', { level: 2 })).toHaveText('Municipal offices and departments');
  const cards = section.locator('[aria-roledescription="slide"]:not([inert]) [data-office-card]');
  const columns = width >= 1024 ? 4 : width >= 640 ? 2 : 1;
  await expect(cards).toHaveCount(columns);
  for (let i = 0; i < columns; i++) {
    await expect(cards.nth(i)).toContainText(people[i]);
    await expect(cards.nth(i)).toHaveAttribute('href', '/executive/directory');
    await expect(cards.nth(i)).toHaveCSS('background-image', 'none');
    await expect(cards.nth(i)).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  }
  const gutter = width < 520 ? 16 : width < 780 ? 24 : 32;
  const first = (await cards.first().boundingBox())!, last = (await cards.last().boundingBox())!;
  const source = (await page.locator('#barangays [class*="source_"]').boundingBox())!;
  expect(Math.abs(first.x - source.x)).toBeLessThan(1);
  expect(Math.abs(first.x - gutter)).toBeLessThan(1);
  if (width < 520) expect(first.width / (width - gutter * 2)).toBeCloseTo(.86, 2);
  else expect(Math.abs(last.x + last.width - (width - gutter))).toBeLessThan(1);
  const button = section.getByRole('link', { name: 'View all offices and departments' });
  const buttonBox = (await button.boundingBox())!;
  expect(Math.abs(buttonBox.x + buttonBox.width - (width - gutter))).toBeLessThan(1);
  await expect(cards.first()).toContainText('Municipal Mayor');
  await expect(cards.first().locator('[class*="pill_"]')).toHaveCSS('background-color', 'rgb(245, 197, 66)');
  await page.keyboard.press('Tab');
  await cards.first().focus();
  await expect(cards.first()).toHaveCSS('outline-width', '3px');
  await expect(cards.first()).toHaveCSS('outline-offset', '3px');
  await expect(cards.first()).toHaveCSS('transform', 'none');
  await expect(cards.first()).toHaveCSS('background-image', /linear-gradient/);
  await cards.first().blur();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await cards.first().hover();
  await expect(cards.first()).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, -4)');
  await expect(cards.first().locator('[class*="arrow_"]')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 5, 0)');
  if (columns > 1) await expect(cards.nth(1)).toHaveCSS('background-image', 'none');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await section.screenshot({ path: info.outputPath(`offices-${width}.png`) });
});
