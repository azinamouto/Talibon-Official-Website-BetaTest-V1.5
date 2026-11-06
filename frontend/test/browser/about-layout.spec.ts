import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const mayors = JSON.parse(readFileSync(resolve('test/fixtures/about-mayors.json'), 'utf8'));
const prose = 'Talibon municipal information. '.repeat(150);
for (const width of [375, 768, 1280, 1920]) test(`About container and mayoral eras at ${width}px`, async ({ page, context }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await context.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    const data = path.endsWith('/mayors') ? mayors
      : path.endsWith('/directory') ? [{ department: "Mayor's Office", contact: '038-123-4567' }]
      : path.endsWith('/departments') ? [{ name: "Mayor's Office", officialName: 'Office of the Municipal Mayor', description: prose, type: 'Office' }]
      : path.endsWith('/barangays') ? ['Poblacion']
      : path.endsWith('/services') ? { data: [{ name: 'Service', description: prose }] }
      : { content: prose, description: prose, title: 'Talibon', lyrics: 'Talibon', lat: 10.1517, lng: 124.3333 };
    return route.fulfill({ json: data });
  });
  for(const path of ['profile','seal','history','demographics','location','vicinity','industry','services','hymn','departments','barangays']) {
    await page.goto(`/about/${path}`);
    const heading = page.locator('main h1');
    await expect(heading).toBeVisible();
    await expect(page.getByRole('status', { name:'Loading content' })).toHaveCount(0);
    const r = await heading.boundingBox();
    const headerBottom = await page.locator('header').first().evaluate(el => el.getBoundingClientRect().bottom);
    expect(r!.y).toBeGreaterThan(headerBottom);
    expect(Math.round(r!.x)).toBe(width >= 1024 ? 32 : width >= 640 ? 24 : 16);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if(path==='profile') {
      const paragraph = page.locator('main p').first();
      expect((await paragraph.boundingBox())!.x).toBe(r!.x);
      expect(await paragraph.evaluate(el => el.getBoundingClientRect().width)).toBeLessThanOrEqual(900);
    }
  }
  await page.goto('/executive/directory');
  await expect(page.locator('main article')).toHaveCount(19);
  expect(Math.round((await page.locator('main h1').boundingBox())!.x)).toBe(width >= 1024 ? 32 : width >= 640 ? 24 : 16);
  await page.goto('/about/mayors');
  const eras = page.locator('main section[aria-labelledby]');
  await expect(eras).toHaveCount(mayors.length);
  const navigation = page.getByRole('navigation', { name: 'Jump to mayoral era' });
  await expect(navigation.getByRole('link')).toHaveCount(mayors.length);
  for (let index=0; index<mayors.length; index++) {
    const cards=eras.nth(index).locator('ol > li');
    await expect(cards).toHaveCount(mayors[index].mayors.length);
    const boxes=await cards.evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,height:Math.round(r.height)};}));
    expect(new Set(boxes.map(b=>b.x)).size).toBe(Math.min(boxes.length,width>=1536?4:width>=1024?3:width>=640?2:1));
    const rows=new Map<number,number[]>();
    for(const b of boxes) rows.set(b.y,[...(rows.get(b.y)||[]),b.height]);
    for(const heights of rows.values()) expect(new Set(heights).size).toBe(1);
    expect(await cards.locator('[class*="termRow"] span').evaluateAll(els=>els.every(el=>el.scrollWidth<=el.clientWidth))).toBe(true);
  }
  await page.screenshot({ path:`test-results/about-mayors-${width}.png` });
  const target=navigation.getByRole('link').nth(3);
  await target.focus();
  await expect(target).toHaveCSS('outline-style','solid');
  await page.keyboard.press('Enter');
  await expect(target).toHaveAttribute('aria-current','location');
  await expect(page).toHaveURL(/#mayoral-era-3$/);
  const navBounds=await navigation.boundingBox();
  const eraBounds=await eras.nth(3).boundingBox();
  const headerBottom=await page.locator('header').first().evaluate(el=>el.getBoundingClientRect().bottom);
  expect(navBounds!.y).toBeGreaterThanOrEqual(headerBottom);
  expect(eraBounds!.y).toBeGreaterThanOrEqual(navBounds!.y+navBounds!.height);
  await eras.nth(3).locator('li').first().focus();
  await expect(eras.nth(3).locator('li').first()).toHaveCSS('outline-style','solid');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
