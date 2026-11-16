import { test, expect } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
const id='11111111-1111-4111-8111-111111111111';
const category='22222222-2222-4222-8222-222222222222';
const source='33333333-3333-4333-8333-333333333333';
test('editor uploads, previews, edits and publishes a private photo on mobile and desktop', async ({page,context},info) => {
  test.setTimeout(60000);
  await context.route('**/api/**', route => route.fulfill({status:404,json:{}}));
  await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.fallback():route.abort());
  await context.route('**/api/staff/me',route=>route.fulfill({json:{id,role:'editor'}}));
  let asset: Record<string,unknown> | null=null; let fail=true; const uploadIds: string[]=[];
  await context.route('**/api/admin/media**',async route=>{
    const request=route.request(); const url=new URL(request.url());
    if(url.pathname.endsWith('/options')) return route.fulfill({json:{categories:[{id:category,title:'Test category',kind:'photo',approved:true}],sources:[{id:source,reference:'Synthetic browser source',approved:true}]}});
    if(url.pathname.endsWith('/uploads')) {
      const body=request.postDataJSON();uploadIds.push(body.uploadId);
      if(fail){fail=false;return route.fulfill({status:503,json:{message:'Temporary failure'}});}
      asset={id,title:body.title,description:body.description,alt_text:body.altText,category_id:category,kind:'photo',mime:'image/png',bytes:68,processing:'ready',publication:'draft',version:2};
      return route.fulfill({json:asset});
    }
    if(url.pathname.endsWith('/preview')) return route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=','base64')});
    if(request.method()==='POST') {
      const body=request.postDataJSON();
      if(url.pathname.endsWith('/edit')) asset={...asset,title:body.title};
      else asset={...asset,publication:url.pathname.endsWith('/unpublish')?'draft':'published'};
      return route.fulfill({json:asset});
    }
    return route.fulfill({json:{data:asset?[asset]:[],hasMore:false}});
  });
  await page.setViewportSize({width:375,height:812});await page.goto('/cms?tab=photos');
  await expect(page.getByRole('heading',{name:'Photos',exact:true})).toBeVisible();
  await page.getByLabel('File',{exact:true}).setInputFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from('synthetic-browser-upload')});
  await page.getByLabel('Title',{exact:true}).fill('Test photo');
  await page.getByLabel('Alternative text').fill('Test image');await page.getByLabel('Category',{exact:true}).selectOption(category);await page.getByLabel('Source record').selectOption(source);
  await page.getByRole('button',{name:'Upload private draft'}).click();await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button',{name:'Upload private draft'}).click();await expect(page.getByRole('heading',{name:'Test photo'})).toBeVisible();expect(uploadIds[0]).toBe(uploadIds[1]);
  await page.getByRole('button',{name:'Preview',exact:true}).click();await expect(page.getByRole('img',{name:'Test photo'})).toBeVisible();
  await page.getByRole('button',{name:'Close preview'}).click();
  await page.getByRole('button',{name:'Edit metadata',exact:true}).click();await page.getByLabel('Title',{exact:true}).fill('Updated photo');await page.getByRole('button',{name:'Save metadata'}).click();
  await expect(page.getByRole('heading',{name:'Updated photo'})).toBeVisible();
  await page.getByRole('button',{name:'Publish',exact:true}).click();await expect(page.getByRole('button',{name:'Unpublish',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Unpublish',exact:true}).click();await expect(page.getByRole('button',{name:'Publish',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Delete',exact:true})).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:info.outputPath('media-mobile.png'),fullPage:true});
  await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:info.outputPath('media-desktop.png'),fullPage:true});
});
test('admin deletion requires explicit confirmation and MFA',async({page,context})=>{
  await context.route('**/api/**', route => route.fulfill({status:404,json:{}}));
  await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.fallback():route.abort());
  await context.route('**/api/staff/me',route=>route.fulfill({json:{id,role:'admin'}}));
  await context.route('**/api/staff?*',route=>route.fulfill({json:{data:[],pagination:{hasMore:false}}}));
  await context.route('**/api/staff/audit?*',route=>route.fulfill({json:{data:[],pagination:{hasMore:false}}}));
  let removed=false,mfa=false;
  await context.route('**/api/staff-auth/two-factor/verify-totp',route=>{mfa=true;return route.fulfill({json:{}});});
  await context.route('**/api/admin/media**',route=>{
    if(route.request().url().endsWith('/options'))return route.fulfill({json:{categories:[],sources:[]}});
    if(route.request().url().endsWith('/delete')){expect(mfa).toBe(true);removed=true;return route.fulfill({json:{}});}
    return route.fulfill({json:{data:removed?[]:[{id,title:'Synthetic file',description:'',alt_text:'',category_id:category,kind:'document',mime:'application/pdf',bytes:100,processing:'ready',publication:'draft',version:1}],hasMore:false}});
  });
  await page.goto('/cms?tab=documents');await page.getByRole('button',{name:'Delete',exact:true}).click();
  await expect(page.getByRole('button',{name:'Confirm deletion'})).toBeDisabled();await page.getByLabel('Deletion authenticator code').fill('123456');
  await page.getByRole('button',{name:'Confirm deletion'}).click();await expect(page.getByText('Media deleted from the CMS.')).toBeVisible();expect(removed).toBe(true);
});
test('document viewing offers the validated PDF download without an embedded frame',async({page,context})=>{
  await context.route('**/api/**', route => route.fulfill({status:404,json:{}}));
  await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.fallback():route.abort());
  const pdf=await PDFDocument.create();pdf.addPage();const bytes=Buffer.from(await pdf.save());
  await context.route('**/api/staff/me',route=>route.fulfill({json:{id,role:'editor'}}));
  await context.route('**/api/admin/media**',route=>{
    if(route.request().url().endsWith('/options'))return route.fulfill({json:{categories:[],sources:[]}});
    if(route.request().url().endsWith('/preview'))return route.fulfill({contentType:'application/pdf',body:bytes});
    return route.fulfill({json:{data:[{id,title:'Synthetic PDF',description:'',alt_text:'',category_id:category,kind:'document',mime:'application/pdf',bytes:bytes.length,processing:'ready',publication:'draft',version:1}],hasMore:false}});
  });
  await page.goto('/cms?tab=documents');await page.getByRole('button',{name:'Preview',exact:true}).click();
  await expect(page.getByRole('link',{name:'Download PDF',exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'Download PDF',exact:true})).toHaveAttribute('href',/^blob:/);
  await expect(page.locator('iframe')).toHaveCount(0);
  await expect(page.getByRole('link',{name:'Download',exact:true})).toHaveAttribute('href',`/api/admin/media/${id}/download`);
  // Verify exact authorized bytes without relying on a browser PDF viewer or weakening CSP.
  const preview=await page.getByRole('link',{name:'Download PDF',exact:true}).evaluate(async link=>{
    const response=await fetch((link as HTMLAnchorElement).href);
    const blob=await response.blob();
    return {type:blob.type,bytes:Array.from(new Uint8Array(await blob.arrayBuffer()))};
  });
  expect(preview.type).toBe('application/pdf');
  expect(preview.bytes).toEqual(Array.from(bytes));
  await page.getByRole('button',{name:'Close preview'}).click();await expect(page.getByRole('link',{name:'Download PDF',exact:true})).toHaveCount(0);
});

