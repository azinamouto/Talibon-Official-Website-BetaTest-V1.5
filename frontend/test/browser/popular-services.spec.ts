import { expect, test } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await context.route('**/api/**', route => route.fulfill({ json: [] }));
});

for (const width of [360, 768, 1280, 1920]) {
  test(`electronic services fits and supports keyboard navigation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const section = page.getByRole('region', { name: 'Electronic services', exact: true });
    const primary = section.getByRole('link', { name: 'See how to get services today' });
    const secondary = section.getByRole('link', { name: 'Electronic services information' });
    await section.scrollIntoViewIfNeeded();
    const message = section.getByRole('heading', { name: 'Electronic services' }).locator('..');
    const messageBox = await message.boundingBox();
    expect(Math.abs(messageBox!.x + messageBox!.width / 2 - width / 2)).toBeLessThanOrEqual(2);
    await expect(message).toHaveCSS('text-align', 'center');
    await expect(message).toHaveCSS('opacity', '0.9');
    await expect(primary).toHaveAttribute('href', '/transparency/charter');
    await expect(secondary).toHaveAttribute('href', '/e-services');
    await expect(section.getByRole('link')).toHaveCount(2);
    await expect(section.getByText('Planned for residents')).toHaveCount(0);
    expect(await section.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    for (const link of [primary, secondary]) {
      const box = await link.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(48);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    }
    await primary.focus();
    await page.keyboard.press('Tab');
    await expect(secondary).toBeFocused();
    await expect(message).toHaveCSS('opacity', '1');
    await expect(secondary).toHaveCSS('outline-width', '2px');
    await expect(secondary).toHaveCSS('outline-offset', '2px');
    await expect(secondary).toHaveCSS('outline-color', 'rgb(255, 255, 255)');
    await expect(secondary).toHaveCSS('transition-duration', '0s');
    await page.keyboard.press('Shift+Tab');
    await expect(primary).toBeFocused();
    await expect(primary).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(primary).toHaveCSS('color', 'rgb(0, 89, 138)');
    await section.screenshot({ path: `test-results/electronic-services-${width}.png` });
  });
}
