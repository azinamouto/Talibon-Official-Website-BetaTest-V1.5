import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await context.route('http://127.0.0.1:54321/**', route => route.fulfill({ json: [] }));
  await context.route('**/api/**', route => route.fulfill({ json: [] }));
});

for (const width of [360, 768, 1280, 1920]) {
  test(`transparency cards, logos and keyboard access at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
    const section = page.getByRole('region', { name: 'Transparency and accountability' });
    await section.evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
    const list = section.getByRole('list', { name: 'Transparency documents' });
    const cards = list.getByRole('listitem');
    await expect(cards).toHaveCount(4);
    expect(await list.evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(width >= 1024 ? 4 : width >= 640 ? 2 : 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const logoBoxes = await section.getByRole('img').evaluateAll(images => images.map(img => {
      const r = img.parentElement!.getBoundingClientRect();
      return { width: r.width, height: r.height };
    }));
    expect(logoBoxes).toEqual([{ width: 64, height: 64 }, { width: 64, height: 64 }, { width: 56, height: 56 }, { width: 56, height: 56 }]);
    await section.screenshot({ path: `test-results/transparency-${width}.png`, animations: 'disabled', style: 'header:not(#transparency header) { visibility:hidden!important; }' });
    const links = list.getByRole('link');
    await links.first().focus();
    for (let index = 0; index < 4; index++) {
      await expect(links.nth(index)).toBeFocused();
      const ring = await links.nth(index).evaluate(el => ({ color: getComputedStyle(el, '::after').outlineColor, width: getComputedStyle(el, '::after').outlineWidth, style: getComputedStyle(el, '::after').outlineStyle }));
      expect(ring).toEqual({ color: 'rgb(255, 255, 255)', width: '2px', style: 'solid' });
      if (index < 3) await page.keyboard.press('Tab');
    }
    await cards.first().hover();
    await expect(cards.first()).toHaveCSS('translate', 'none');
    await expect(cards.first()).toHaveCSS('transition-duration', '0s');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await cards.first().hover();
    await expect(cards.first()).toHaveCSS('translate', '0px -2px');
    // The action's pseudo-element makes the padding at the top of the card clickable.
    await cards.first().click({ position: { x: 12, y: 12 } });
    await expect(page).toHaveURL(/\/transparency\/budget$/);
  });
}
