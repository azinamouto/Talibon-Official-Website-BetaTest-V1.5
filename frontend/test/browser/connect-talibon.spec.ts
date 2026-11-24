import { expect, test } from '@playwright/test';
import { textContrast } from './uiContrast';

for (const width of [1440, 768, 375]) test(`compact scale, information office and Google map at ${width}px`, async ({ page, context }, info) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const google: string[] = [];
  await context.route('**/*', r => {
    const url = new URL(r.request().url());
    if (url.hostname === '127.0.0.1') return r.continue();
    if (url.hostname === 'www.google.com') { google.push(url.href); return r.fulfill({ contentType: 'text/html', body: '<p>Google Maps fixture</p>' }); }
    return r.abort();
  });
  await context.route('**/api/**', r => r.fulfill({ json: [] }));
  await context.route('**/data/social-updates.json', r => r.fulfill({ json: { posts: [] } }));
  await page.goto('/');
  await expect(page.locator('body')).toHaveCSS('font-size', '14px');
  const headings = page.locator('main > section:not(#home):not(#about):not(#services):not(#charter) h2');
  for (const h of await headings.all()) {
    await expect(h).toHaveCSS('font-size', '20px');
    await expect(h).toHaveCSS('font-weight', '500');
    await expect(h).toHaveCSS('letter-spacing', 'normal');
  }
  // The approved editorial sections use their own larger responsive hierarchy.
  for (const [selector, minimum, maximum] of [
    ['#our-story-heading', 30, 44], ['#services-heading', 34, 60],
    ['#charter-title', 34, 52], ['#office-directory-title', 30, 42],
  ] as const) {
    const heading = page.locator(selector);
    const size = await heading.evaluate(el => parseFloat(getComputedStyle(el).fontSize));
    expect(size).toBeGreaterThanOrEqual(minimum);
    expect(size).toBeLessThanOrEqual(maximum);
    await expect(heading).toHaveCSS('font-weight', '500');
  }
  const section = page.locator('#connect-talibon');
  await section.scrollIntoViewIfNeeded();
  const card = section.locator('[aria-labelledby="information-office-heading"]');
  const location = section.locator('#location');
  await expect(section.getByRole('navigation', { name: 'More Talibon pages' })).toBeVisible();
  await expect(section.getByRole('button', { name: /More Talibon pages/ })).toHaveCount(0);
  await expect(location.locator('iframe')).toHaveAttribute('src', /https:\/\/www.google.com\/maps.*output=embed/);
  expect(google).toHaveLength(1);
  const frame = await section.locator('#talibon-map').boundingBox();
  expect(frame!.height).toBe(200);
  const left = await card.boundingBox(), right = await location.boundingBox();
  expect(left!.height).toBeLessThan(right!.height);
  if (width >= 1000) expect(Math.abs(left!.y - right!.y)).toBeLessThan(1);
  await expect(location.getByText('Monday to Friday, 8:00 AM - 5:00 PM (except holidays)')).toBeVisible();
  await expect(location.getByText(/Map data . Google/)).toBeVisible();
  await expect(location.getByText(/OpenStreetMap/)).toHaveCount(0);
  await expect(location.getByRole('link', { name: /^Open in Maps/ })).toHaveCount(1);
  const directions = location.getByRole('link', { name: /^Get directions/ });
  await expect(directions).toHaveCount(1);
  await expect(directions).toHaveAttribute('href', /maps\/dir\/\?api=1&destination=Talibon%20Municipal%20Hall/);
  expect((await directions.boundingBox())!.height).toBe(width <= 768 ? 44 : 36);
  for (const result of await textContrast(section)) expect(result.ratio, result.text).toBeGreaterThanOrEqual(4.5);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await section.screenshot({ path: info.outputPath(`connect-${width}.png`), style: 'header{visibility:hidden!important}' });
});
