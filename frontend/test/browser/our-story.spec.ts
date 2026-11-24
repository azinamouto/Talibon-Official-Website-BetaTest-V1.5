import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

for (const width of [360, 768, 1280, 1920]) test(`Mayor message, real assets and reduced motion at ${width}px`, async ({ page, context }) => {
  await page.setViewportSize({ width, height: 1100 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await context.route('**/api/**', route => route.fulfill({ json: [] }));
  await page.goto('/');
  const section = page.getByRole('region', { name: 'A message from the Mayor' });
  await section.evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
  const portrait = section.getByRole('img', { name: 'Mayor Janette Aurestila-Garcia' });
  const seal = section.getByRole('img', { name: 'Municipal seal of Talibon' });
  const background = section.locator('img[alt=""]');
  for (const image of [portrait, seal, background]) {
    await expect(image).toHaveAttribute('loading', 'lazy');
    await expect.poll(() => image.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
  }
  await expect(portrait).toHaveAttribute('src', /mayor-janette.webp$/);
  await expect(seal).toHaveAttribute('src', /talibon-official-seal.png$/);
  await expect(background).toHaveAttribute('src', /heritage-coast.jpg$/);
  await expect(portrait).toHaveCSS('border-top-left-radius', '50%');
  await expect(portrait).toHaveCSS('border-bottom-left-radius', '14px');
  await expect(seal).toHaveCSS('width', '76px');
  const heading = section.getByRole('heading', { name: 'A message from the Mayor', level: 2 });
  const headingSize = await heading.evaluate(el => parseFloat(getComputedStyle(el).fontSize));
  expect(headingSize).toBeGreaterThanOrEqual(30);
  expect(headingSize).toBeLessThanOrEqual(44);
  await expect(section.locator('.mayor-name')).toHaveText('Hon. Janette Aurestila-Garcia');
  await expect(section.locator('.mayor-title')).toHaveText('Municipal Mayor of Talibon, Bohol');
  await expect(section.locator('dl dt')).toHaveText(['Vision', 'Mission']);
  await expect(section.locator('dl dd')).toHaveText([
    'To be a premier center of commerce and eco-tourism in Northern Bohol.',
    'Empowering citizens through sustainable development and digital governance.',
  ]);
  await expect(section.locator('.mayor-quote > .sr-only')).toHaveText('Dajon kamo sa atong matahum nga Talibon!');
  const history = section.getByRole('link', { name: "Read Talibon's history" });
  await expect(history).toHaveAttribute('href', '/about/history');
  await expect(section.getByRole('link')).toHaveCount(1);
  await history.focus();
  await expect(history).toBeFocused();
  await expect(history).toHaveCSS('outline-color', 'rgb(255, 255, 255)');
  await expect(history).toHaveCSS('outline-width', '3px');
  await expect(history).toHaveCSS('outline-offset', '4px');
  expect(await section.evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
  await expect(background).toHaveCSS('transform', 'none');
  expect(await section.locator('.mayor-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(width < 760 ? 1 : 2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await history.blur();
  mkdirSync('node_modules/.cache/talweb-story-review', { recursive: true });
  await section.screenshot({ path: `node_modules/.cache/talweb-story-review/after-${width}.png`, style: 'header {visibility:hidden!important}' });
});

test('Mayor reveals stay readable, finish promptly and do not replay', async ({ page, context }) => {
  await page.setViewportSize({ width: 1280, height: 1100 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await context.route('**/api/**', route => route.fulfill({ json: [] }));
  await page.goto('/');
  const section = page.locator('#about');
  await section.evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await expect(section).toHaveAttribute('data-welcome-entered', 'true');
  expect(await section.locator('.mayor-lead').evaluate(el => Number(getComputedStyle(el).opacity))).toBeGreaterThanOrEqual(.65);
  const reveals = await section.evaluate(el => el.getAnimations({ subtree: true })
    .filter(animation => animation.timeline === document.timeline)
    .map(animation => { const timing = animation.effect!.getTiming(); return Number(timing.duration) + Number(timing.delay); }));
  expect(reveals.every(duration => duration <= 450)).toBe(true);
  await section.locator('.mayor-values').scrollIntoViewIfNeeded();
  await expect(section.locator('.mayor-values')).toHaveAttribute('data-values-entered', 'true');
  await expect.poll(() => section.evaluate(el => el.getAnimations({ subtree: true })
    .filter(animation => animation.playState === 'running' && animation.timeline === document.timeline).length)).toBe(0);
  await page.locator('#services').scrollIntoViewIfNeeded();
  await section.evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
  expect(await section.evaluate(el => el.getAnimations({ subtree: true })
    .filter(animation => animation.playState === 'running' && animation.timeline === document.timeline).length)).toBe(0);
});
