require('reflect-metadata');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const {Pool}=require('pg');
const sharp=require('sharp');
const {PDFDocument}=require('pdf-lib');
const {fixtureConfig,verifyFixture}=require('./local-staging-fixture.cjs');
const {migrations}=require('../scripts/staging/runner.cjs');
const {PostgresDatabase,connectionConfig,runtimeConnectionConfig}=require('../dist/database/postgres');
const {ContentRepository}=require('../dist/database/content.repository');
const {MediaRepository}=require('../dist/database/media.repository');
const {ContentService}=require('../dist/api/content/content.service');
const {MediaService}=require('../dist/api/media/media.service');
const {PublicContentService}=require('../dist/database/public-content.service');
const {CmsContentController}=require('../dist/api/content/cms.controller');
const {PublicCatalogController}=require('../dist/api/content/public-catalog.controller');
const {MediaController,PublicMediaController}=require('../dist/api/media/media.controller');
const {StaffGuard}=require('../dist/authentication/staff.guard');
const {AllExceptionsFilter}=require('../dist/security/all-exceptions.filter');
const {NestFactory,APP_GUARD,APP_FILTER}=require('@nestjs/core');
const {Module}=require('@nestjs/common');
const {configureApp}=require('../dist/configure-app');
const runtime=require('../dist/authentication/runtime');

