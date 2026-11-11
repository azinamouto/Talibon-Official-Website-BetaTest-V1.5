import { expect, test } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
const { PNG } = createRequire(import.meta.url)(resolve('node_modules/playwright-core/lib/utilsBundle.js')) as {
  PNG: { sync: { read(buffer: Buffer): { width: number; height: number; data: Buffer } } };
};
const artifacts = resolve('node_modules/.cache/five-targeted-ui');
const baseline = process.env.TALWEB_FIVE_BASELINE === '1';
for (const width of [375, 768, 1280, 1440]) test(`five sections and protected hero/header at ${width}px`, async ({ page, context }) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.clock.setFixedTime(new Date('2026-11-04T04:00:00Z'));
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
  const googleRequests: string[] = [];
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') return route.continue();
    if (url.hostname === 'www.google.com') { googleRequests.push(url.href); return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Google Maps fixture</title><p>Municipal Hall map fixture</p>'}); }
    return route.abort();
  });
  await context.route('**/api/**', route => route.fulfill({json:[]}));
  await context.route('**/data/social-updates.json', route => route.fulfill({json:{posts:[]}}));
  await page.goto('/');
  await page.addStyleTag({content:'html{scroll-behavior:auto!important}*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important} [style*="opacity"]{opacity:1!important} [style*="transform"]{transform:none!important}'});
  await page.mouse.move(width-1, 999);
  mkdirSync(artifacts,{recursive:true});
  for (const [name, selector] of [['header','header'],['hero','#home']]) {
    const element=page.locator(selector).first();
    const buffer=await element.screenshot({animations:'disabled'});
    const before=resolve(artifacts,`before-${name}-${width}.png`);
    writeFileSync(resolve(artifacts,`${baseline?'before':'after'}-${name}-${width}.png`),buffer);
    if(!baseline && existsSync(before)) {
      const a=PNG.sync.read(readFileSync(before)), b=PNG.sync.read(buffer);
      expect([b.width,b.height]).toEqual([a.width,a.height]);
      let changedPixels=0;
      for(let i=0;i<a.data.length;i+=4) if(a.data[i]!==b.data[i]||a.data[i+1]!==b.data[i+1]||a.data[i+2]!==b.data[i+2]||a.data[i+3]!==b.data[i+3])changedPixels++;
      console.log(JSON.stringify({width,protectedRegion:name,changedPixels}));
      expect(changedPixels).toBe(0);
    }
  }
  if(!baseline) {
    const map=page.locator('#location');
    await expect(map.locator('iframe')).toHaveCount(1);
    await expect(map.getByRole('button',{name:'Tap to explore'})).toHaveCount(0);
    expect(googleRequests).toHaveLength(1);
    await expect(map.locator('iframe')).toHaveAttribute('loading','eager');
    await expect(map).toContainText('10.12');
    const frame=await map.locator('#talibon-map').boundingBox(), details=await map.locator('[data-location-panel]').boundingBox();
    expect(details!.y).toBeGreaterThanOrEqual(frame!.y+frame!.height);
    await expect(page.locator('#services')).toHaveCSS('background-color','rgb(0, 89, 138)');
    await expect(page.locator('#services')).toHaveCSS('background-image','none');
    expect(await page.locator('#services').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe(await page.locator('#transparency').evaluate(el=>getComputedStyle(el).backgroundColor));
    await expect(page.locator('#services h3')).toHaveCount(6);
    await expect(page.getByText('MUNICIPAL SERVICES & REAL ESTATE', { exact: true }).locator('..').locator('svg')).toHaveCount(0);
    await expect(page.locator('#popular-services')).toHaveCSS('background-color','rgb(0, 89, 138)');
    await expect(page.locator('#emergency')).toHaveCSS('background-color','rgb(114, 11, 11)');
    await expect(page.locator('#about h2')).toHaveCSS('font-size','24px');
    await expect(page.locator('#about [class*="mayorCard"]')).toHaveCount(0);
    await expect(page.locator('#about img').last()).toHaveAttribute('src',/mayor-janette.webp$/);
  }
  for(const id of ['about','services','emergency','location','popular-services']) {
    const section=page.locator('#'+id);
    await section.scrollIntoViewIfNeeded();
    await section.screenshot({path:resolve(artifacts,`${baseline?'before':'after'}-${id}-${width}.png`),style:'header{opacity:0!important;transition:none!important}'});
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
