import {test,expect,type Page} from '@playwright/test';
import {PDFDocument} from 'pdf-lib';
import {randomUUID} from 'node:crypto';
const sourceId='33333333-3333-4333-8333-333333333333',photoId='11111111-1111-4111-8111-111111111111',documentId='77777777-7777-4777-8777-777777777777';
const photoCategory='22222222-2222-4222-8222-222222222222',documentCategory='88888888-8888-4888-8888-888888888888';
const source={id:sourceId,reference:'Synthetic historical source',owner:'Fixture office',sha256:'a'.repeat(64),approved:false,reviewed_at:null};
const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=','base64');
async function mockCms(page:Page,role:'admin'|'editor'='editor') {
 // Context routes stay installed during page teardown so late list refreshes cannot reach the dev proxy.
 const context=page.context();
 const files=new Map<string,any>(),uploadResults=new Map<string,string>(),records=new Map<string,any>(),receipts=new Map<string,any>(),uploads:any[]=[],mutations:string[]=[],publications:any[]=[];
 let failFirst=false,hold=false,release:(()=>void)|null=null,losePublication=false,loseMediaPublication=false;
 await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.fallback():route.abort());
 await context.route('**/api/**',route=>route.fulfill({json:{data:[],pagination:{totalPages:0}}}));
 await context.route('**/api/staff/me',route=>route.fulfill({json:{id:'fixture-staff',role}}));
 await context.route('**/api/staff-auth/**',route=>route.fulfill({json:{success:true}}));
 await context.route('**/api/admin/media**',async route=>{
  const request=route.request(),url=new URL(request.url()),body=request.method()==='POST'?request.postDataJSON():null;
  if(url.pathname.endsWith('/options'))return route.fulfill({json:{categories:[{id:photoCategory,title:'Website photos',kind:'photo',approved:true},{id:documentCategory,title:'Website documents',kind:'document',approved:true}],sources:[source]}});
  if(url.pathname.endsWith('/uploads')){
   uploads.push(body);if(hold)await new Promise<void>(resolve=>{release=resolve;});
   if(failFirst){failFirst=false;return route.fulfill({status:503,json:{message:'Synthetic transport outage'}});}
   if(uploadResults.has(body.uploadId))return route.fulfill({status:201,json:files.get(uploadResults.get(body.uploadId)!)});
   const isPdf=body.mime==='application/pdf';expect(body.categoryId).toBeUndefined();
   const firstId=isPdf?documentId:photoId,id=files.has(firstId)?randomUUID():firstId;
   const asset={id,title:body.title,description:body.description,alt_text:body.altText,category_id:isPdf?documentCategory:photoCategory,source_id:body.sourceId || null,kind:isPdf?'document':'photo',mime:body.mime,bytes:Buffer.from(body.base64,'base64').length,processing:'ready',publication:'draft',version:2};files.set(id,asset);uploadResults.set(body.uploadId,id);
   return route.fulfill({status:201,json:asset});
  }
  if(url.pathname.endsWith('/preview'))return route.fulfill({contentType:'image/png',body:image});
  if(request.method()==='POST'){
   const match=url.pathname.match(/\/media\/([^/]+)\/(edit|publish|publish-direct|unpublish)$/)!;const row=files.get(match[1]);expect(body.version).toBe(row.version);
   const alreadyPublished=match[2].startsWith('publish') && row.publication==='published';
   if(match[2]==='edit')Object.assign(row,{alt_text:body.altText,title:body.title});else row.publication=match[2].startsWith('publish')?'published':'draft';if(!alreadyPublished)row.version++;mutations.push(url.pathname);
   if(loseMediaPublication && match[2]==='publish-direct'){loseMediaPublication=false;return route.fulfill({status:503,json:{message:'Synthetic lost media reply'}});}
   return route.fulfill({status:201,json:row});
  }
  const id=url.pathname.match(/\/media\/([^/]+)$/)?.[1];if(id)return route.fulfill({json:files.get(id)});
  const data=[...files.values()].filter(file=>(!url.searchParams.get('kind') || file.kind===url.searchParams.get('kind')) && (!url.searchParams.get('q') || file.title.toLowerCase().includes(url.searchParams.get('q')!.toLowerCase())));
  return route.fulfill({json:{data,hasMore:false}});
 });
 await context.route('**/api/admin/content/**',async route=>{
  const request=route.request(),url=new URL(request.url()),body=request.method()==='POST'?request.postDataJSON():null;
  if(url.pathname.endsWith('/sources'))return route.fulfill({json:{data:[source]}});
  if(url.pathname.endsWith('/dashboard'))return route.fulfill({json:{counts:[],media:[],recent:[],activity:[]}});
  const parts=url.pathname.split('/'),kind=parts[4],id=parts[5],action=parts[6];
  if(!body)return route.fulfill({json:{data:[...records.values()].filter(row=>row.kind===kind && (!id || row.id===id) && (!url.searchParams.get('slug') || row.slug===url.searchParams.get('slug'))),pagination:{totalPages:records.size?1:0}}});
  mutations.push(url.pathname);
  if(id==='publish' || action==='update'){
   publications.push(body);expect(body.submissionId).toMatch(/^[a-f0-9-]{36}$/);
   const priorReceipt=receipts.get(body.submissionId);if(priorReceipt)return route.fulfill({status:201,json:{data:priorReceipt}});
   const prior=action==='update'?records.get(id):null;if(prior)expect(body.version).toBe(prior.version);
   for(const selected of body.media || []){const asset=files.get(selected.assetId);expect(selected.version).toBe(asset.version);if(asset.publication!=='published'){asset.publication='published';asset.version++;}}
   expect((body.body.attachments || []).every((entry:any)=>files.get(entry.assetId)?.publication==='published')).toBe(true);
   const row={id:prior?.id || randomUUID(),kind,title:body.title,slug:body.slug || prior?.slug || 'synthetic-generated-address',source_id:body.sourceId || null,body:body.body,publication:'published',version:(prior?.version || 0)+2,published_at:'2026-11-18T06:00:00Z',updated_at:'2026-11-18T06:00:00Z'};
   records.set(row.id,row);receipts.set(body.submissionId,structuredClone(row));
   if(losePublication){losePublication=false;return route.fulfill({status:503,json:{message:'Synthetic lost reply'}});}
   return route.fulfill({status:201,json:{data:row}});
  }
  const row=records.get(id);expect(body.version).toBe(row.version);
  if(action==='delete'){records.delete(id);return route.fulfill({status:201,json:{data:{id}}});}
  row.publication=action==='archive'?'archived':'draft';row.version++;return route.fulfill({status:201,json:{data:row}});
 });
 await context.route('**/api/public-content/**',route=>{
  const url=new URL(route.request().url()),kind=url.pathname.split('/')[3],page=Number(url.searchParams.get('page') || 1),limit=Number(url.searchParams.get('limit') || 20);
  const data=[...records.values()].filter(row=>row.kind===kind && row.publication==='published');
  return route.fulfill({json:{data,pagination:{page,limit,total:data.length,totalPages:data.length?1:0}}});
 });
 await context.route('**/api/media**',route=>{
  const url=new URL(route.request().url()),id=url.pathname.split('/')[3];
  if(id)return files.get(id)?.publication==='published'?route.fulfill({contentType:'image/png',body:image}):route.fulfill({status:404,json:{}});
  const data=[...files.values()].filter(row=>row.publication==='published' && (!url.searchParams.get('kind') || row.kind===url.searchParams.get('kind'))).map(row=>({id:row.id,kind:row.kind,title:row.title,alt_text:row.alt_text,bytes:row.bytes,category:row.kind==='photo'?'Website photos':'Website documents',download_url:'/api/media/'+row.id+'/download'}));
  return route.fulfill({json:{data,hasMore:false}});
 });
 await context.route('**/api/news**',route=>{
  const id=new URL(route.request().url()).pathname.split('/')[3],data=[...records.values()].filter(row=>['news','updates','advisories'].includes(row.kind) && row.publication==='published').map(row=>({id:row.id,title:row.title,content:row.body.content,summary:row.body.content.slice(0,280),category:row.kind==='updates'?'UPDATE':row.kind==='advisories'?'ADVISORY':'ARTICLE',date:row.published_at.slice(0,10),image_url:row.body.featuredAssetId?'/api/media/'+row.body.featuredAssetId+'/preview':null,file_url:null,author:null,status:'published'}));
  return route.fulfill({json:id?{data:data.find(row=>row.id===id)}:{data,pagination:{totalPages:1}}});
 });
 return {uploads,mutations,publications,files,failAndHold(){failFirst=true;hold=true;},release(){hold=false;release?.();},losePublication(){losePublication=true;},loseMediaPublication(){loseMediaPublication=true;}};
}
test('inline upload dependency failure retains the file and request reference until recovery',async({page})=>{
 const state=await mockCms(page);
 const requestId='99999999-9999-4999-8999-999999999999';
 await page.route('**/api/admin/media/uploads',route=>route.fulfill({status:503,json:{failureCode:'dependency_unavailable',requestId,message:'private provider detail'}}),{times:1});
 await page.goto('/cms?tab=news');await page.getByRole('button',{name:'New post'}).click();
 await page.getByLabel('Title',{exact:true}).fill('Synthetic recovery post');
 await page.getByLabel('Description / body').fill('Synthetic copy');
 await page.getByLabel('Choose files').setInputFiles({name:'fixture.png',mimeType:'image/png',buffer:image});
 await expect(page.getByRole('alert')).toContainText('administrator attention');
 await expect(page.getByRole('alert')).toContainText(requestId);
 await expect(page.getByRole('alert')).not.toContainText('private provider detail');
 await expect(page.getByRole('button',{name:'Publish',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Retry upload'}).click();
 await expect(page.getByLabel('Attachment 1 caption')).toBeVisible();
 await page.getByRole('button',{name:'Publish',exact:true}).click();
 await expect(page.getByText('Published successfully.')).toBeVisible();
 expect(state.files.size).toBe(1);expect(state.publications).toHaveLength(1);
});
for(const kind of ['photo','document'] as const)for(const width of [375,1280])test(`single-action ${kind} library publication recovers a lost response at ${width}px`,async({page})=>{
 test.setTimeout(60000);
 const state=await mockCms(page);await page.setViewportSize({width,height:1000});await page.goto('/cms?tab='+(kind==='photo'?'photos':'documents'));
 const pdf=await PDFDocument.create();pdf.addPage();const bytes=kind==='document'?Buffer.from(await pdf.save()):image;
 await expect(page.getByLabel('File',{exact:true})).toBeEnabled();
 await page.getByLabel('File',{exact:true}).setInputFiles({name:kind==='document'?'fixture.pdf':'fixture.png',mimeType:kind==='document'?'application/pdf':'image/png',buffer:bytes});
 await expect(page.getByLabel('Title',{exact:true})).toHaveValue('fixture');
 state.loseMediaPublication();
 await page.getByRole('button',{name:'Publish',exact:true}).click();await expect(page.getByRole('button',{name:'Retry publication'})).toBeVisible();
 await page.getByRole('navigation',{name:'CMS navigation'}).getByRole('button',{name:'News & Updates'}).click();
 const confirmation=page.getByRole('dialog',{name:'Leave before confirming publication?'});await expect(confirmation).toContainText('Publication may have completed');
 await confirmation.getByRole('button',{name:'Return to publication'}).click();await page.getByRole('button',{name:'Retry publication'}).click();
 await expect(page.getByText('Published successfully.')).toBeVisible();expect(state.files.size).toBe(1);expect([...state.files.values()][0].publication).toBe('published');expect([...state.files.values()][0].version).toBe(3);
 expect(state.uploads).toHaveLength(2);expect(state.uploads[0]).toEqual(state.uploads[1]);
 await expect(page.getByRole('link',{name:'View on website'})).toHaveAttribute('href','/downloads');await page.getByRole('link',{name:'View on website'}).click();
 if(kind==='photo')await expect(page.getByRole('region',{name:'Published photo gallery'}).getByRole('link',{name:'fixture',exact:true})).toBeVisible();
 else await expect(page.getByRole('heading',{name:'fixture',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
for(const width of [375,1280])test(`direct photo upload, recovery, publication and withdrawal at ${width}px`,async({page})=>{
 test.setTimeout(60000);const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 const state=await mockCms(page);await page.setViewportSize({width,height:1000});await page.goto('/cms?tab=news');
 await page.getByRole('button',{name:'New post'}).click();await page.getByLabel('Title',{exact:true}).fill('Synthetic municipal post');
 await expect(page.getByLabel('Public slug')).toHaveCount(0);await expect(page.getByRole('button',{name:'Save draft'})).toHaveCount(0);
 await page.getByLabel('Description / body').fill('Synthetic article text');state.failAndHold();
 await page.getByLabel('Choose files').setInputFiles({name:'Council photo (1).png',mimeType:'image/png',buffer:image});
 await expect(page.getByRole('progressbar',{name:'File upload progress'})).toBeVisible();await expect(page.getByRole('button',{name:'Publish',exact:true})).toBeDisabled();
 await expect(page.getByRole('navigation',{name:'CMS navigation'}).getByRole('button',{name:'Tourism',exact:true})).toBeDisabled();
 await expect.poll(()=>state.uploads.length).toBe(1);state.release();await page.getByRole('button',{name:'Retry upload',exact:true}).click();
 await expect(page.getByLabel('Attachment 1 caption')).toHaveValue('Council photo (1)');expect(state.uploads[0].uploadId).toBe(state.uploads[1].uploadId);
 expect(state.uploads[0]).toEqual(state.uploads[1]);expect(Buffer.from(state.uploads[1].base64,'base64')).toEqual(image);expect(state.uploads[1].sourceId).toBeUndefined();
 expect(state.mutations.filter(path=>path.endsWith('/publish'))).toEqual([]);
 await page.getByLabel('Attachment 1 photo description').fill('White test image');await page.getByLabel('Cover photo').selectOption(photoId);
 await page.getByRole('button',{name:'Preview',exact:true}).click();await expect(page.getByRole('region',{name:'Private content preview'})).toContainText('Synthetic article text');await page.getByRole('button',{name:'Close preview',exact:true}).click();
 await page.getByRole('button',{name:'Publish',exact:true}).click();await expect(page.getByText('Published successfully.')).toBeVisible();
 expect(state.publications).toHaveLength(1);expect(state.mutations).toEqual(['/api/admin/content/news/publish']);
 expect(await page.evaluate(()=>fetch('/api/public-content/news').then(response=>response.json()).then(result=>result.data.length))).toBe(1);
 await expect(page.getByRole('link',{name:'View on website'}).first()).toHaveAttribute('href',/\/news\/view\//);
 await page.getByRole('button',{name:'Edit',exact:true}).click();await expect(page.getByLabel('Cover photo')).toHaveValue(photoId);await expect(page.getByLabel('Attachment 1 photo description')).toHaveValue('White test image');
 await page.getByRole('button',{name:'Preview',exact:true}).click();await page.getByRole('button',{name:'Close preview',exact:true}).click();
 await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.getByRole('button',{name:'Unpublish',exact:true}).click();
 await expect(page.getByText('Removed from the website.')).toBeVisible();expect(await page.evaluate(()=>fetch('/api/public-content/news').then(response=>response.json()).then(result=>result.data.length))).toBe(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});
test('native dialog protects keyboard navigation, module changes and browser back',async({page})=>{
 await mockCms(page,'admin');await page.goto('/cms');const nav=page.getByRole('navigation',{name:'CMS navigation'});
 await nav.getByRole('button',{name:'News & Updates'}).click();await page.getByRole('button',{name:'New post'}).click();await page.getByLabel('Title',{exact:true}).fill('Unsaved official post');
 await nav.getByRole('button',{name:'Supporting evidence',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Discard unsaved changes?'});await expect(dialog).toBeVisible();
 await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(page.getByLabel('Title',{exact:true})).toHaveValue('Unsaved official post');
 await page.goBack();await expect(dialog).toBeVisible();await dialog.getByRole('button',{name:'Keep editing'}).click();await expect(page.getByLabel('Title',{exact:true})).toHaveValue('Unsaved official post');
 await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Discard changes'}).click();await expect(page.getByLabel('Title',{exact:true})).toHaveCount(0);
});
test('PDF drag and drop attaches a document with a safe download preview',async({page})=>{
 const state=await mockCms(page);const document=await PDFDocument.create();document.addPage();const bytes=await document.save();await page.goto('/cms?tab=transparency');
 await page.getByRole('button',{name:'New record'}).click();
 const transfer=await page.evaluateHandle(array=>{const data=new DataTransfer();data.items.add(new File([new Uint8Array(array)],'report.pdf',{type:'application/pdf'}));return data;},Array.from(bytes));
 await page.getByLabel('Choose files').locator('..').dispatchEvent('drop',{dataTransfer:transfer});
 await expect(page.getByLabel('Attachment 1 caption')).toBeVisible();await expect(page.getByRole('link',{name:'Preview / download'})).toHaveAttribute('href',`/api/admin/media/${documentId}/download`);
 await expect(page.getByRole('region',{name:'Attached files'}).getByRole('img')).toHaveCount(0);
 expect(Buffer.from(state.uploads[0].base64,'base64')).toEqual(Buffer.from(bytes));expect(state.mutations.filter(path=>path.endsWith('/publish'))).toEqual([]);
});
test('lost publication response retries the same submission and exposes exactly one public record',async({page})=>{
 const state=await mockCms(page);await page.goto('/cms?tab=news');await page.getByRole('button',{name:'New post'}).click();
 await page.getByLabel('Title',{exact:true}).fill('Fictional retry post');await page.getByLabel('Description / body').fill('Fictional retry body');state.losePublication();
 await page.getByRole('button',{name:'Publish',exact:true}).click();await expect(page.getByRole('button',{name:'Retry publication'})).toBeVisible();await expect(page.getByLabel('Title',{exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Retry publication'}).click();await expect(page.getByText('Published successfully.')).toBeVisible();
 expect(state.publications).toHaveLength(2);expect(state.publications[0]).toEqual(state.publications[1]);
 expect(await page.evaluate(()=>fetch('/api/public-content/news').then(response=>response.json()).then(result=>result.data.length))).toBe(1);
});
const editorCases=[
 {group:'news',section:'news:',title:'Title',content:'Description / body'},
 {group:'news',section:'advisories:',title:'Title',content:'Description / body'},
 {group:'news',section:'updates:',title:'Title',content:'Description / body'},
 {group:'tourism',section:'tourism_spots:',title:'Destination name',content:'Description'},
 {group:'tourism',section:'tourism_delicacies:',title:'Delicacy name',content:'Description'},
 {group:'tourism',section:'galleries:',title:'Album title',content:'Description'},
 {group:'events',section:'tourism_festivals:',title:'Event name',content:'Description'},
 {group:'events',section:'events:',title:'Event name',content:'Description'},
 {group:'galleries',section:'galleries:',title:'Album title',content:'Description'},
 {group:'transparency',section:'transparency_reports:',title:'Document title',content:'Description',pdf:true},
 {group:'downloadables',section:'downloadables:',title:'Document title',content:'Description',pdf:true},
 {group:'government',section:'departments:',title:'Department / office name',content:'Description'},
 {group:'chart',section:'organizational_chart:executive-chart',title:'Chart title',chart:true},
 {group:'government',section:'pages:executive-mandate',title:'Title',content:'Official mandate'},
 {group:'government',section:'pages:legislative-mandate',title:'Title',content:'Official mandate'},
 {group:'government',section:'pages:',title:'Page title',content:'Page content'},
];
for(const width of [375,1280])for(const module of editorCases)test(`fictional ${module.group}/${module.section} direct content lifecycle at ${width}px`,async({page},testInfo)=>{
 test.setTimeout(60000);const state=await mockCms(page,'admin');await page.setViewportSize({width,height:1000});await page.goto(`/cms?tab=${module.group}`);
 if(['news','tourism','events','government'].includes(module.group)) {
  const type=page.getByRole('combobox',{name:module.group==='news'?'Post type':'Section',exact:true});
  await expect(type).toBeVisible();await type.selectOption(module.section);await expect(type).toHaveValue(module.section);
 }
 await page.getByRole('button',{name:module.group==='news'?'New post':'New record'}).click();await page.getByLabel(module.title,{exact:true}).fill('Fictional municipal fixture');
 if(module.content)await page.getByLabel(module.content,{exact:true}).fill('Fictional municipal text for automated testing only.');
 if(module.section.startsWith('events') || module.section.startsWith('tourism_festivals')){await page.getByLabel('Event date').fill('2026-11-17');await page.getByLabel('Start time (optional)').fill('09:00');await page.getByLabel('End time (optional)').fill('10:00');}
 if(module.section==='downloadables:')await page.getByLabel('Category',{exact:true}).fill('Fictional forms');
 if(module.chart){await page.getByLabel('Official 1 name').fill('Fictional official');await page.getByLabel('Official 1 position').fill('Test position');await page.getByLabel('Official 1 office / department').fill('Fictional office');}
 if(module.section==='tourism_spots:'){await page.getByLabel('Location / address').fill('Fictional test location');await page.getByRole('button',{name:'Add highlight'}).click();await page.getByLabel('Highlight 1',{exact:true}).fill('Fictional highlight');}
 const pdf=await PDFDocument.create();pdf.addPage();const bytes=module.pdf?Buffer.from(await pdf.save()):image;
 await page.getByLabel('Choose files').setInputFiles({name:module.pdf?'fictional.pdf':'fictional.png',mimeType:module.pdf?'application/pdf':'image/png',buffer:bytes});
 await expect(page.getByLabel('Attachment 1 caption')).toBeVisible();if(!module.pdf)await page.getByLabel('Attachment 1 photo description').fill('Fictional white test photo');
 if(module.chart)await page.getByLabel('Official 1 photo').selectOption(photoId);
 if(module.section==='news:' || module.chart)await page.screenshot({path:testInfo.outputPath('editor.png'),fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Preview',exact:true}).click();await expect(page.getByRole('region',{name:'Private content preview'})).toContainText('Fictional municipal fixture');await page.getByRole('button',{name:'Close preview',exact:true}).click();
 expect(state.publications).toHaveLength(0);await page.getByRole('button',{name:'Publish',exact:true}).click();await expect(page.getByText('Published successfully.')).toBeVisible();expect(state.publications).toHaveLength(1);expect(state.publications[0].sourceId).toBeUndefined();
 const kind=module.section.split(':')[0];expect(await page.evaluate(kind=>fetch('/api/public-content/'+kind).then(response=>response.json()).then(result=>result.data.length),kind)).toBe(1);
 await page.getByRole('button',{name:'Edit',exact:true}).click();await expect(page.getByLabel(module.title,{exact:true})).toHaveValue('Fictional municipal fixture');
 await page.getByLabel(module.title,{exact:true}).fill('Fictional reviewed revision');await page.getByRole('button',{name:'Publish',exact:true}).click();await expect(page.getByText('Published successfully.')).toBeVisible();expect(state.publications).toHaveLength(2);expect(state.publications[1].version).toBe(2);
 await page.getByRole('button',{name:'Unpublish',exact:true}).click();expect(await page.evaluate(kind=>fetch('/api/public-content/'+kind).then(response=>response.json()).then(result=>result.data.length),kind)).toBe(0);
 await page.getByRole('button',{name:'Delete',exact:true}).click();await page.getByLabel('Deletion authenticator code').fill('123456');await page.getByRole('button',{name:'Confirm deletion'}).click();await expect(page.getByText('Content deleted.')).toBeVisible();
});
