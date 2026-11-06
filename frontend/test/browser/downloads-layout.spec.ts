import { test, expect } from '@playwright/test';
const business=[{id:1,title:'Business Permit Application Form',url:'#'},{id:2,title:'Business Permit Renewal Form',url:'#'}];
const buildings=[{id:1,title:'Building Permit Application Form',url:'#'},{id:2,title:'Electrical Permit Form',url:'#'},{id:3,title:'Plumbing Permit Form',url:'#'}];
const zoning=[{id:1,title:'Zoning Clearance Application Form',url:'#'}];
for(const width of [375,768,1280,1920]) test(`Downloadables layout, icon contrast and preserved controls at ${width}px`,async({page,context})=>{
  await page.setViewportSize({width,height:1000});
  await page.emulateMedia({reducedMotion:'reduce'});
  await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  await context.route('http://127.0.0.1:54321/**',route=>route.fulfill({json:new URL(route.request().url()).pathname.endsWith('/downloadables')?[{id:'finance',title:'test finance',file_url:'https://example.com/finance.jpg',category:'Reports',file_size:'1.2 MB'}]:[]}));
  await context.route('**/api/**',route=>{
    const path=new URL(route.request().url()).pathname;
    const data=path.endsWith('/business-permits')?business:path.endsWith('/building-permits')?buildings:path.endsWith('/zoning-clearance')?zoning:[];
    return route.fulfill({json:data});
  });
  await page.goto('/downloads');
  await page.addStyleTag({content:'[style*="opacity"]{opacity:1!important}[style*="transform"]{transform:none!important}'});
  const heading=page.getByRole('heading',{name:'DOWNLOADABLES',exact:true});
  await expect(heading).toBeVisible();
  const cards=page.locator('[class*="_card_"]').filter({has:page.getByRole('link',{name:'Download File',exact:true})});
  await expect(cards).toHaveCount(11);
  const gutter=width>=1024?32:width>=640?24:16;
  const headerBottom=await page.locator('header').first().evaluate(el=>el.getBoundingClientRect().bottom);
  expect((await page.getByText('Resources',{exact:true}).boundingBox())!.y).toBeGreaterThan(headerBottom);
  expect(Math.round((await heading.boundingBox())!.x)).toBe(gutter);
  const grid=cards.first().locator('..');
  await expect(grid).toHaveCSS('gap','24px');
  const g=await grid.boundingBox();expect(Math.round(g!.x)).toBe(gutter);expect(Math.round(g!.width)).toBe(width-gutter*2);
  const boxes=await cards.evaluateAll(els=>els.map(el=>{
    const r=el.getBoundingClientRect(),a=el.querySelector('a')!.getBoundingClientRect();
    return {x:r.x,y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height),buttonBottom:Math.round(a.bottom)};
  }));
  expect(new Set(boxes.map(r=>r.x)).size).toBe(width>=1536?4:width>=1024?3:width>=640?2:1);
  expect(new Set(boxes.map(r=>r.width)).size).toBe(1);
  const rows=new Map<number,typeof boxes>();for(const b of boxes)rows.set(b.y,[...(rows.get(b.y)||[]),b]);
  for(const row of rows.values()){
    expect(new Set(row.map(b=>b.height)).size).toBe(1);
    expect(new Set(row.map(b=>b.buttonBottom)).size).toBe(1);
  }
  const icons=cards.locator('[class*="_iconTile_"] svg');
  await expect(icons).toHaveCount(11);
  for(const icon of await icons.all()){
    await expect(icon).toHaveAttribute('aria-hidden','true');
    await expect(icon).toHaveAttribute('stroke','currentColor');
    await expect(icon).toHaveAttribute('width','24');await expect(icon).toHaveAttribute('stroke-width','2');
    await expect(icon).toHaveCSS('color','rgb(255, 255, 255)');
    await expect(icon.locator('..')).toHaveCSS('background-color','rgb(0, 89, 138)');
  }
  await expect(cards.first().getByRole('link')).toHaveAttribute('href','https://example.com/finance.jpg');
  expect(await cards.getByRole('link').evaluateAll(els=>els.filter(el=>el.getAttribute('href')==='#').length)).toBe(10);
  await expect(page.getByText('N/A',{exact:true})).toHaveCount(6);
  const search=page.getByPlaceholder('Search forms...');
  const desc=page.getByText('Access official forms, application documents, and informative materials from the Municipality of Talibon.',{exact:true});
  const s=await search.boundingBox(),d=await desc.boundingBox();
  if(width>=1024){expect(Math.round(s!.x+s!.width)).toBe(width-gutter);expect(Math.abs(s!.y+s!.height/2-d!.y-d!.height/2)).toBeLessThan(1);}
  else {expect(Math.round(s!.x)).toBe(gutter);expect(Math.round(s!.width)).toBe(width-gutter*2);expect(s!.y).toBeGreaterThan(d!.y+d!.height);}
  await cards.first().hover();await expect(cards.first()).toHaveCSS('border-color','rgb(0, 89, 138)');
  await page.mouse.move(0,0);await expect(cards.first()).toHaveCSS('border-color',await cards.nth(1).evaluate(el=>getComputedStyle(el).borderColor));
  await cards.first().getByRole('link').focus();await expect(cards.first()).toHaveCSS('outline-style','solid');
  await page.getByRole('button',{name:'Business',exact:true}).click();await expect(cards).toHaveCount(2);
  await search.fill('Renewal');await expect(cards).toHaveCount(1);await expect(cards.first()).toContainText('Business Permit Renewal Form');
  await search.fill('No matching file');await expect(page.getByRole('heading',{name:'No files found'})).toBeVisible();
  await search.fill('');await page.getByRole('button',{name:'all',exact:true}).click();await expect(cards).toHaveCount(11);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/downloads-layout-${width}.png`});
});
