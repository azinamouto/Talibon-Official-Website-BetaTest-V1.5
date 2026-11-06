import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const baseline = process.env.TALWEB_NEWS_BASELINE === '1';
const artifacts = resolve('node_modules/.cache/news-section');
const fixture = (index: number) => ({ id: `official-${index}`, slug: `official-${index}`, title: index === 1 ? 'A very long official municipal announcement headline '.repeat(5) : `Official announcement ${index}`, summary: 'Community news and official municipal information. '.repeat(index === 1 ? 10 : 1), content: '', category: index === 2 ? '' : 'Advisory', author: index === 0 ? 'Named reporter' : null, date: `2026-09-0${index + 1}`, image_url: index === 1 ? '/test-news-broken.jpg' : index === 2 ? null : '/test-news-image.svg' });
for (const width of [360, 768, 1280, 1920]) test(`news states, cards and keyboard at ${width}px`, async ({ page, context }) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await context.route('**/api/**', route => route.fulfill({ json: [] }));
  await context.route('**/test-news-image.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#b7e7fc"/></svg>' }));
  await context.route('**/test-news-broken.jpg', route => route.fulfill({ status: 404, body: '' }));
  let count = 3;
  await context.route('**/api/news?**', route => {
    expect(new URL(route.request().url()).searchParams.get('limit')).toBe('3');
    return route.fulfill({ json: { data: Array.from({ length: count }, (_, i) => fixture(i)), pagination: { page: 1, limit: 3, total: count, totalPages: 1 } } });
  });
  await page.goto('/');
  await page.addStyleTag({ content: 'html{scroll-behavior:auto!important} header{opacity:0!important} [style*="opacity"]{opacity:1!important} [style*="transform"]{transform:none!important}' });
  const section = page.locator('#news-today');
  await section.scrollIntoViewIfNeeded();
  mkdirSync(artifacts, { recursive: true });
  if (baseline) { await section.screenshot({ path: resolve(artifacts, `before-${width}.png`) }); return; }
  for (const size of [0, 1, 2, 3, 6]) {
    count = size;
    await page.reload();
    await page.addStyleTag({ content: 'html{scroll-behavior:auto!important} header{opacity:0!important}' });
    await section.scrollIntoViewIfNeeded();
    await expect(section.getByRole('heading', { level: 2 })).toHaveText('News and announcements');
    await expect(section.locator('h2')).toHaveCSS('font-size', width < 640 ? '32px' : '48px');
    const cards = section.locator('[data-news-card]');
    await expect(cards).toHaveCount(size);
    const viewAll = section.getByRole('link', { name: 'View all news' });
    await expect(viewAll).toHaveAttribute('href', '/news');
    if (!size) await expect(section.getByText('No news yet. Check back soon.')).toBeVisible();
    else {
      const date = section.locator('time').first();
      await expect(date).toContainText('2026');
      await expect(date).toHaveCSS('font-size', '14px');
      await expect(section.getByText('Named reporter')).toHaveCSS('color', 'rgb(51, 65, 85)');
      await expect(section.getByText('Named reporter')).toHaveCSS('font-size', '14px');
      const rowBox = await date.locator('..').boundingBox(), dateBox = await date.boundingBox();
      expect(Math.abs(rowBox!.x + rowBox!.width - dateBox!.x - dateBox!.width)).toBeLessThan(1);
      await expect(cards.first()).toHaveCSS('box-shadow', 'rgba(15, 23, 42, 0.15) 0px 1px 3px 0px');
      await expect(cards.first()).toHaveAccessibleName(/Official announcement|A very long/);
      if (size >= 2) await expect(section.locator('img[src$="test-news-broken.jpg"]')).toHaveCount(0);
      const boxes = await cards.evaluateAll(nodes => nodes.map(el => { const r = el.getBoundingClientRect(); return { x: r.x, width: r.width, height: r.height }; }));
      if (size >= 3) expect(new Set(boxes.map(b => b.x)).size).toBe(width < 640 ? 1 : width < 1024 ? 2 : 3);
      if (size === 2 && width >= 1024) expect(boxes[0].width).toBeGreaterThan(boxes[1].width);
      if (size >= 3) boxes.forEach(box => expect(Math.abs(box.height - boxes[0].height)).toBeLessThan(1));
      if (size >= 3 && width >= 1024) {
        const tops = await cards.locator('h3').evaluateAll(nodes => nodes.slice(0, 3).map(node => node.getBoundingClientRect().top));
        tops.forEach(top => expect(Math.abs(top - tops[0])).toBeLessThan(1));
      }
    }
    await viewAll.focus();
    await expect(viewAll).toHaveCSS('outline-width', '2px');
    for (const card of await cards.all()) {
      await page.keyboard.press('Tab');
      await expect(card).toBeFocused();
      await expect(card).toHaveCSS('outline-width', '2px');
    }
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await section.screenshot({ path: resolve(artifacts, `after-${width}-${size}-articles.png`) });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
