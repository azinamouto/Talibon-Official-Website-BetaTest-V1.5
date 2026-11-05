import { expect, test } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const { PNG } = createRequire(import.meta.url)(resolve('node_modules/playwright-core/lib/utilsBundle.js'));
const artifacts = resolve('node_modules/.cache/municipal-offices');
const baseline = process.env.TALWEB_OFFICES_BASELINE === '1';
const people = ['Hon. Michael I. Doria', 'Elmer B. Magalona', 'Juliet D. Lumbo-an', 'Rogelia L. Cellan'];

for (const width of [360, 768, 1280, 1920]) test(`municipal office cards, keyboard and protected regions at ${width}px`, async ({ page, context }) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.clock.setFixedTime(new Date('2026-11-04T04:00:00Z'));
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') return route.continue();
    return route.abort();
  });
  await context.route('**/api/**', route => route.fulfill({ json: [] }));
  await page.goto('/');
  await page.addStyleTag({ content: 'html{scroll-behavior:auto!important}*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}[style*="opacity"]{opacity:1!important}[style*="transform"]{transform:none!important}' });
  mkdirSync(artifacts, { recursive: true });
  for (const [name, selector] of [['header', 'header'], ['hero', '#home']]) {
    const buffer = await page.locator(selector).first().screenshot({ animations: 'disabled' });
    const before = resolve(artifacts, `before-${name}-${width}.png`);
    writeFileSync(resolve(artifacts, `${baseline ? 'before' : 'after'}-${name}-${width}.png`), buffer);
    if (!baseline && existsSync(before)) {
      const a = PNG.sync.read(readFileSync(before)), b = PNG.sync.read(buffer);
      expect([b.width, b.height]).toEqual([a.width, a.height]);
      expect(b.data.equals(a.data)).toBe(true);
      console.log(`${name} ${width}px: zero changed pixels`);
    }
  }
  const section = page.locator('#offices');
  await section.scrollIntoViewIfNeeded();
  if (!baseline) {
    await expect(section.getByRole('heading', { level: 2 })).toHaveText('Municipal offices and departments');
    const cards = section.locator('[data-office-card]');
    await expect(cards).toHaveCount(4);
    await expect(section.locator('h2')).toHaveCSS('font-size', width < 640 ? '32px' : '48px');
    await expect(cards.first().locator('div').first()).toHaveCSS('background-image', 'none');
    await expect(cards.first().locator('div').first()).toHaveCSS('background-color', 'rgb(0, 132, 209)');
    await expect(cards.first()).toHaveCSS('box-shadow', 'rgba(15, 23, 42, 0.15) 0px 1px 3px 0px');
    const bounds = await cards.evaluateAll(elements => elements.map(el => {
      const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, height: r.height };
    }));
    const columns = width >= 1024 ? 4 : width >= 640 ? 2 : 1;
    expect(new Set(bounds.map(b => b.x)).size).toBe(columns);
    for (let i = 0; i < 4; i++) {
      await expect(cards.nth(i)).toContainText(people[i]);
      await expect(cards.nth(i)).toHaveAttribute('href', '/executive/directory');
      expect(bounds[i].height).toBe(bounds[0].height);
    }
    await expect(cards.first()).toContainText('Municipal Mayor');
    await expect(section.getByText('Department head', { exact: true })).toHaveCount(3);
    const links = section.getByRole('link');
    await expect(links).toHaveCount(5);
    await links.first().focus();
    for (let i = 0; i < 5; i++) {
      await expect(links.nth(i)).toBeFocused();
      await expect(links.nth(i)).toHaveCSS('outline-style', 'solid');
      await expect(links.nth(i)).toHaveCSS('outline-width', '2px');
      if (i < 4) await page.keyboard.press('Tab');
    }
    await cards.first().hover();
    await expect(cards.first()).toHaveCSS('transform', 'none');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(cards.first()).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, -2)');
    await expect(cards.first()).toHaveCSS('box-shadow', 'rgba(15, 23, 42, 0.18) 0px 4px 12px 0px');
    await expect(cards.first().locator('span[aria-hidden="true"]')).toHaveCSS('background-color', 'rgb(0, 70, 110)');
    expect(await links.last().evaluate(el => el.getBoundingClientRect().height)).toBe(44);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(section).toHaveCSS('background-color', 'rgb(240, 249, 255)');
    expect(await section.locator('svg').evaluateAll(icons => icons.every(i => i.getAttribute('aria-hidden') === 'true'))).toBe(true);
    await page.mouse.move(0, 0);
    await links.last().blur();
  }
  await section.screenshot({ path: resolve(artifacts, `${baseline ? 'before' : 'after'}-offices-${width}.png`), style: 'header{opacity:0!important}' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
