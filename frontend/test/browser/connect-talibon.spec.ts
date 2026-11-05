import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const baseline = process.env.TALWEB_CONNECT_BASELINE === '1';
const artifacts = resolve('node_modules/.cache/connect-talibon');
for (const width of [360, 768, 1280, 1920]) test(`connect with Talibon layout and map at ${width}px`, async ({ page, context }) => {
  await page.setViewportSize({ width, height: 1100 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const googleRequests: string[] = [];
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') return route.continue();
    if (url.hostname === 'www.google.com') {
      googleRequests.push(url.href);
      return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Map fixture</title><p>Google map fixture</p>' });
    }
    return route.abort();
  });
  await context.route('**/api/**', route => route.fulfill({ json: [] }));
  await context.route('**/data/social-updates.json', route => route.fulfill({ json: { posts: [] } }));
  await page.goto('/');
  await page.addStyleTag({ content: 'html {scroll-behavior:auto!important} header {opacity:0!important;transition:none!important}' });
  mkdirSync(artifacts, { recursive: true });
  if (baseline) {
    for (const id of ['social-updates', 'location']) {
      const section = page.locator('#' + id);
      await section.scrollIntoViewIfNeeded();
      await section.screenshot({ path: resolve(artifacts, `before-${id}-${width}.png`) });
    }
    return;
  }
  const section = page.getByRole('region', { name: 'Connect with Talibon' });
  await section.scrollIntoViewIfNeeded();
  const location = section.locator('#location');
  await expect(section.getByRole('heading', { name: 'Information Office', exact: true })).toBeVisible();
  await expect(section.locator('img[src$="facebook-supplied.jpg"]').first()).toBeVisible();
  const morePages = section.getByRole('button', { name: /More Talibon pages/ });
  await expect(morePages).toHaveAttribute('aria-expanded', 'false');
  await morePages.click();
  await expect(morePages).toHaveAttribute('aria-expanded', 'true');
  await expect(section.locator('#social-updates li')).toHaveCount(6);
  await expect(location.locator('iframe')).toHaveCount(1);
  await expect(location.locator('iframe')).toHaveAttribute('loading', 'eager');
  expect(googleRequests).toHaveLength(1);
  await expect(location.getByRole('button', {name:'Tap to explore'})).toHaveCount(0);
  const frameBox = await location.locator('#talibon-map').boundingBox();
  const panelBox = await location.locator('[data-location-panel]').boundingBox();
  expect(panelBox!.y).toBeGreaterThanOrEqual(frameBox!.y + frameBox!.height);
  await expect(location).toContainText('10.12');
  const socialBox = await section.locator('#social-updates').boundingBox();
  const mapBox = await location.boundingBox();
  if (width >= 1024) {
    expect(mapBox!.x).toBeGreaterThan(socialBox!.x + socialBox!.width);
    expect(mapBox!.height).toBeGreaterThanOrEqual(576);
    expect(mapBox!.width / socialBox!.width).toBeCloseTo(1.5, 1);

  } else expect(mapBox!.y).toBeGreaterThanOrEqual(socialBox!.y + socialBox!.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const directions = location.getByRole('link', { name: /^Get directions/ });
  await expect(directions).toHaveAttribute('href', /destination=Talibon%20Municipal%20Hall/);
  for (const link of await section.locator('a[target="_blank"]').all()) {
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(link).toHaveAccessibleName(/opens in a new tab/);
  }
  const contrast = await section.evaluate(el => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d')!;
    const rgba = (color: string) => { ctx.clearRect(0,0,1,1); ctx.fillStyle=color; ctx.fillRect(0,0,1,1); return [...ctx.getImageData(0,0,1,1).data]; };
    const lum = (rgb: number[]) => rgb.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
    return [...el.querySelectorAll('h2,h3,h4,p,time,address,a,button')].filter(node=>!node.closest('.sr-only')).map(node=>{
      let parent: Element|null=node, background=[255,255,255,255];
      while(parent) { const color=rgba(getComputedStyle(parent).backgroundColor); if(color[3]===255){background=color;break;} parent=parent.parentElement; }
      const foreground=rgba(getComputedStyle(node).color);
      const a=lum(foreground.slice(0,3)), b=lum(background.slice(0,3));
      return {text:node.textContent?.trim(),ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
    });
  });
  for (const pair of contrast) expect(pair.ratio,pair.text).toBeGreaterThanOrEqual(4.5);
  console.log(JSON.stringify({width,minimumTextContrast:Math.min(...contrast.map(pair=>pair.ratio))}));
  // Opening the disclosure uses a mouse; enter keyboard modality before
  // checking :focus-visible rather than the browser's pointer-focus outline.
  await page.keyboard.press('Tab');
  for (const control of await section.locator('a,button').all()) {
    await control.focus();
    await expect(control).toBeFocused();
    await expect(control).toHaveCSS('outline-width','2px');
    await expect(control).toHaveCSS('outline-offset','2px');
    await expect(control).toHaveCSS('outline-color','rgb(0, 89, 138)');
  }
  await directions.blur();
  await section.screenshot({ path: resolve(artifacts, `after-${width}.png`) });
  await expect(location.getByRole('button', { name: 'Close map' })).toHaveCount(0);
  await expect(location.locator('iframe')).toHaveAttribute('tabindex', '-1');
  await expect(location.locator('iframe')).toHaveAttribute('src', /q=Talibon%20Municipal%20Hall/);
  await directions.focus(); await expect(directions).toBeFocused();
});
