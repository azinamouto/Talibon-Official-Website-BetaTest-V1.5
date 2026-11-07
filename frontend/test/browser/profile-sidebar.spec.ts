import {test,expect} from '@playwright/test';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
const {PNG}=createRequire(import.meta.url)(resolve('node_modules/playwright-core/lib/utilsBundle.js'));
const profile=JSON.parse(readFileSync(resolve('test/fixtures/about-profile.json'),'utf8'));
const history=JSON.parse(readFileSync(resolve('test/fixtures/about-history.json'),'utf8'));
const mayors=JSON.parse(readFileSync(resolve('test/fixtures/about-mayors.json'),'utf8'));
const baseline=process.env.TALWEB_PROFILE_BASELINE==='1';
const artifacts=resolve('node_modules/.cache/profile-review');
// Barangay Profiles now has its own intentional redesign and responsive tests.
const unchanged=['history','seal','demographics','location','industry','services','hymn','mayors','vicinity','departments'];
for(const width of [375,768,1024,1280,1920]) test(`profile sidebar and unchanged About pages at ${width}px`,async({page,context})=>{
  test.setTimeout(180000);
  await page.setViewportSize({width,height:1000});
  await page.clock.setFixedTime(new Date('2026-11-06T06:00:00Z'));
  await page.emulateMedia({reducedMotion:'reduce',colorScheme:'light'});
  await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  await context.route('http://127.0.0.1:54321/**',route=>route.fulfill({json:[]}));
  await context.route('**/api/**',route=>{
    const path=new URL(route.request().url()).pathname;
    const data=path.endsWith('/profile')?profile:path.endsWith('/history')?history:path.endsWith('/mayors')?mayors
      :path.endsWith('/departments')?[{name:'Agriculture Office',officialName:'Office Of Municipal Agriculturist',type:'Development Office',description:'Municipal services',head:'Office head',contact:'038-123-4567'}]
      :path.endsWith('/barangays')?['Poblacion']
      :path.endsWith('/services')?{data:[{name:'Published service',description:'Municipal services'}]}
      :{title:'Municipal information',content:'Published municipal information.',description:'Published municipal information.',lyrics:'Talibon',lat:10.1517,lng:124.3333};
    return route.fulfill({json:data});
  });
  mkdirSync(artifacts,{recursive:true});
  for(const path of ['profile',...unchanged]){
    await page.goto(`/about/${path}`);
    await page.addStyleTag({content:'html{scroll-behavior:auto!important}*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}[style*="opacity"]{opacity:1!important}[style*="transform"]{transform:none!important}'});
    await expect(page.getByRole('status',{name:'Loading content',exact:true})).toHaveCount(0);
    await page.locator('#main-content h1').waitFor();
    await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(img=>(img as HTMLImageElement).decode().catch(()=>{}))));
    const buffer=await page.screenshot({animations:'disabled'});
    const file=resolve(artifacts,`before-${path}-${width}.png`);
    if(baseline)writeFileSync(file,buffer);
    else if(path!=='profile' && existsSync(file)){
      writeFileSync(resolve(artifacts,`after-${path}-${width}.png`),buffer);
      const before=PNG.sync.read(readFileSync(file)),after=PNG.sync.read(buffer);
      expect([after.width,after.height]).toEqual([before.width,before.height]);
      const headerBottom=Math.ceil(await page.locator('header').first().evaluate(el=>el.getBoundingClientRect().bottom));
      let changed=0,headerRounding=0,minX=width,minY=1000,maxX=0,maxY=0;
      for(let y=0;y<after.height;y++)for(let x=0;x<after.width;x++){
        const i=(y*after.width+x)*4;
        if(before.data[i]!==after.data[i]||before.data[i+1]!==after.data[i+1]||before.data[i+2]!==after.data[i+2]){
          // The header's existing backdrop blur can round a border channel by 1/255.
          // Require exact pixels everywhere else; never mask content differences.
          if(y<=headerBottom && Math.max(...[0,1,2].map(c=>Math.abs(before.data[i+c]-after.data[i+c])))<=1){headerRounding++;continue;}
          changed++;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
      }
      console.log(JSON.stringify({path,width,changed,headerRounding,bounds:[minX,minY,maxX,maxY]}));
      expect(changed,`${path} ${width}px screenshot`).toBe(0);
    }else if(path==='profile'){
      const article=page.locator('main article');
      const blocks=profile.content.split(/\r?\n(?:[ \t]*\r?\n)+/).filter((p:string)=>p.length>0);
      expect(await article.locator('p').allTextContents()).toEqual(blocks);
      await expect(article.locator('h2,h3')).toHaveCount(0);
      await expect(page.getByRole('navigation',{name:'On this page'})).toHaveCount(0);
      const sidebar=page.getByRole('complementary',{name:'About Talibon'});
      await expect(sidebar).toBeVisible();
      const links=sidebar.getByRole('link');await expect(links).toHaveCount(10);
      await expect(links.first()).toHaveAttribute('aria-current','page');
      const p=await article.boundingBox(),s=await sidebar.boundingBox();
      if(width>=1024){expect(s!.width).toBe(320);expect(s!.x).toBeGreaterThan(p!.x+p!.width);}
      else {expect(s!.y).toBeGreaterThan(p!.y+p!.height);expect(Math.round(s!.width)).toBe(width-(width>=640?48:32));}
      await links.first().focus();await expect(links.first()).toHaveCSS('outline-style','solid');
      if(width>=1024){await page.evaluate(()=>scrollTo(0,1000));const sticky=await sidebar.boundingBox();const headerBottom=await page.locator('header').first().evaluate(el=>el.getBoundingClientRect().bottom);expect(sticky!.y).toBeGreaterThanOrEqual(headerBottom);expect(sticky!.y).toBeLessThan(300);}
      await page.evaluate(()=>scrollTo(0,0));
      await page.screenshot({path:resolve(artifacts,`after-profile-${width}.png`)});
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),path).toBe(true);
  }
});
