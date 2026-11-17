import {test,expect,type Page} from '@playwright/test';
import {PDFDocument} from 'pdf-lib';
const sourceId='33333333-3333-4333-8333-333333333333',photoId='11111111-1111-4111-8111-111111111111',documentId='77777777-7777-4777-8777-777777777777';
const photoCategory='22222222-2222-4222-8222-222222222222',documentCategory='88888888-8888-4888-8888-888888888888';
const source={id:sourceId,reference:'Synthetic approved source',owner:'Fixture office',sha256:'a'.repeat(64),approved:true,reviewed_at:'2026-11-17'};
const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=','base64');
async function mockCms(page:Page,role:'admin'|'editor'='editor') {
 const files=new Map<string,any>(),records=new Map<string,any>(),uploads:any[]=[],mutations:string[]=[];
 let failFirst=false,hold=false,release:(()=>void)|null=null;
 await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.fallback():route.abort());
 await page.route('**/api/**',route=>route.fulfill({json:{data:[],pagination:{totalPages:0}}}));
 await page.route('**/api/staff/me',route=>route.fulfill({json:{id:'99999999-9999-4999-8999-999999999999',role}}));
 const categories=[{id:photoCategory,title:'Approved photos',kind:'photo',approved:true},{id:documentCategory,title:'Approved PDFs',kind:'document',approved:true},{id:'44444444-4444-4444-8444-444444444444',title:'Pending photos',kind:'photo',approved:false}];
 await page.route('**/api/admin/media**',async route=>{
  const request=route.request(),url=new URL(request.url()),body=request.method()==='POST'?request.postDataJSON():null;
  if(url.pathname.endsWith('/options'))return route.fulfill({json:{categories,sources:[source]}});
  if(url.pathname.endsWith('/uploads')) {
   uploads.push(body);expect(body.sourceId).toBe(sourceId);expect(body.filename).toMatch(/^[A-Za-z0-9][A-Za-z0-9 _-]*\.(png|pdf)$/);expect(body.base64).not.toMatch(/^data:/);
   if(hold)await new Promise<void>(resolve=>{release=resolve;});
   if(failFirst){failFirst=false;return route.fulfill({status:503,json:{message:'Synthetic transport outage'}});}
   const isPdf=body.mime==='application/pdf';expect(body.categoryId).toBe(isPdf?documentCategory:photoCategory);
   const asset={id:isPdf?documentId:photoId,title:body.title,description:body.description,alt_text:body.altText,category_id:body.categoryId,source_id:body.sourceId,kind:isPdf?'document':'photo',mime:body.mime,bytes:Buffer.from(body.base64,'base64').length,processing:'ready',publication:'draft',version:2};files.set(asset.id,asset);
   return route.fulfill({status:201,json:asset});
  }
  if(url.pathname.endsWith('/preview'))return route.fulfill({contentType:'image/png',body:image});
  if(request.method()==='POST'){
   const [,id,action]=url.pathname.match(/\/media\/([^/]+)\/(edit|publish|unpublish)$/)!;const row=files.get(id);expect(body.version).toBe(row.version);
   if(action==='edit')Object.assign(row,{alt_text:body.altText,title:body.title});else row.publication=action==='publish'?'published':'draft';row.version++;mutations.push(url.pathname);
   return route.fulfill({status:201,json:row});
  }
  const id=url.pathname.match(/\/media\/([^/]+)$/)?.[1];if(id)return route.fulfill({json:files.get(id)});
  const data=[...files.values()].filter(file=>(!url.searchParams.get('kind') || file.kind===url.searchParams.get('kind')) && (!url.searchParams.get('q') || file.title.toLowerCase().includes(url.searchParams.get('q')!.toLowerCase())));
  return route.fulfill({json:{data,hasMore:false}});
 });
 await page.route('**/api/admin/content/**',async route=>{
  const request=route.request(),url=new URL(request.url()),body=request.method()==='POST'?request.postDataJSON():null;
  if(url.pathname.endsWith('/sources'))return route.fulfill({json:{data:[source]}});
  if(url.pathname.endsWith('/dashboard'))return route.fulfill({json:{counts:[],media:[],recent:[],activity:[]}});
  const parts=url.pathname.split('/'),kind=parts[4],id=parts[5],action=parts[6];
  if(!body)return route.fulfill({json:{data:[...records.values()].filter(row=>row.kind===kind && (!id || row.id===id)),pagination:{totalPages:records.size?1:0}}});
  mutations.push(url.pathname);
  if(action==='publish' || action==='unpublish'){
   const row=records.get(id);expect(body.version).toBe(row.version);
   if(action==='publish')for(const selected of body.media || []){const asset=files.get(selected.assetId);expect(selected.version).toBe(asset.version);asset.publication='published';asset.version++;}
   if(action==='publish')expect(row.body.attachments.every((entry:any)=>files.get(entry.assetId)?.publication==='published')).toBe(true);
   row.publication=action==='publish'?'published':'draft';row.version++;return route.fulfill({status:201,json:{data:row}});
  }
  if(action==='edit')expect(body.version).toBe(records.get(id).version);
  if(action==='delete'){records.delete(id);return route.fulfill({status:201,json:{data:{id}}});}
  if(action==='update'){const row=records.get(id);expect(body.version).toBe(row.version);Object.assign(row,{title:body.title,body:body.body,source_id:body.sourceId,version:row.version+1});return route.fulfill({status:201,json:{data:row}});}
  const row={id:id || '66666666-6666-4666-8666-666666666666',kind,title:body.title,slug:body.slug || records.get(id)?.slug || 'synthetic-generated-address',source_id:body.sourceId,body:body.body,publication:'draft',version:action==='edit'?records.get(id).version+1:1,updated_at:'2026-11-17'};records.set(row.id,row);
  return route.fulfill({status:201,json:{data:row}});
 });
 await page.route('**/api/public-content/**',route=>{const kind=new URL(route.request().url()).pathname.split('/')[3];return route.fulfill({json:{data:[...records.values()].filter(row=>row.kind===kind && row.publication==='published'),pagination:{totalPages:1}}});});
 return {uploads,mutations,failAndHold(){failFirst=true;hold=true;},release(){hold=false;release?.();}};
}
for(const width of [375,1280])test(`direct private photo upload, recovery, draft attachment and publication at ${width}px`,async({page})=>{
 test.setTimeout(60000);const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 const state=await mockCms(page);await page.setViewportSize({width,height:1000});await page.goto('/cms?tab=news');
 await page.getByRole('button',{name:'New draft'}).click();await page.getByLabel('Headline',{exact:true}).fill('Synthetic municipal draft');await expect(page.getByLabel('Public slug')).toHaveCount(0);await page.getByLabel('Official material',{exact:true}).selectOption(sourceId);
 await page.getByLabel('Article content').fill('Synthetic article text');
 await page.getByLabel('Upload files for this draft').setInputFiles({name:'Council photo (1).png',mimeType:'image/png',buffer:image});
 await page.getByLabel('File 1 alternative text').fill('White test image');await page.getByLabel('File 1 category',{exact:true}).selectOption(photoCategory);
 expect(await page.getByRole('option',{name:/Pending photos/}).isDisabled()).toBe(true);
 state.failAndHold();await page.getByRole('button',{name:'Upload and attach'}).click();await expect(page.getByRole('progressbar',{name:'File upload progress'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Save draft'})).toBeDisabled();await expect(page.getByRole('navigation',{name:'CMS navigation'}).getByRole('button',{name:'Tourism'})).toBeDisabled();
 await expect.poll(()=>state.uploads.length).toBe(1);state.release();await page.getByRole('button',{name:'Retry upload and attach'}).click();
 await expect(page.getByLabel('Attachment 1 caption')).toHaveValue('Council photo (1)');expect(state.uploads[0].uploadId).toBe(state.uploads[1].uploadId);expect(Buffer.from(state.uploads[1].base64,'base64')).toEqual(image);
 expect(state.mutations.filter(path=>path.endsWith('/publish'))).toEqual([]);
 await page.getByLabel('Featured photo').selectOption(photoId);await page.getByRole('button',{name:'Save draft'}).click();await expect(page.getByText('Draft saved.')).toBeVisible();
 await page.getByRole('button',{name:'Preview',exact:true}).click();await expect(page.getByRole('region',{name:'Private content preview'})).toContainText('Synthetic article text');await page.getByRole('button',{name:'Close preview',exact:true}).click();
 await page.getByRole('button',{name:'Edit draft'}).click();await expect(page.getByLabel('Featured photo')).toHaveValue(photoId);await expect(page.getByLabel('Attachment 1 alternative text (photos)')).toHaveValue('White test image');
 await page.getByRole('button',{name:'Save draft'}).click();await page.getByRole('button',{name:'Publish',exact:true}).click();await page.getByRole('button',{name:'Confirm publication'}).click();await expect(page.getByText('Content published.')).toBeVisible();
 expect(await page.evaluate(()=>fetch('/api/public-content/news').then(response=>response.json()).then(result=>result.data.length))).toBe(1);
 await page.getByRole('button',{name:'Unpublish'}).click();await expect(page.getByText('Content returned to draft.')).toBeVisible();
 expect(await page.evaluate(()=>fetch('/api/public-content/news').then(response=>response.json()).then(result=>result.data.length))).toBe(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});
test('native dialog protects keyboard navigation, source-approval links and browser back',async({page})=>{
 await mockCms(page,'admin');await page.goto('/cms');await page.getByRole('navigation',{name:'CMS navigation'}).getByRole('button',{name:'News & Updates'}).click();
 await page.getByRole('button',{name:'New draft'}).click();await page.getByLabel('Headline',{exact:true}).fill('Unsaved official draft');
 await page.getByRole('link',{name:'Open Source approvals'}).first().click();const dialog=page.getByRole('dialog',{name:'Discard unsaved changes?'});await expect(dialog).toBeVisible();
 await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(page.getByLabel('Headline',{exact:true})).toHaveValue('Unsaved official draft');
 await page.goBack();await expect(dialog).toBeVisible();await dialog.getByRole('button',{name:'Keep editing'}).click();await expect(page.getByLabel('Headline',{exact:true})).toHaveValue('Unsaved official draft');
 await page.getByRole('button',{name:'Cancel'}).click();await page.getByRole('dialog').getByRole('button',{name:'Discard changes'}).click();await expect(page.getByLabel('Headline',{exact:true})).toHaveCount(0);
});
test('PDF drag and drop attaches a document with a safe download preview',async({page})=>{
 const state=await mockCms(page);const document=await PDFDocument.create();document.addPage();const bytes=await document.save();await page.goto('/cms?tab=transparency');
 await page.getByRole('button',{name:'New draft'}).click();await page.getByLabel('Official material',{exact:true}).selectOption(sourceId);
 const transfer=await page.evaluateHandle(data=>{const transfer=new DataTransfer();transfer.items.add(new File([new Uint8Array(data)],'official-report.pdf',{type:'application/pdf'}));return transfer;},Array.from(bytes));
 await page.getByLabel('Upload files for this draft').locator('..').dispatchEvent('drop',{dataTransfer:transfer});await page.getByLabel('File 1 category',{exact:true}).selectOption(documentCategory);
 await page.getByRole('button',{name:'Upload and attach'}).click();await expect(page.getByLabel('Attachment 1 caption')).toHaveValue('official-report');
 await expect(page.getByRole('link',{name:'Preview / download PDF'})).toHaveAttribute('href',`/api/admin/media/${documentId}/download`);await expect(page.locator('iframe')).toHaveCount(0);
 expect(Buffer.from(state.uploads[0].base64,'base64')).toEqual(Buffer.from(bytes));expect(state.mutations.filter(path=>path.endsWith('/publish'))).toEqual([]);
});

const editorCases=[
 {group:'news',section:'news:',title:'Headline',content:'Article content'},
 {group:'news',section:'advisories:',title:'Headline',content:'Article content'},
 {group:'news',section:'updates:',title:'Headline',content:'Article content'},
 {group:'tourism',section:'tourism_spots:',title:'Destination name',content:'Description'},
 {group:'tourism',section:'tourism_delicacies:',title:'Delicacy name',content:'Description'},
 {group:'tourism',section:'galleries:',title:'Album title',content:'Description'},
 {group:'events',section:'tourism_festivals:',title:'Event name',content:'Description'},
 {group:'events',section:'events:',title:'Event name',content:'Description'},
 {group:'galleries',section:'galleries:',title:'Album title',content:'Description'},
 {group:'transparency',section:'transparency_reports:',title:'Document title',content:'Description',pdf:true},
 {group:'downloadables',section:'downloadables:',title:'Document title',content:'Description',pdf:true},
 {group:'government',section:'departments:',title:'Department / office name',content:'Description'},
 {group:'government',section:'organizational_chart:executive-chart',title:'Title',chart:true},
 {group:'government',section:'pages:executive-mandate',title:'Title',content:'Official mandate'},
 {group:'government',section:'pages:legislative-mandate',title:'Title',content:'Official mandate'},
 {group:'government',section:'pages:',title:'Page title',content:'Page content'},
];
for(const width of [375,1280])for(const module of editorCases)test(`fictional ${module.group}/${module.section} full content lifecycle at ${width}px`,async({page},testInfo)=>{
 test.setTimeout(60000);await mockCms(page,'admin');await page.setViewportSize({width,height:1000});await page.goto(`/cms?tab=${module.group}`);
 await page.getByRole('combobox',{name:module.group==='news'?'Content type':'Section',exact:true}).selectOption(module.section);
 await page.getByRole('button',{name:'New draft'}).click();await page.getByLabel(module.title,{exact:true}).fill('Fictional municipal fixture');
 await page.getByLabel('Official material',{exact:true}).selectOption(sourceId);
 if(module.content)await page.getByLabel(module.content,{exact:true}).fill('Fictional municipal text for automated testing only.');
 if(module.section.startsWith('events') || module.section.startsWith('tourism_festivals')){await page.getByLabel('Event date').fill('2026-11-17');await page.getByLabel('Start time (optional)').fill('09:00');await page.getByLabel('End time (optional)').fill('10:00');}
 if(module.section==='downloadables:')await page.getByLabel('Category',{exact:true}).fill('Fictional forms');
 if(module.chart){await page.getByLabel('Official 1 name').fill('Fictional official');await page.getByLabel('Official 1 position').fill('Test position');await page.getByLabel('Official 1 office / department').fill('Fictional office');}
 if(module.section==='tourism_spots:'){await page.getByRole('button',{name:'Add highlight'}).click();await page.getByLabel('Highlight 1',{exact:true}).fill('Fictional highlight');}
 const pdf=await PDFDocument.create();pdf.addPage();const bytes=module.pdf?Buffer.from(await pdf.save()):image;
 await page.getByLabel('Upload files for this draft').setInputFiles({name:module.pdf?'fictional.pdf':'fictional.png',mimeType:module.pdf?'application/pdf':'image/png',buffer:bytes});
 if(!module.pdf)await page.getByLabel('File 1 alternative text').fill('Fictional white test photo');
 await page.getByRole('button',{name:'Upload and attach'}).click();await expect(page.getByLabel('Attachment 1 caption')).toBeVisible();
 if(module.chart)await page.getByLabel('Official 1 photo').selectOption(photoId);
 if(module.section==='news:' || module.chart)await page.screenshot({path:testInfo.outputPath('editor.png'),fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Save draft'}).click();await expect(page.getByText('Draft saved.')).toBeVisible();
 await page.getByRole('button',{name:'Edit draft'}).click();await expect(page.getByLabel(module.title,{exact:true})).toHaveValue('Fictional municipal fixture');
 await page.getByRole('button',{name:'Preview',exact:true}).click();await expect(page.getByRole('region',{name:'Private content preview'})).toContainText('Fictional municipal fixture');await page.getByRole('button',{name:'Close preview',exact:true}).click();
 await page.getByRole('button',{name:'Publish',exact:true}).click();await page.getByRole('button',{name:'Confirm publication'}).click();await expect(page.getByText('Content published.')).toBeVisible();
 const kind=module.section.split(':')[0];expect(await page.evaluate(kind=>fetch('/api/public-content/'+kind).then(response=>response.json()).then(result=>result.data.length),kind)).toBe(1);
 await page.getByRole('button',{name:'Edit',exact:true}).click();await page.getByLabel(module.title,{exact:true}).fill('Fictional reviewed revision');await page.getByRole('button',{name:'Update',exact:true}).click();await page.getByRole('button',{name:'Confirm update'}).click();await expect(page.getByText('Content updated.')).toBeVisible();
 await page.getByRole('button',{name:'Unpublish',exact:true}).click();expect(await page.evaluate(kind=>fetch('/api/public-content/'+kind).then(response=>response.json()).then(result=>result.data.length),kind)).toBe(0);
 await page.getByRole('button',{name:'Delete',exact:true}).click();await page.getByLabel('Deletion authenticator code').fill('123456');await page.getByRole('button',{name:'Confirm deletion'}).click();await expect(page.getByText('Content deleted.')).toBeVisible();
});
