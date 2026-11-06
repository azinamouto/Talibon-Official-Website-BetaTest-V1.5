import {test,expect} from '@playwright/test';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
const data=JSON.parse(readFileSync(resolve('test/fixtures/gad-ims.json'),'utf8'));
for(const width of [375,768,1024,1280,1920]) test(`GAD-IMS content and layout at ${width}px`,async({page,context})=>{
  await page.setViewportSize({width,height:1000});
  await page.emulateMedia({reducedMotion:'reduce'});
  await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  await context.route('http://127.0.0.1:54321/**',route=>route.fulfill({json:[]}));
  await context.route('**/api/**',route=>route.fulfill({json:route.request().url().includes('/executive/gad-ims')?data:[]}));
  await page.goto('/executive/gad-ims');
  const main=page.locator('#main-content');
  await expect(main.getByRole('heading',{level:1,name:'Talibon GAD-IMS',exact:true})).toHaveCount(1);
  const access=main.getByRole('link',{name:'Access GAD-IMS',exact:true});
  await expect(access).toHaveCount(1);
  await expect(access).toHaveAttribute('href','https://tagad-sys.vercel.app/');
  await expect(access).toHaveAttribute('target','_blank');
  await expect(access).toHaveAttribute('rel','noopener noreferrer');
  const menu=page.getByRole('navigation',{name:'GAD-IMS sections'});
  await expect(menu.getByRole('button')).toHaveText(data.sections.map((s:any)=>s.title.split('. ')[1]||s.title));
  const box=await main.getByRole('heading',{level:1}).boundingBox();
  const header=await page.locator('header').first().boundingBox();
  expect(box!.y).toBeGreaterThan(header!.y+header!.height);
  for(const section of data.sections){
    const button=menu.getByRole('button',{name:section.title.split('. ')[1]||section.title,exact:true});
    await button.click();
    await expect(button).toHaveAttribute('aria-current','true');
    const content=main.getByRole('region',{name:section.title,exact:true});
    await expect(content).toBeVisible();
    const cards=content.locator('div[class*="cards"] > div');
    await expect(cards).toHaveCount(section.content.length);
    await expect(cards.locator('h3')).toHaveText(section.content.map((s:any)=>s.subTitle));
    await expect(cards.locator('li')).toHaveText(section.content.flatMap((s:any)=>s.items));
    expect(await cards.first().evaluate(el=>getComputedStyle(el.parentElement!).gridTemplateColumns.split(' ').length)).toBe(width>=1024?2:1);
    if(width>=1024 && section.content.length%2===1){
      expect(Math.abs((await cards.last().boundingBox())!.width-(await cards.last().locator('..').boundingBox())!.width)).toBeLessThan(1);
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await menu.getByRole('button').first().click();
  await expect(menu.locator('svg')).toHaveCount(0);
  await expect(main.locator('div[class*="cards"] svg')).toHaveCount(0);
  await access.focus();await page.keyboard.press('Tab');
  await expect(menu.getByRole('button').first()).toBeFocused();
  expect(await menu.getByRole('button').first().evaluate(el=>getComputedStyle(el).outlineWidth)).toBe('3px');
  mkdirSync('node_modules/.cache/gad-review',{recursive:true});
  await page.screenshot({path:`node_modules/.cache/gad-review/after-${width}.png`,fullPage:true});
  if(width>=1024){
    await page.setViewportSize({width,height:600});
    const sidebar=menu.locator('..');
    expect(await sidebar.evaluate(el=>getComputedStyle(el).position)).toBe('sticky');
    expect(await sidebar.evaluate(el=>el.scrollHeight>el.clientHeight)).toBe(true);
    await menu.getByRole('button').last().focus();
    await expect(menu.getByRole('button').last()).toBeInViewport();
    await page.evaluate(()=>window.scrollTo(0,300));
    // Sticky navigation must stop at its section boundary, before the footer.
    const top=await sidebar.evaluate(el=>({actual:el.getBoundingClientRect().top,expected:Math.min(parseFloat(getComputedStyle(el).top),el.parentElement!.getBoundingClientRect().bottom-parseFloat(getComputedStyle(el.parentElement!).paddingBottom)-el.getBoundingClientRect().height)}));
    expect(Math.abs(top.actual-top.expected)).toBeLessThan(2);
  }
});
