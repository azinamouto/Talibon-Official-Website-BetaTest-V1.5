import { expect, test } from '@playwright/test';
import { textContrast } from './uiContrast';

const offices = ['MDRRMO', 'PNP Station', 'Rural Health Unit', 'BFP Station'];
const numbers = ['0929-152-3330', '0917-323-0117', '0998-598-6433', '0946-336-0021', '0945-862-7931'];
for (const width of [360, 768, 1180, 1280, 1920]) {
  test(`emergency cards preserve every number and accessible call target at ${width}px`, async ({ page, context }, info) => {
    await page.setViewportSize({ width, height: 1100 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    await context.route('**/api/**', route => route.fulfill({ json: [] }));
    await page.goto('/');
    const section = page.locator('#emergency');
    await section.scrollIntoViewIfNeeded();
    await expect(section.locator('h3')).toHaveText(offices);
    await expect(section.locator('a[href^="tel:"]')).toHaveCount(6);
    expect(await section.locator('a').evaluateAll(links => links.map(link => link.getAttribute('href')))).toEqual([
      ...numbers.map(number => `tel:${number.replace(/-/g, '')}`), 'tel:0385101980',
    ]);
    const cards = section.locator('[class*="card_"]');
    const geometry = await cards.evaluateAll(elements => elements.map(el => {
      const rect = el.getBoundingClientRect(); return { x: rect.x, y: rect.y, height: rect.height };
    }));
    expect(new Set(geometry.map(rect => rect.x)).size).toBe(width >= 1180 ? 4 : width >= 620 ? 2 : 1);
    for (const row of new Set(geometry.map(rect => rect.y))) {
      expect(new Set(geometry.filter(rect => rect.y === row).map(rect => rect.height)).size).toBe(1);
    }
    for (const [index, number] of numbers.entries()) {
      const link = section.locator('a').nth(index);
      await expect(link).toContainText(number);
      await expect(link).toHaveAccessibleName(new RegExp(`^Call .+ at ${number}$`));
      expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await expect(section.getByRole('link', { name: 'Call Landline at (038) 510-1980', exact: true })).toContainText('Landline: (038) 510-1980');
    await page.keyboard.press('Tab');
    for (const link of await section.locator('a').all()) {
      await link.focus();
      await expect(link).toHaveCSS('outline-width', '3px');
      await expect(link).toHaveCSS('outline-offset', '3px');
      await expect(link).toHaveCSS('outline-color', 'rgb(255, 255, 255)');
    }
    await expect(section.locator('[class*="status_"] span')).toHaveCSS('animation-name', 'none');
    for (const pair of await textContrast(section)) expect(pair.ratio, pair.text).toBeGreaterThanOrEqual(4.5);
    expect(await section.locator('[class*="number_"]').evaluateAll(elements => elements.every(el => el.scrollWidth <= el.clientWidth))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await section.screenshot({ path: info.outputPath(`emergency-${width}.png`) });
  });
}
