import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await context.route('http://127.0.0.1:54321/**', route => route.fulfill({ json: [] }));
  await context.route('**/api/**', route => route.fulfill({ json: [] }));
});

for (const width of [360, 768, 1280, 1920]) {
  test(`full-width quick links, states and AA contrast at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'What do you need today?' });
    await nav.scrollIntoViewIfNeeded();
    const section = page.getByRole('region', { name: 'What do you need today?' });
    const links = nav.getByRole('link');
    await expect(links).toHaveText(['Apply for a permit', 'Request a service', 'Use online services', 'Plan a visit', 'Download forms', "Read the Citizen's Charter"]);
    const layout = await nav.evaluate(el => {
      const list = el.querySelector('ul')!;
      const rects = [...list.children].map(item => item.getBoundingClientRect());
      const grid = list.getBoundingClientRect();
      return { widths: rects.map(r => r.width), tops: rects.map(r => r.top), left: rects[0].left, right: rects[rects.length - 1].right, gridLeft: grid.left, gridRight: grid.right, navWidth: el.getBoundingClientRect().width, gridWidth: grid.width };
    });
    const columns = width >= 768 ? 6 : 3;
    expect(Math.max(...layout.widths) - Math.min(...layout.widths)).toBeLessThan(1);
    expect(layout.tops[columns - 1]).toBe(layout.tops[0]);
    if (columns === 3) expect(layout.tops[3]).toBeGreaterThan(layout.tops[0]);
    expect(layout.gridWidth).toBeCloseTo(layout.navWidth, 0);
    expect(layout.left).toBeCloseTo(layout.gridLeft, 0);
    expect(layout.right).toBeCloseTo(layout.gridRight, 0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await links.evaluateAll(items => items.every(item => item.getBoundingClientRect().height >= 44 && item.getBoundingClientRect().width >= 44))).toBe(true);
    await section.screenshot({ path: `test-results/quick-links-${width}.png`, animations: 'disabled', style: 'header { visibility: hidden !important; }' });

    const first = links.first();
    const iconBox = first.locator('span').first();
    const contrast = async () => first.evaluate(el => {
      const label = el.lastElementChild!, box = el.firstElementChild!;
      const rgb = (color: string) => {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
        const ctx = canvas.getContext('2d')!; ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1);
        return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3).map(v => { const n = v / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; });
      };
      const luminance = (color: string) => rgb(color).reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
      const ratio = (a: string, b: string) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
      return { text: ratio(getComputedStyle(label).color, getComputedStyle(el.closest('section')!).backgroundColor), icon: ratio(getComputedStyle(box).color, getComputedStyle(box).backgroundColor) };
    });
    const normal = await contrast();
    expect(normal.text).toBeGreaterThanOrEqual(4.5);
    expect(normal.icon).toBeGreaterThanOrEqual(3);
    await first.hover();
    await expect(iconBox).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, -3)');
    const hover = await contrast();
    expect(hover.icon).toBeGreaterThan(normal.icon);
    expect(hover.text).toBeGreaterThanOrEqual(4.5);
    await first.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(first).toHaveCSS('outline-style', 'solid');
    await expect(first).toBeFocused();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await first.hover();
    await expect(iconBox).toHaveCSS('transform', 'none');
    await expect(iconBox).toHaveCSS('transition-duration', '0s');
    console.log(JSON.stringify({ width, columns, normalContrast: normal, hoverContrast: hover }));
  });
}
