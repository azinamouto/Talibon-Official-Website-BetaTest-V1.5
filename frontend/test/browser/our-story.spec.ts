import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const artifacts = resolve('node_modules/.cache/talweb-story-review');
const baseline = process.env.TALWEB_STORY_BASELINE === '1';
for (const width of [360, 768, 1280, 1920]) test(`our story with the real photos at ${width}px`, async ({ page, context }) => {
  await page.setViewportSize({ width, height: 1100 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await context.route('**/*', route => {
    const url = route.request().url();
    if (url.includes('images.unsplash.com/photo-1507525428034-b723cf961d3e')) return route.fulfill({ path: resolve(artifacts, 'coast.jpg'), contentType: 'image/jpeg' });
    if (url.includes('MUNICIPAL-Mayoe2-28d8fb46.webp')) return route.fulfill({ path: resolve(artifacts, 'mayor.webp'), contentType: 'image/webp' });
    return new URL(url).hostname === '127.0.0.1' ? route.continue() : route.abort();
  });
  await context.route('**/api/**', route => route.fulfill({ json: [] }));
  await page.goto('/');
  await page.addStyleTag({ content: 'html {scroll-behavior:auto!important} header {opacity:0!important;transition:none!important;animation:none!important} #about [style*="opacity"] {opacity:1!important;transform:none!important}' });
  await expect(page.locator('header').first()).toHaveCSS('opacity', '0');
  const section = page.locator('#about');
  await section.evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
  const portrait = section.getByRole('img', { name: 'Hon. Janette Aurestila-Garcia, Municipal Mayor of Talibon' });
  await expect(portrait).toBeVisible();
  await expect.poll(() => portrait.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
  if (!baseline) {
    await expect(section.getByRole('heading', { name: 'Heritage & Progress', level: 2 })).toHaveCSS('font-size', '24px');
    await expect(section.getByRole('link', { name: 'Explore History' })).toHaveAttribute('href', '/about/history');
    await expect(section.getByRole('link')).toHaveCount(1);
    const background = section.locator('img[alt=""]');
    await expect(background).toHaveAttribute('loading', 'lazy');
    await expect.poll(() => background.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
    const box = await portrait.boundingBox();
    // Restored original full-portrait circle, including its municipal seal.
    expect(await portrait.evaluate(el => el.parentElement!.clientWidth)).toBeGreaterThanOrEqual(140);
    expect(box).not.toBeNull();
    await expect(section.locator('dl dt')).toHaveText(['Vision', 'Mission']);
    await expect(section.locator('dl dd')).toHaveText([
      'To be a premier center of commerce and eco-tourism in Northern Bohol.',
      'Empowering citizens through sustainable development and digital governance.',
    ]);
    const history = section.getByRole('link', { name: 'Explore History' });
    await history.focus();
    await expect(history).toBeFocused();
    await expect(history).toHaveCSS('outline-color', 'rgb(255, 255, 255)');
    await expect(history).toHaveCSS('outline-width', '2px');
    expect(await history.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(48);
    await history.blur();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  mkdirSync(artifacts, { recursive: true });
  await section.screenshot({ path: resolve(artifacts, `${baseline ? 'before' : 'after'}-${width}.png`), style: 'header {opacity:0!important;transition:none!important;animation:none!important}' });
  if (!baseline) {
    const text = await section.evaluate(el => {
      const origin = el.getBoundingClientRect();
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
      const ctx = canvas.getContext('2d')!;
      return [...el.querySelectorAll('p,h2,h3,dt > span:last-child,dd,a')].map(node => {
        const range = document.createRange(); range.selectNodeContents(node);
        ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = getComputedStyle(node).color; ctx.fillRect(0, 0, 1, 1);
        return { text: node.textContent, color: [...ctx.getImageData(0, 0, 1, 1).data],
          rects: [...range.getClientRects()].map(r => ({ x: r.x-origin.x, y: r.y-origin.y, width:r.width, height:r.height })) };
      });
    });
    writeFileSync(resolve(artifacts, `text-${width}.json`), JSON.stringify(text));
    await section.screenshot({ path: resolve(artifacts, `background-${width}.png`),
      style: 'header {opacity:0!important;transition:none!important;animation:none!important} #about :is(p,h2,h3,dt,dd,a) {color:transparent!important;text-shadow:none!important} #about svg {visibility:hidden!important}' });
  }
});