test('staff uploads a PDF with progress and uses only the photo/document CMS',async({page,context})=>{
  await context.route('**/api/**', route => route.fulfill({status:404,json:{}}));
  await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.fallback():route.abort());
  const pdf=await PDFDocument.create();pdf.addPage();const bytes=Buffer.from(await pdf.save());
  await context.route('**/api/staff/me',route=>route.fulfill({json:{id,role:'editor'}}));
  let asset: any=null,releaseUpload: (()=>void)|undefined;
  const uploaded=new Promise<void>(resolve=>{releaseUpload=resolve;});
  await context.route('**/api/admin/media**',async route=>{
    const path=new URL(route.request().url()).pathname;
    if(path.endsWith('/options'))return route.fulfill({json:{categories:[{id:category,title:'Synthetic document category',kind:'document',approved:true}],sources:[{id:source,reference:'Synthetic test source',approved:true}]}});
    if(path.endsWith('/uploads')) {
      const body=route.request().postDataJSON();
      expect(body.filename).toBe('synthetic.pdf');expect(body.mime).toBe('application/pdf');
      expect(Buffer.from(body.base64,'base64')).toEqual(bytes);
      await uploaded;
      asset={id,title:body.title,description:body.description,alt_text:'',category_id:category,source_id:source,kind:'document',mime:'application/pdf',bytes:bytes.length,processing:'ready',publication:'draft',version:2};
      return route.fulfill({json:asset});
    }
    return route.fulfill({json:{data:asset?[asset]:[],hasMore:false}});
  });
  const textCmsRequests: string[]=[];
  page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/admin/content'))textCmsRequests.push(request.url());});
  await page.goto('/cms?tab=documents');
  await expect(page.getByRole('heading',{name:'Documents',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Public information'})).toHaveCount(0);
  await page.getByLabel('File',{exact:true}).setInputFiles({name:'synthetic.pdf',mimeType:'application/pdf',buffer:bytes});
  await page.getByLabel('Title',{exact:true}).fill('Synthetic PDF upload');
  await page.getByLabel('Category',{exact:true}).selectOption(category);await page.getByLabel('Source record').selectOption(source);
  await page.getByRole('button',{name:'Upload private draft'}).click();
  await expect(page.getByRole('progressbar',{name:'File upload progress'})).toBeVisible();
  await expect(page.getByText('Uploading and verifying file…',{exact:true})).toBeVisible();
  releaseUpload!();
  await expect(page.getByRole('heading',{name:'Synthetic PDF upload'})).toBeVisible();
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await expect(page.getByText('Media saved. New uploads remain private drafts.')).toBeVisible();
  await expect(page.getByRole('link',{name:'Download',exact:true})).toHaveAttribute('href',`/api/admin/media/${id}/download`);
  expect(textCmsRequests).toEqual([]);
});