test('CMS upload, attachment and publication regression on disposable PostgreSQL',async t=>{
 const fixture=fixtureConfig(process.env.R2_STAGING_TEST_FIXTURE),owner=new Pool(connectionConfig(fixture.url.toString(),true));
 const previousAuth=runtime.staffAuthentication,previousOrigin=process.env.STAFF_AUTH_ORIGIN;
 let db,app;
 try {
  await verifyFixture(owner,fixture);
  for(const migration of migrations())await owner.query(migration.sql);
  await owner.query(readFileSync(path.join(__dirname,'../database/migrations/003_municipal_content_foundation.sql'),'utf8'));
  await owner.query('CREATE ROLE cms_upload_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS; GRANT talgov_runtime TO cms_upload_runtime');
  const runtimeUrl=new URL(fixture.url);runtimeUrl.username='cms_upload_runtime';db=new PostgresDatabase(runtimeConnectionConfig(runtimeUrl.toString(),true));
  const objects=new Map();let failWrite=false;
  const storage={verifyPrivate:async()=>{},put:async(key,bytes)=>{if(failWrite)throw Error('Synthetic transport outage');objects.set(key,Buffer.from(bytes));},read:async key=>{if(!objects.has(key))throw Error('Missing fixture object');return objects.get(key);}};
  const mediaRepository=new MediaRepository(db);
  const media=new MediaService();media.configure(mediaRepository,storage);
  const publicContent=new PublicContentService();publicContent.configure(db);
  const content=new ContentService(publicContent);content.configure(new ContentRepository(db));
  async function actor(role) {
   const subject=randomUUID(),sessionId=randomUUID();
   await owner.query('INSERT INTO r2_auth_user(id,name,email,"emailVerified","twoFactorEnabled","createdAt","updatedAt") VALUES($1,$2,$3,true,true,now(),now())',[subject,'Synthetic workflow staff',subject+'@example.invalid']);
   await owner.query("INSERT INTO r2_auth_session(id,\"userId\",token,\"expiresAt\",\"createdAt\",\"updatedAt\") VALUES($1,$2,$3,now()+interval '1 hour',now(),now())",[sessionId,subject,randomUUID()]);
   await owner.query('INSERT INTO app.staff_session_assurance(session_id) VALUES($1)',[sessionId]);
   const {rows:[row]}=await owner.query("INSERT INTO app.staff_accounts(provider,subject,role,active) VALUES('better-auth',$1,$2,true) RETURNING id",[subject,role]);
   return {...row,subject,sessionId,role,provider:'better-auth',sessionVerified:true,assurance:'mfa'};
  }
  const admin=await actor('admin'),editor=await actor('editor');
  runtime.staffAuthentication=()=>({verify:async headers=>headers.get('cookie')==='fixture=admin'?admin:headers.get('cookie')==='fixture=editor'?editor:null});
  class TestModule {}
  Module({controllers:[CmsContentController,PublicCatalogController,MediaController,PublicMediaController],providers:[{provide:ContentService,useValue:content},{provide:PublicContentService,useValue:publicContent},{provide:MediaService,useValue:media},{provide:APP_GUARD,useClass:StaffGuard},{provide:APP_FILTER,useClass:AllExceptionsFilter}]})(TestModule);
  app=await NestFactory.create(TestModule,{logger:false,bodyParser:false});configureApp(app);await app.listen(0,'127.0.0.1');
  const base=await app.getUrl();process.env.STAFF_AUTH_ORIGIN=base;
  const http=(url,body,cookie='fixture=editor',origin=base)=>fetch(base+url,{method:body===undefined?'GET':'POST',headers:{cookie,origin,'content-type':'application/json'},...(body!==undefined?{body:JSON.stringify(body)}:{})});
  let sourceId,photo,pdf;
  const photoCategory=randomUUID(),documentCategory=randomUUID();
  for(const [id,kind] of [[photoCategory,'photo'],[documentCategory,'document']])await owner.query('INSERT INTO app.media_categories(id,kind,slug,title,approved) VALUES($1,$2,$3,$4,true)',[id,kind,'fixture-'+kind,'Fixture '+kind]);
  const imageBytes=await sharp({create:{width:8,height:8,channels:3,background:'white'}}).jpeg().toBuffer();
  const pdfFile=await PDFDocument.create();pdfFile.addPage();const pdfBytes=Buffer.from(await pdfFile.save());
  const upload=(overrides={})=>({title:'Synthetic workflow photo',description:'Test only',altText:'Synthetic white image',sourceId,categoryId:photoCategory,uploadId:randomUUID(),filename:'fixture.jpg',mime:'image/jpeg',base64:imageBytes.toString('base64'),...overrides});
  const draft=(body,slug='fixture-'+randomUUID())=>({title:'Synthetic workflow record',slug,sourceId,body});
  await t.test('admin source registration and approval preserve editor and fresh-MFA boundaries',async()=>{
   const body={reference:'Synthetic workflow source',owner:'Test custodian',sha256:'a'.repeat(64)};
   assert.equal((await http('/api/admin/content/sources',body)).status,403);
   const created=await http('/api/admin/content/sources',body,'fixture=admin');assert.equal(created.status,201);sourceId=(await created.json()).data.id;
   assert.equal((await http(`/api/admin/content/sources/${sourceId}/approve`,{})).status,403);
   await owner.query("UPDATE app.staff_session_assurance SET verified_at=now()-interval '6 minutes' WHERE session_id=$1",[admin.sessionId]);
   assert.equal((await http(`/api/admin/content/sources/${sourceId}/approve`,{},'fixture=admin')).status,403);
   await owner.query('UPDATE app.staff_session_assurance SET verified_at=now() WHERE session_id=$1',[admin.sessionId]);
   assert.equal((await http(`/api/admin/content/sources/${sourceId}/approve`,{},'fixture=admin')).status,201);
  });
  await t.test('HTTP 400 identifies the category/kind FK rule and filename without exposing SQL or values',async()=>{
   // Reproduce the original integrity rule directly against the unchanged schema.
   await assert.rejects(owner.query(`INSERT INTO app.media_assets(kind,category_id,source_id,title,object_key,mime,bytes,sha256,created_by,updated_by)
    VALUES('photo',$1,$2,'Fixture','fixture/invalid','image/jpeg',1,$3,$4,$4)`,[documentCategory,sourceId,'a'.repeat(64),editor.id]),error=>error.code==='23503' && error.constraint==='media_assets_category_id_kind_fkey');
   const size=objects.size;
   const mismatch=await http('/api/admin/media/uploads',upload({categoryId:documentCategory}));assert.equal(mismatch.status,400);
   const response=await mismatch.json();assert.deepEqual(response.fieldErrors,{categoryId:'category_kind'});assert.equal(response.error,'Bad Request');assert.ok(response.requestId);assert.doesNotMatch(JSON.stringify(response),/23503|media_assets|object_key/);
   const filename=await http('/api/admin/media/uploads',upload({filename:'report (1).jpg'}));assert.equal(filename.status,400);assert.deepEqual((await filename.json()).fieldErrors,{filename:'filename'});
   const missing=await http('/api/admin/media/uploads',upload({sourceId:randomUUID()}));assert.equal(missing.status,400);assert.deepEqual((await missing.json()).fieldErrors,{sourceId:'source_missing'});
   assert.equal(objects.size,size);
  });
  await t.test('UUID, MIME, base64, empty file, origin and anonymous upload validation stay strict',async()=>{
   for(const [overrides,field,code] of [[{categoryId:''},'categoryId','uuid'],[{sourceId:'not-a-uuid'},'sourceId','uuid'],[{mime:'image/svg+xml'},'mime','file_type'],[{base64:imageBytes.toString('base64')+'\n'},'base64','base64'],[{base64:''},'file','file_size']]) {
    const response=await http('/api/admin/media/uploads',upload(overrides));assert.equal(response.status,400);assert.equal((await response.json()).fieldErrors[field],code);
   }
   assert.equal((await http('/api/admin/media/uploads',upload(),'fixture=editor','https://invalid.example')).status,403);
   assert.equal((await http('/api/admin/media/uploads',upload(),'')).status,401);
  });
  await t.test('failed storage transfer resumes the same private upload without duplicates or false readiness',async()=>{
   const request=upload();failWrite=true;assert.equal((await http('/api/admin/media/uploads',request)).status,503);failWrite=false;
   const pending=(await owner.query('SELECT processing FROM app.media_assets WHERE object_key=$1',['assets/'+editor.id+'/'+request.uploadId])).rows;
   assert.deepEqual(pending,[{processing:'pending'}]);
   const ownList=(await (await http('/api/admin/media')).json()).data;
   assert.equal(ownList[0].can_resume,true);assert.equal(ownList[0].upload_id,request.uploadId);
   const otherList=(await (await http('/api/admin/media',undefined,'fixture=admin')).json()).data;
   assert.equal(otherList[0].can_resume,false);assert.equal(otherList[0].upload_id,undefined);
   const result=await http('/api/admin/media/uploads',request);assert.equal(result.status,201);photo=await result.json();
   assert.equal(photo.processing,'ready');assert.equal(photo.publication,'draft');assert.equal(photo.object_key,undefined);
   const replay=await http('/api/admin/media/uploads',request);assert.equal((await replay.json()).id,photo.id);
   const reservation={...request,kind:photo.kind,mime:photo.mime,bytes:photo.bytes,sha256:photo.sha256,objectKey:'assets/'+editor.id+'/'+request.uploadId};
   for(const changed of [{title:'Changed title'},{description:'Changed details'},{altText:'Changed alternative text'}]) {
    await assert.rejects(mediaRepository.reserve(editor,{...reservation,...changed},request.filename,'fixture-replay'),error=>error.code==='conflict');
   }
   await assert.rejects(mediaRepository.reserve(editor,reservation,'changed-filename.jpg','fixture-replay'),error=>error.code==='conflict');
   assert.equal((await owner.query('SELECT count(*)::int AS n FROM app.media_assets WHERE object_key=$1',['assets/'+editor.id+'/'+request.uploadId])).rows[0].n,1);
   assert.equal((await http(`/api/media/${photo.id}/download`,undefined,'')).status,404);
   assert.equal((await http(`/api/admin/media/${photo.id}`,undefined,'')).status,401);
   assert.equal((await http(`/api/admin/media/${photo.id}`)).status,200);
  });
  await t.test('PDF upload uses a document category and authenticated byte-exact private retrieval',async()=>{
   const response=await http('/api/admin/media/uploads',upload({title:'Synthetic PDF',altText:'',categoryId:documentCategory,filename:'fixture.pdf',mime:'application/pdf',base64:pdfBytes.toString('base64')}));assert.equal(response.status,201);pdf=await response.json();
   const preview=await http(`/api/admin/media/${pdf.id}/preview`);assert.equal(preview.status,200);assert.match(preview.headers.get('content-disposition'),/attachment/);assert.deepEqual(Buffer.from(await preview.arrayBuffer()),pdfBytes);
   assert.equal((await http(`/api/media/${pdf.id}/download`,undefined,'')).status,404);
   const library=await http('/api/admin/media?ready=true&kind=document&q=Synthetic');assert.deepEqual((await library.json()).data.map(row=>row.id),[pdf.id]);
   for(const query of ['?q=one&q=two','?q='+encodeURIComponent('bad\nquery'),'?kind=video','?page=0'])assert.equal((await http('/api/admin/media'+query)).status,400);
  });
  await t.test('private attachment, featured photo, editing and preview persist before explicit publication',async()=>{
   const body={summary:'Synthetic summary',content:'Synthetic copy',category:'ARTICLE',featuredAssetId:photo.id,attachments:[{assetId:photo.id,caption:'Synthetic caption',altText:'White fixture image'}]};
   const created=await http('/api/admin/content/news',draft(body));assert.equal(created.status,201);let row=(await created.json()).data;
   const edited=await http(`/api/admin/content/news/${row.id}/edit`,{...draft({...body,summary:'Revised synthetic summary'},row.slug),version:row.version});assert.equal(edited.status,201);row=(await edited.json()).data;
   const preview=await http(`/api/admin/content/news/${row.id}/preview`);assert.equal(preview.status,200);assert.equal((await preview.json()).data[0].body.featuredAssetId,photo.id);
   const blocked=await http(`/api/admin/content/news/${row.id}/publish`,{version:row.version});assert.equal(blocked.status,400);assert.equal((await blocked.json()).fieldErrors.attachments,'attachment_private');
   assert.equal((await http('/api/public-content/news',undefined,'')).status,200);assert.equal((await publicContent.list('news')).data.length,0);
   for(const asset of [photo,pdf]){const published=await http(`/api/admin/media/${asset.id}/publish`,{version:asset.version});assert.equal(published.status,201);Object.assign(asset,await published.json());}
   assert.equal((await http(`/api/admin/content/news/${row.id}/publish`,{version:row.version})).status,201);
   const visible=(await (await http('/api/public-content/news',undefined,'')).json()).data.find(item=>item.id===row.id);assert.equal(visible.image_url,`/api/media/${photo.id}/preview`);assert.equal(visible.attachments[0].caption,'Synthetic caption');
   const download=await http(`/api/media/${photo.id}/download`,undefined,'');assert.deepEqual(Buffer.from(await download.arrayBuffer()),imageBytes);
  });
  await t.test('every retained municipal editor publishes and unpublishes through the public API',async()=>{
   const image={assetId:photo.id,caption:'Synthetic image',altText:'White test image'},document={assetId:pdf.id,caption:'Synthetic PDF',altText:''};
   const cases={advisories:{summary:'Test',content:'Test',attachments:[image]},updates:{summary:'Test',content:'Test'},tourism_spots:{description:'Test',attachments:[image]},tourism_festivals:{description:'Test',date:'2026-11-17'},tourism_delicacies:{description:'Test'},transparency_reports:{description:'Test',category:'finance',attachments:[document]},organizational_chart:{mayor:{name:'Fixture leader',role:'Test executive'},level2:[],departments:[],featuredAssetId:photo.id},galleries:{description:'Test',category:'municipal',attachments:[image]},downloadables:{description:'Test',category:'reports',attachments:[document]},departments:{description:'Test'},pages:{content:'Synthetic mandate'}};
   for(const [kind,body] of Object.entries(cases)){
    const created=await http(`/api/admin/content/${kind}`,draft(body,kind==='pages'?'executive-mandate':kind==='organizational_chart'?'executive-chart':'fixture-'+randomUUID()));assert.equal(created.status,201,kind);let row=(await created.json()).data;
    const published=await http(`/api/admin/content/${kind}/${row.id}/publish`,{version:row.version});assert.equal(published.status,201,kind);row=(await published.json()).data;
    assert.ok((await (await http(`/api/public-content/${kind}`,undefined,'')).json()).data.some(item=>item.id===row.id),kind);
    const unpublished=await http(`/api/admin/content/${kind}/${row.id}/unpublish`,{version:row.version});assert.equal(unpublished.status,201,kind);
    assert.equal((await publicContent.list(kind)).data.some(item=>item.id===row.id),false,kind);
   }
  });
  await t.test('generated addresses and atomic attachment publication reject stale consent and roll back unapproved sources',async()=>{
   const freshPhoto=await (await http('/api/admin/media/uploads',upload({filename:'atomic.jpg'}))).json();
   const pendingSource=randomUUID();await owner.query('INSERT INTO app.content_sources(id,reference,owner,sha256) VALUES($1,$2,$3,$4)',[pendingSource,'Fictional pending source','Test custodian','c'.repeat(64)]);
   const body={content:'Fictional atomic article',category:'ARTICLE',featuredAssetId:freshPhoto.id,attachments:[{assetId:freshPhoto.id,caption:'Fictional image',altText:'White fictional image'}]};
   const created=await http('/api/admin/content/news',{title:'Fictional atomic news',sourceId:pendingSource,body});assert.equal(created.status,201);let row=(await created.json()).data;
   assert.equal(row.slug,'fictional-atomic-news');assert.equal(row.body.summary,body.content);
   const consent=[{assetId:freshPhoto.id,version:freshPhoto.version}];
   const blocked=await http(`/api/admin/content/news/${row.id}/publish`,{version:row.version,media:consent});assert.equal(blocked.status,400);
   assert.equal((await owner.query('SELECT publication,version FROM app.media_assets WHERE id=$1',[freshPhoto.id])).rows[0].publication,'draft');
   assert.equal((await owner.query("SELECT count(*)::int AS n FROM app.audit_events WHERE resource_id=$1 AND action='media.publish'",[freshPhoto.id])).rows[0].n,0);
   await owner.query('UPDATE app.content_sources SET approved=true,reviewed_at=now() WHERE id=$1',[pendingSource]);
   assert.equal((await http(`/api/admin/content/news/${row.id}/publish`,{version:row.version,media:[{...consent[0],version:99}]})).status,409);
   assert.equal((await http(`/api/admin/content/news/${row.id}/publish`,{version:row.version,media:[...consent,{assetId:randomUUID(),version:1}]})).status,400);
   const result=await http(`/api/admin/content/news/${row.id}/publish`,{version:row.version,media:consent});assert.equal(result.status,201);row=(await result.json()).data;
   assert.equal((await http(`/api/media/${freshPhoto.id}/preview`,undefined,'')).status,200);
   const stale=await http(`/api/admin/content/news/${row.id}/update`,{title:'Should not replace',version:1});assert.equal(stale.status,409);
   await owner.query('UPDATE app.content_sources SET approved=false WHERE id=$1',[pendingSource]);
   assert.equal((await http(`/api/admin/content/news/${row.id}/update`,{title:'Must roll back',version:row.version})).status,400);
   assert.equal((await owner.query('SELECT title FROM app.public_content WHERE id=$1',[row.id])).rows[0].title,'Fictional atomic news');
   await owner.query('UPDATE app.content_sources SET approved=true WHERE id=$1',[pendingSource]);
   const updated=await http(`/api/admin/content/news/${row.id}/update`,{title:'Fictional updated headline',version:row.version});assert.equal(updated.status,201);row=(await updated.json()).data;assert.equal(row.slug,'fictional-atomic-news');
   const second=await http('/api/admin/content/news',{title:'Fictional atomic news',sourceId,body:{content:'Fictional second article',category:'ARTICLE'}});assert.equal((await second.json()).data.slug,'fictional-atomic-news-2');
   const duplicate=await Promise.all([1,2].map(()=>http('/api/admin/content/news',{title:'Fictional concurrent title',sourceId,body:{content:'Fictional concurrent draft',category:'ARTICLE'}})));
   const slugs=await Promise.all(duplicate.map(async response=>{assert.equal(response.status,201);return (await response.json()).data.slug;}));assert.equal(new Set(slugs).size,2);
   assert.equal((await http(`/api/admin/content/news/${row.id}/delete`,{version:row.version})).status,403);
   assert.equal((await http(`/api/admin/content/news/${row.id}/delete`,{version:row.version},'fixture=admin')).status,201);
  });
  await t.test('events, general pages, structured chart portraits and all disclosure categories retain public isolation',async()=>{
   const image={assetId:photo.id,caption:'Fictional photo',altText:'White fictional photo'},document={assetId:pdf.id,caption:'Fictional PDF',altText:''};
   const parent=randomUUID(),child=randomUUID();
   const cases=[['events',{description:'Fictional event',category:'event',date:'2026-11-17',start_time:'09:00',end_time:'10:00',attachments:[image]}],['pages',{content:'Fictional general page'}],['organizational_chart',{nodes:[{id:parent,name:'Fictional leader',role:'Test role',office:'Test office',reportsTo:null,photoAssetId:photo.id},{id:child,name:'Fictional staff',role:'Test role',office:'Test office',reportsTo:parent}],attachments:[image]}],...['full-disclosure','infrastructure','finance','budget','bidding','executive-order'].map(category=>['transparency_reports',{description:'Fictional disclosure',category,attachments:[document]}])];
   // The earlier legacy-chart test left the unique canonical chart as a draft.
   const legacyChart=(await owner.query("SELECT id FROM app.public_content WHERE kind='organizational_chart'")).rows[0];await owner.query("UPDATE app.public_content SET slug='fictional-legacy-chart' WHERE id=$1",[legacyChart.id]);
   for(const [kind,body] of cases){
    const created=await http(`/api/admin/content/${kind}`,{title:'Fictional '+kind,sourceId,body});assert.equal(created.status,201,kind);let row=(await created.json()).data;
    assert.equal((await publicContent.list(kind)).data.some(item=>item.id===row.id),false);
    const result=await http(`/api/admin/content/${kind}/${row.id}/publish`,{version:row.version});assert.equal(result.status,201,kind);row=(await result.json()).data;
    const visible=(await publicContent.list(kind)).data.find(item=>item.id===row.id);assert.ok(visible,kind);
    if(kind==='organizational_chart')assert.equal(visible.nodes[0].image_url,`/api/media/${photo.id}/preview`);
    if(kind==='events')assert.equal(visible.time,'09:00 - 10:00');
    assert.equal((await http(`/api/admin/content/${kind}/${row.id}/unpublish`,{version:row.version})).status,201);
    assert.equal((await publicContent.list(kind)).data.some(item=>item.id===row.id),false);
   }
   for(const query of ['?publication=invalid','?categoryId=no','?publication=draft&publication=published'])assert.equal((await http('/api/admin/media'+query)).status,400);
   const library=await http(`/api/admin/media?publication=published&categoryId=${documentCategory}`);assert.ok((await library.json()).data.every(row=>row.kind==='document' && row.publication==='published'));
  });
  await t.test('source/category revocation and media unpublishing immediately remove dependent public content',async()=>{
   await owner.query('UPDATE app.media_categories SET approved=false WHERE id=$1',[photoCategory]);assert.equal((await publicContent.list('news')).data.length,0);
   await owner.query('UPDATE app.media_categories SET approved=true WHERE id=$1',[photoCategory]);
   await owner.query('UPDATE app.content_sources SET approved=false WHERE id=$1',[sourceId]);assert.equal((await publicContent.list('news')).data.length,0);
   await owner.query('UPDATE app.content_sources SET approved=true WHERE id=$1',[sourceId]);
   assert.equal((await http(`/api/admin/media/${photo.id}/unpublish`,{version:photo.version})).status,201);
   assert.equal((await http(`/api/media/${photo.id}/download`,undefined,'')).status,404);assert.equal((await publicContent.list('news')).data.length,0);
  });
  await t.test('attachment links and audit events remain atomic and retired workflows remain closed',async()=>{
   assert.ok((await owner.query('SELECT count(*)::int AS n FROM app.content_asset_links')).rows[0].n>0);
   await assert.rejects(db.transaction(tx=>tx.query('UPDATE app.audit_events SET action=action')),error=>error.code==='unavailable' || error.code==='forbidden');
   for(const url of ['/api/payments','/api/forms/submissions','/api/services/manage'])assert.equal((await http(url,{})).status,410);
  });
 } finally {
  runtime.staffAuthentication=previousAuth;
  if(previousOrigin===undefined)delete process.env.STAFF_AUTH_ORIGIN;else process.env.STAFF_AUTH_ORIGIN=previousOrigin;
  try {if(app)await app.close();else await db?.close();} finally {await owner.end();}
 }
});
