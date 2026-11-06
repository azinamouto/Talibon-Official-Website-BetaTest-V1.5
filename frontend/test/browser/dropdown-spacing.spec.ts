import { test, expect } from '@playwright/test';
const description = 'Municipal information supplied for this layout verification. '.repeat(30);
const image='https://example.com/layout.png';
const records = Array.from({length:5},(_,i)=>({id:`item-${i+1}`,title:`Published record ${i+1}`,name:`Destination ${i+1}`,description,date:'2026-11-06',status:'Published',budget:'100,000',deadline:'2026-12-01',url:'#document',banner_image:image,featured_image:image,location:'Talibon, Bohol',category:'ISLAND',gallery_images:[image,image],google_maps_link:'https://www.google.com/maps?q=10.1517,124.3333'}));
const routes = [
  ['/transparency/disclosure','Full Disclosure',false],
  ['/transparency/infrastructure','Infrastructure Projects',true],
  ['/transparency/finance','Finance Reports',false],
  ['/transparency/orders','Executive Orders',false],
  ['/transparency/budget','Budget and Finances',false],
  ['/transparency/biddings','Biddings',true],
  ['/news/articles','News & Updates',true],
  ['/news/advisories','News & Updates',true],
  ['/news/updates','News & Updates',true],
  ['/news/gallery','News & Updates',false],
  ['/tourism/map','Interactive Tourism Map',false],
  ['/tourism/spots','Tourist Spots',true],
  ['/tourism/festivities','Festivities',true],
  ['/tourism/delicacies','Local Delicacies',true],
  ['/news/view/layout-article','Article detail',false],
  ['/news/view/layout-advisory','Article detail',false],
] as const;
for(const width of [375,768,1280,1920]) test(`dropdown page spacing and detail layouts at ${width}px`, async({page,context})=>{
  test.setTimeout(180000);
  await page.setViewportSize({width,height:1000});
  await page.emulateMedia({reducedMotion:'reduce'});
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1cAAAAASUVORK5CYII=','base64');
  await context.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.hostname==='127.0.0.1')return route.continue();
    if(route.request().resourceType()==='image')return route.fulfill({contentType:'image/png',body:png});
    return route.abort();
  });
  await context.route('http://127.0.0.1:54321/**',route=>route.fulfill({json:/\/(tourism_spots|events)(?:\?|$)/.test(new URL(route.request().url()).pathname)?records:[]}));
  await context.route('**/api/**',route=>{
    const url=new URL(route.request().url());
    const path=url.pathname;
    if(path==='/api/news')return route.fulfill({json:{data:url.searchParams.has('slug')?[{id:'layout-article',title:'Article detail',summary:'Article summary',content:description,category:'ARTICLE',date:'2026-11-06',image_url:image}]:records.map(r=>({...r,summary:description,content:description,image_url:image,category:'ARTICLE'})),pagination:{page:Number(url.searchParams.get('page')||1),limit:12,total:17,totalPages:2}}});
    if(path.endsWith('/budget'))return route.fulfill({json:{annualBudget:'100,000',breakdown:[{sector:'Services',amount:'100,000'}],documents:records.map(r=>({...r,file_url:'#document'}))}});
    if(path.startsWith('/transparency/')||path.startsWith('/tourism/')||path.startsWith('/api/transparency/')||path.startsWith('/api/tourism/'))return route.fulfill({json:records});
    return route.fulfill({json:[]});
  });
  const gutter=width>=1024?32:width>=640?24:16;
  for(const [path,title,cards] of routes){
    await page.goto(path);
    await page.addStyleTag({content:'[style*="opacity"]{opacity:1!important}[style*="transform"]{transform:none!important}'});
    const heading=page.locator('#main-content h1');
    await expect(heading).toHaveText(title);
    await expect(page.getByRole('status',{name:'Loading content',exact:true})).toHaveCount(0);
    if(!path.endsWith('/gallery'))await expect(page.locator('#main-content [role="status"]').filter({hasText:/Loading/})).toHaveCount(0);
    const h=await heading.boundingBox();
    expect(Math.round(h!.x),path).toBe(gutter);
    expect(h!.y,path).toBeGreaterThan(await page.locator('header').first().evaluate(el=>el.getBoundingClientRect().bottom));
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),path).toBe(true);
    if(cards){
      const grid=page.locator('#main-content [class*="_cards_"]').first();
      await expect(grid.locator(':scope > *')).toHaveCount(5);
      const boxes=await grid.locator(':scope > *').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height)};}));
      expect(new Set(boxes.map(r=>r.x)).size,path).toBe(width>=1536?4:width>=1024?3:width>=640?2:1);
      expect(new Set(boxes.map(r=>r.width)).size,path).toBe(1);
      const rows=new Map<number,number[]>();for(const b of boxes)rows.set(b.y,[...(rows.get(b.y)||[]),b.height]);
      for(const heights of rows.values())expect(new Set(heights).size,path).toBe(1);
      await expect(grid).toHaveCSS('gap','24px');
      const g=await grid.boundingBox();expect(Math.round(g!.x),path).toBe(gutter);expect(Math.round(g!.width),path).toBe(width-gutter*2);
    }
    if(path==='/news/articles'){
      const search=page.getByRole('search');expect(Math.round((await search.boundingBox())!.x)).toBe(gutter);
      const pagination=page.getByRole('navigation',{name:'Pagination'});expect(Math.round((await pagination.boundingBox())!.width)).toBe(width-gutter*2);
      await page.getByRole('button',{name:'Next',exact:true}).click();await expect(page).toHaveURL(/page=2/);await expect(page.getByRole('status').filter({hasText:'Page 2'})).toBeVisible();
    }
    if(path==='/news/gallery')await expect(page.getByText('No news found. Try another search or category.')).toBeVisible();
    if(path.startsWith('/news/view')){
      const paragraphs=page.locator('#main-content article p');
      expect(await paragraphs.evaluateAll(els=>els.every(el=>el.getBoundingClientRect().width<=900))).toBe(true);
    }
    if(path==='/tourism/map'){
      const map=page.getByLabel('Public locations map',{exact:true});await expect(map).toBeVisible();
      expect(Math.round((await map.boundingBox())!.width)).toBe(width-gutter*2);
      await expect(page.getByRole('button',{name:'Zoom in',exact:true})).toBeVisible();
      await expect(page.locator('#main-content table')).toHaveCount(1);
      await expect(page.locator('#main-content table').locator('..')).toHaveCSS('overflow-x','auto');
    }
    if(path==='/tourism/spots'){
      await page.getByRole('button',{name:'Explore Details',exact:true}).first().click();
      await expect(page.getByRole('heading',{name:'About Destination'})).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Explore Details',exact:true})).toHaveCount(5);
    }
    if(['/news/articles','/transparency/disclosure','/tourism/spots'].includes(path))await page.screenshot({path:`test-results/dropdown-spacing-${path.split('/').pop()}-${width}.png`});
  }
});
