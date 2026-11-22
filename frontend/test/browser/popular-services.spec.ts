import { expect, test } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await context.route('**/api/**', route => route.fulfill({ json: [] }));
});

for (const width of [360, 768, 1280, 1920]) {
  test(`contained electronic services notice at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const section = page.getByRole('region', { name: 'Electronic services', exact: true });
    await section.scrollIntoViewIfNeeded();
    const link = section.getByRole('link', { name: 'See how to get services today' });
    await expect(link).toHaveAttribute('href', '/transparency/charter');
    await expect(section.getByRole('link')).toHaveCount(1);
    await expect(section).toHaveText(/We are preparing online services for Talibon residents/);
    await expect(section).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    const notice = section.locator('[class*="message_"]');
    await expect(notice).toHaveCSS('opacity', '1');
    await expect(notice).toHaveCSS('text-align', 'center');
    await expect(section.getByRole('heading')).toHaveCSS('font-size', '20px');
    await expect(section.getByRole('heading')).toHaveCSS('font-weight', '500');
    await expect(section.getByRole('heading')).toHaveText('Coming soon');
    const bounds = await notice.boundingBox();
    expect(bounds!.width).toBeLessThanOrEqual(576);
    expect(Math.abs(bounds!.x + bounds!.width / 2 - width / 2)).toBeLessThan(1);
    const color = await notice.evaluate(el => getComputedStyle(el).backgroundColor);
    expect(color).not.toBe('rgb(0, 89, 138)');
    await link.focus();
    await expect(link).toBeFocused();
    await expect(link).toHaveCSS('outline-width', '2px');
    await expect(link).toHaveCSS('outline-offset', '3px');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await section.screenshot({ path: info.outputPath(`notice-${width}.png`), style: 'header{visibility:hidden!important}' });
  });
}
