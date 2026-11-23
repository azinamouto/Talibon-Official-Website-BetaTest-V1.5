import { expect, test } from '@playwright/test';

export const officeTitles = ['Office of the Municipal Agriculturist', 'Municipal Treasury Office',
  'Municipal Planning and Development Office', 'Municipal Accounting Office',
  'Municipal Public Employment Service Office', 'Municipal Market Administration Office'];

for (const width of [320, 375, 768, 1024, 1280, 1920]) test(`office logo grid at ${width}px`, async ({ page, context }, info) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await context.route('**/api/**', route => route.fulfill({ json: [] }));
  await page.goto('/');
  const section = page.locator('#offices');
  await section.scrollIntoViewIfNeeded();
  const cards = section.locator('[data-office-card]');
  await expect(cards).toHaveCount(6);
  await expect(cards.locator('h3')).toHaveText(officeTitles);
  for (const card of await cards.all()) {
    await card.scrollIntoViewIfNeeded();
    await expect(card.getByText('N/A', { exact: true })).toBeVisible();
    await expect(card).toHaveAttribute('href', '/executive/directory');
    await expect.poll(() => card.locator('img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    const bounds = await card.boundingBox();
    const image = await card.locator('img').boundingBox();
    expect(image!.x + image!.width).toBeLessThan(bounds!.x + bounds!.width);
    expect(await card.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  }
  const columns = await cards.first().evaluate(el => getComputedStyle(el.parentElement!).gridTemplateColumns.split(' ').length);
  expect(columns).toBe(width >= 1024 ? 3 : width >= 700 ? 2 : 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await section.screenshot({ path: info.outputPath(`offices-${width}.png`) });
});
