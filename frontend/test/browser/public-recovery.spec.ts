import {test,expect} from '@playwright/test';
import {staticAboutPages} from '../../../backend/src/api/about/static-pages';

test('published history wins and malformed timelines and HTTP failures remain errors',async({page})=>{
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  await page.route('**/api/**',route=>route.fulfill({json:[]}));
  let response:unknown={content:'Published history fixture',timeline:[{year:'2000',title:'Published milestone fixture',description:'Fixture description'}]};
  let status=200;
  await page.route('**/api/about/history',route=>route.fulfill({status,json:response}));
  await page.goto('/about/history');
  await expect(page.getByText('Published history fixture',{exact:true})).toBeVisible();
  await expect(page.getByText('Published milestone fixture',{exact:true})).toBeVisible();
  response={content:'Fixture',timeline:[{year:'2000',title:{invalid:true},description:'Fixture'}]};
  await page.reload();
  await expect(page.getByRole('alert')).toBeVisible();
  status=401;
  await page.reload();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page).toHaveURL(/\/about\/history$/);
});

for(const width of [375,1280])test(`public recovery preserves anonymous access at ${width}px`,async({page})=>{
  test.setTimeout(60000);
  await page.setViewportSize({width,height:900});
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  await page.route('**/api/**',route=>{
    const path=new URL(route.request().url()).pathname;
    if(path==='/api/staff/me')return route.fulfill({status:401,json:{message:'Unauthorized'}});
    if(path==='/api/executive/chart')return route.fulfill({json:{}});
    const slug=path.replace('/api/','').replace('/','-');
    return route.fulfill({json:staticAboutPages[slug] || []});
  });
  await page.goto('/executive/chart');
  await expect(page.getByText('Structure Not Found')).toBeVisible();
  await expect(page).toHaveURL(/\/executive\/chart$/);
  for(const path of ['profile','history','seal','vicinity','hymn','demographics','location']){
    await page.goto(`/about/${path}`);
    await expect(page.locator('main').getByRole('heading',{level:1})).toBeVisible();
    await expect(page.getByRole('status',{name:'Loading content'})).toHaveCount(0);
    await expect(page.getByText('No content available at this time.')).toHaveCount(0);
    await expect(page.getByRole('alert')).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});
