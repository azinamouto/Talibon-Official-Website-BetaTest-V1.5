import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await context.route('http://127.0.0.1:54321/**', route => route.fulfill({ json: [] }));
  await context.route('**/api/**', route => route.fulfill({ json: [] }));
});

for (const width of [320, 360, 375, 768, 1280, 1920]) {
  test(`barangay discovery and row-first cards at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.goto('/');
    // Focus changes scroll positions; keep hover assertions independent of smooth scrolling.
    await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
    const section = page.getByRole('region', { name: 'Barangays of Talibon' });
    await section.evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
    const list = section.getByRole('list', { name: 'Barangays' });
    await expect(list.getByRole('listitem')).toHaveCount(8);
    const columns = width >= 1024 ? 4 : width >= 640 ? 2 : 1;
    const positions = await list.getByRole('listitem').evaluateAll(items => items.map(item => {
      const rect = item.getBoundingClientRect();
      return { top: rect.top, left: rect.left };
    }));
    expect(positions[columns - 1].top).toBe(positions[0].top);
    if (columns > 1) expect(positions[1].left).toBeGreaterThan(positions[0].left);
    expect(positions[columns].top).toBeGreaterThan(positions[0].top);
    expect(await section.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await expect(list.getByRole('link')).toHaveCount(8);
    await expect(list.getByRole('link').first()).toHaveAccessibleName('Bagacay Mainland barangay');
    await expect(list.getByRole('link').first()).toHaveAttribute('href', '/about/barangays');
    // Hide the unchanged fixed header only in the cropped section artifact.
    await section.screenshot({ path: `test-results/barangays-${width}.png`, animations: 'disabled', style: 'header { visibility: hidden !important; }' });

    await section.getByRole('button', { name: 'Island', exact: true }).click();
    await expect(list.getByRole('listitem')).toHaveCount(8);
    await expect(section.getByRole('heading', { name: 'Nocnocan' })).toBeVisible();
    await section.getByRole('button', { name: 'Mainland', exact: true }).click();
    await expect(list.getByRole('listitem')).toHaveCount(17);
    const search = section.getByRole('searchbox', { name: 'Find a barangay' });
    await search.fill('nino');
    await expect(list.getByRole('listitem')).toHaveCount(1);
    await expect(section.getByRole('heading', { name: 'Santo Niño' })).toBeVisible();
    await search.fill('unmatched-name-123');
    await expect(section.getByRole('heading', { name: 'No barangay found' })).toBeVisible();
    await section.getByRole('button', { name: 'Reset search and filters' }).click();
    await section.getByRole('button', { name: 'Browse all 25 barangays' }).click();
    await expect(list.getByRole('listitem')).toHaveCount(25);
    await section.getByRole('button', { name: 'Show fewer barangays' }).click();
    await expect(list.getByRole('listitem')).toHaveCount(8);
    const directory = section.getByRole('link', { name: 'View full directory' });
    await expect(directory).toHaveAttribute('href', '/about/barangays');
    await directory.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(directory).toHaveCSS('outline-style', 'solid');
    expect(await directory.evaluate(el => { const probe = document.createElement('span'); probe.style.color = 'var(--color-sky-800)'; el.append(probe); const expected = getComputedStyle(probe).color; probe.remove(); return getComputedStyle(el).outlineColor === expected; })).toBe(true);
    await expect(directory).toHaveCSS('outline-width', '2px');
    await expect(directory).toHaveCSS('outline-offset', '2px');
    const firstCard = list.getByRole('link').first();
    await page.keyboard.press('Tab');
    await expect(firstCard).toBeFocused();
    await expect(firstCard).toHaveCSS('outline-style', 'solid');
    await firstCard.hover();
    await expect(firstCard).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, -2)');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(directory).toHaveCSS('transition-duration', '0s');
    await expect(firstCard).toHaveCSS('transform', 'none');
    const searchBox = section.getByRole('searchbox', { name: 'Find a barangay' });
    await searchBox.focus();
    await page.keyboard.press('Tab');
    for (const name of ['All', 'Poblacion', 'Mainland', 'Island']) {
      await expect(section.getByRole('button', { name, exact: true })).toBeFocused();
      await page.keyboard.press('Tab');
    }
    await expect(directory).toBeFocused();
    expect(await section.locator('button').evaluateAll(buttons => buttons.every(button => button.getBoundingClientRect().height >= 44))).toBe(true);
    const contrast = await section.evaluate(el => {
      const style = getComputedStyle(el);
      const luminance = (token: string) => {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = style.getPropertyValue(`--color-${token}`).trim(); ctx.fillRect(0, 0, 1, 1);
        return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3).reduce((sum, value, i) => {
          const n = value / 255, linear = n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4;
          return sum + linear * [.2126, .7152, .0722][i];
        }, 0);
      };
      return [['white', 'sky-600', 3], ['white', 'sky-700', 4.5], ['white', 'sky-800', 4.5],
        ['slate-900', 'white', 4.5], ['slate-700', 'sky-50', 4.5],
        ['sky-900', 'white', 4.5], ['sky-900', 'sky-100', 4.5]].map(([fg, bg, minimum]) => {
          const a = luminance(String(fg)), b = luminance(String(bg));
          return { pair: `${fg}/${bg}`, ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05), minimum: Number(minimum) };
        });
    });
    for (const pair of contrast) expect(pair.ratio, pair.pair).toBeGreaterThanOrEqual(pair.minimum);
    console.log(JSON.stringify({ width, contrast }));

  });
}
