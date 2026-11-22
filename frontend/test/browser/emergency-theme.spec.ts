import { expect, test } from '@playwright/test';
import { textContrast } from './uiContrast';

const numbers = ['0929-152-3330', '0917-323-0117', '0998-598-6433', '0946-336-0021', '0945-862-7931'];
for (const width of [1440, 768, 375]) test(`compact emergency hotlines at ${width}px`, async ({ page, context }, info) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await context.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
  await context.route('**/api/**', r => r.fulfill({ json: [] }));
  await page.goto('/');
  const section = page.locator('#emergency');
  await section.scrollIntoViewIfNeeded();
  await expect(section).toHaveCSS('background-image', 'none');
  await expect(section).toHaveCSS('background-color', 'rgb(107, 18, 22)');
  await expect(section.getByText('TALIBON', { exact: true })).toHaveCount(0);
  await expect(section.locator('h3')).toHaveText(['MDRRMO', 'PNP Station', 'Rural Health Unit', 'BFP Station']);
  const cards = section.getByRole('article');
  await expect(cards).toHaveCount(4);
  const columns = await cards.first().evaluate(el => getComputedStyle(el.parentElement!).gridTemplateColumns.split(' ').length);
  expect(columns).toBe(width >= 1024 ? 4 : width >= 600 ? 2 : 1);
  await expect(section.locator('a[href^="tel:"]')).toHaveCount(6);
  for (const [i, number] of numbers.entries()) {
    const link = cards.locator('a').nth(i);
    await expect(link).toHaveAttribute('href', `tel:${number.replace(/\D/g, '')}`);
    await expect(link).toContainText(number);
    await expect(link).toHaveAccessibleName(new RegExp(`^Call .+ at ${number}$`));
    await expect(link.locator('svg')).toHaveCount(1);
    expect((await link.boundingBox())!.height).toBe(width <= 768 ? 44 : 36);
  }
  await expect(section.getByRole('link', { name: 'Call Landline at (038) 510-1980', exact: true })).toHaveAttribute('href', 'tel:0385101980');
  for (const card of await cards.all()) {
    await expect(card).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(card).toHaveCSS('border-radius', '12px');
    const label = card.locator('[class*="agency_"]');
    await expect(label).toHaveCSS('white-space', 'nowrap');
    expect(await label.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    const subtitle = await label.boundingBox(), phone = await card.locator('a').first().boundingBox();
    expect(phone!.y - subtitle!.y - subtitle!.height).toBeLessThan(20);
  }
  for (const result of await textContrast(section)) expect(result.ratio, result.text).toBeGreaterThanOrEqual(4.5);
  await cards.locator('a').first().focus();
  await expect(cards.locator('a').first()).toHaveCSS('outline-width', '3px');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await section.screenshot({ path: info.outputPath(`emergency-${width}.png`), style: 'header{visibility:hidden!important}' });
});
