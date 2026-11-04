import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await context.route('http://127.0.0.1:54321/**', route => route.fulfill({ json: [] }));
  await context.route('**/api/**', route => route.fulfill({ json: [] }));
});

for (const width of [320, 360, 375, 768, 1280, 1920]) {
  test(`charter tasks, search, grouping and keyboard access at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
    const section = page.getByRole('region', { name: 'Citizen’s Charter', exact: true });
    await section.evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
    const list = section.getByRole('list', { name: 'Civil & business services', exact: true });
    const cards = list.locator(':scope > li');
    await expect(cards).toHaveCount(7);
    const columns = width >= 1280 ? 4 : width >= 640 ? 2 : 1;
    const positions = await cards.evaluateAll(items => items.map(item => {
      const rect = item.getBoundingClientRect();
      return { top: rect.top, left: rect.left };
    }));
    expect(positions[columns - 1].top).toBe(positions[0].top);
    expect(positions[columns].top).toBeGreaterThan(positions[0].top);
    expect(await section.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await section.screenshot({ path: `test-results/charter-${width}.png`, animations: 'disabled', style: 'header:not(#charter header) { visibility: hidden !important; }' });

    const tasks = section.getByRole('list', { name: 'Start with a task', exact: true });
    const taskControls = tasks.locator('a, button');
    await expect(taskControls).toHaveCount(6);
    const taskColumns = await tasks.evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    expect(taskColumns).toBe(width >= 1024 ? 3 : width >= 640 ? 2 : 1);
    const searchInput = section.getByRole('searchbox', { name: 'Search offices and services' });
    await expect(searchInput).toHaveCSS('height', '48px');
    await searchInput.focus();
    await expect(searchInput).toHaveCSS('outline-style', 'solid');
    await expect(searchInput).toHaveCSS('outline-width', '2px');
    await page.keyboard.press('Tab');
    await expect(section.getByRole('link', { name: /Download full charter/ })).toBeFocused();
    for (const control of await taskControls.all()) {
      await page.keyboard.press('Tab');
      await expect(control).toBeFocused();
      await expect(control).toHaveCSS('outline-style', 'solid');
      await expect(control).toHaveCSS('outline-offset', '2px');
    }
    const firstTask = taskControls.first();
    await firstTask.hover();
    await expect(firstTask).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, -2)');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(firstTask).toHaveCSS('transform', 'none');
    await expect(firstTask).toHaveCSS('transition-duration', '0s');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const controlGeometry = await searchInput.evaluate(el => {
      const input = el.getBoundingClientRect();
      const download = el.closest('section')!.querySelector('a[href]:has(svg.lucide-download)')!.getBoundingClientRect();
      return { inputTop: input.top, inputBottom: input.bottom, downloadTop: download.top };
    });
    if (width >= 1024) expect(controlGeometry.downloadTop).toBeCloseTo(controlGeometry.inputTop, 0);
    else expect(controlGeometry.downloadTop).toBeGreaterThanOrEqual(controlGeometry.inputBottom);
    const contrast = await tasks.evaluate(el => {
      const style = getComputedStyle(el);
      const luminance = (token: string) => {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
        const ctx = canvas.getContext('2d')!; ctx.fillStyle = style.getPropertyValue(`--color-${token}`).trim(); ctx.fillRect(0, 0, 1, 1);
        return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3).reduce((sum, value, i) => {
          const n = value / 255, linear = n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4;
          return sum + linear * [.2126, .7152, .0722][i];
        }, 0);
      };
      return [['white', 'sky-600', 3], ['white', 'sky-800', 4.5], ['slate-900', 'white', 4.5],
        ['slate-700', 'sky-50', 4.5], ['sky-900', 'white', 4.5], ['sky-900', 'sky-100', 4.5]].map(([fg, bg, minimum]) => {
          const a = luminance(String(fg)), b = luminance(String(bg));
          return { pair: `${fg}/${bg}`, ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05), minimum: Number(minimum) };
        });
    });
    for (const pair of contrast) expect(pair.ratio, pair.pair).toBeGreaterThanOrEqual(pair.minimum);
    console.log(JSON.stringify({ width, taskColumns, contrast }));

    const search = section.getByRole('searchbox', { name: 'Search offices and services' });
    await search.fill('birth certificate');
    await expect(section.getByRole('status')).toHaveText('1 matching office');
    await expect(section.getByRole('heading', { name: /Local Civil Registry Office/ })).toBeVisible();
    await search.fill('HRMO');
    await expect(section.getByRole('heading', { name: /Human Resource Management/ })).toBeVisible();
    await search.fill('unmatched-service-999');
    await expect(section.getByRole('heading', { name: 'No offices found' })).toBeVisible();
    await section.getByRole('button', { name: 'Show all offices' }).click();
    const summary = section.locator('summary');
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(section.getByRole('heading', { name: /Human Resource Management/ })).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(section.getByText('Human Resource Management Office')).not.toBeVisible();

    const directory = section.getByRole('region', { name: 'Browse offices by purpose' });
    const officeLinks = directory.getByRole('link');
    await expect(officeLinks).toHaveCount(15);
    await officeLinks.first().focus();
    for (let index = 0; index < 15; index++) {
      await expect(officeLinks.nth(index)).toBeFocused();
      expect(await officeLinks.nth(index).evaluate(el => getComputedStyle(el, '::after').outlineStyle)).toBe('solid');
      await page.keyboard.press('Tab');
    }
    await expect(summary).toBeFocused();
    await expect(summary).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('Enter');
    await expect(summary).toHaveAttribute('aria-expanded', 'true');
    await expect(officeLinks).toHaveCount(19);
    for (let index = 15; index < 19; index++) {
      await page.keyboard.press('Tab');
      await expect(officeLinks.nth(index)).toBeFocused();
    }
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(summary).toHaveAttribute('aria-expanded', 'false');

    const download = section.getByRole('link', { name: /Download full charter/ });
    await download.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    expect(await download.evaluate(el => { const probe = document.createElement('span'); probe.style.color = 'var(--color-sky-800)'; el.append(probe); const expected = getComputedStyle(probe).color; probe.remove(); return getComputedStyle(el).outlineColor === expected; })).toBe(true);
    await expect(download).toHaveCSS('outline-style', 'solid');
    await expect(section.getByRole('link', { name: /Business permit PDF guide/ })).toHaveAttribute('href', /#page=215$/);
    await section.getByRole('button', { name: 'Tax declaration Find the office' }).click();
    await expect(section.getByRole('heading', { name: 'Assessor’s Office' })).toBeVisible();
  });
}
