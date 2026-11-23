import { expect, test } from '@playwright/test';

const listing = { data: [{ id: 'one', slug: 'one', name: 'Published service' }], pagination: { page: 1, limit: 6, total: 1, totalPages: 1 } };
for (const width of [375, 1280]) test(`quiet homepage services, retry and heading alignment at ${width}px`, async ({ page, context }, info) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await context.route('**/api/**', route => route.fulfill({ json: [] }));
  let fail = true;
  await context.route('**/api/services?**', route => {
    expect(new URL(route.request().url()).searchParams.get('limit')).toBe('6');
    return fail ? route.fulfill({ status: 503, json: {} }) : route.fulfill({ json: listing });
  });
  await page.goto('/');
  const section = page.getByRole('region', { name: 'Municipal services', exact: true });
  const barangays = page.getByRole('region', { name: 'Barangays of Talibon' });
  const error = section.getByRole('alert');
  await expect(error).toContainText("Services couldn't load. Check your connection and try again.");
  await expect(error).toHaveCSS('border-radius', '10px');
  const retry = error.getByRole('button', { name: 'Try again' });
  await expect(retry).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  for (const heading of [section.getByRole('heading'), barangays.getByRole('heading', { level: 2 })]) {
    await expect(heading).toHaveCSS('font-size', '20px');
    await expect(heading).toHaveCSS('font-weight', '500');
    await expect(heading).toHaveCSS('letter-spacing', 'normal');
  }
  const all = section.getByRole('link', { name: 'View all services' });
  await expect(all).toHaveAttribute('href', '/services');
  await expect(all.locator('svg')).toHaveCount(1);
  await expect(all).not.toHaveText(/\?/);
  const directory = barangays.getByRole('link', { name: 'View full directory' });
  await expect(directory).toHaveAttribute('href', '/about/barangays');
  await expect(directory).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  const h = await section.getByRole('heading').boundingBox(), l = await all.boundingBox();
  const b = await barangays.getByRole('heading', { level: 2 }).boundingBox(), d = await directory.boundingBox();
  if (width >= 640) {
    expect(l!.x).toBeGreaterThan(h!.x + h!.width);
    expect(d!.x).toBeGreaterThan(b!.x + b!.width);
  } else {
    expect(l!.y).toBeGreaterThanOrEqual(h!.y + h!.height);
    expect(d!.y).toBeGreaterThanOrEqual(b!.y + b!.height);
  }
  const contrast = await error.evaluate(el => {
    const ctx = document.createElement('canvas').getContext('2d')!;
    const rgb = (color: string, background = 'white') => {
      ctx.fillStyle = background; ctx.fillRect(0, 0, 1, 1);
      ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1);
      return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
    };
    const luminance = (values: number[]) => values.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
    const ratio = (foreground: string, background: string) => {
      const a = luminance(rgb(foreground)), b = luminance(rgb(background));
      return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    };
    const notice = document.querySelector('#popular-services [class*="message_"]')!;
    const description = notice.querySelector('p')!;
    return [ratio(getComputedStyle(el.querySelector('p')!).color, getComputedStyle(el).backgroundColor), ratio(getComputedStyle(description).color, getComputedStyle(notice).backgroundColor)];
  });
  contrast.forEach(ratio => expect(ratio).toBeGreaterThanOrEqual(4.5));
  await section.scrollIntoViewIfNeeded();
  await retry.focus();
  await expect(retry).toHaveCSS('outline-width', '2px');
  await section.screenshot({ path: info.outputPath(`services-error-${width}.png`), style: 'header{visibility:hidden!important}' });
  const first = await section.boundingBox(), end = await barangays.boundingBox();
  await page.screenshot({ path: info.outputPath(`services-through-barangays-${width}.png`), fullPage: true, clip: { x: 0, y: first!.y + await page.evaluate(() => scrollY), width, height: end!.y + end!.height - first!.y }, style: 'header{visibility:hidden!important}' });
  fail = false;
  await retry.click();
  await expect(section.getByRole('link', { name: /Published service/ })).toHaveAttribute('href', '/services/one');
  await expect(error).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('municipal services displays skeletons while the unchanged request is pending', async ({ page, context }) => {
  await context.route('**/api/**', route => route.fulfill({ json: [] }));
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await context.route('**/api/services?**', async route => { await pending; await route.fulfill({ json: listing }); });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const section = page.getByRole('region', { name: 'Municipal services', exact: true });
  await expect(section.getByRole('status', { name: 'Loading municipal services' })).toBeVisible();
  await expect(section.locator('[class*="skeletonCard_"]')).toHaveCount(6);
  release();
  await expect(section.getByRole('link', { name: /Published service/ })).toBeVisible();
});
