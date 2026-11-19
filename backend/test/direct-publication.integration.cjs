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
const {PostgresDatabase,connectionConfig,runtimeConnectionConfig,DatabaseError}=require('../dist/database/postgres');
const {ContentRepository}=require('../dist/database/content.repository');
const {assertContentPublishingReady,assertMediaUploadsReady}=require('../dist/database/cms-readiness');
const {classifyFailure}=require('../dist/security/failure-diagnostics');
const {MediaRepository}=require('../dist/database/media.repository');
const {ContentService}=require('../dist/api/content/content.service');
const {MediaService}=require('../dist/api/media/media.service');
const {PublicContentService}=require('../dist/database/public-content.service');
const {CmsContentController}=require('../dist/api/content/cms.controller');
const {NewsContentController}=require('../dist/api/content/news.controller');
const {PublicCatalogController}=require('../dist/api/content/public-catalog.controller');
const {MediaController,PublicMediaController}=require('../dist/api/media/media.controller');
const {StaffGuard}=require('../dist/authentication/staff.guard');
const {RateLimiterGuard}=require('../dist/security/rate-limiter.guard');
const {AllExceptionsFilter}=require('../dist/security/all-exceptions.filter');
const {NestFactory,APP_GUARD,APP_FILTER,Reflector}=require('@nestjs/core');
const {Module}=require('@nestjs/common');
const {configureApp}=require('../dist/configure-app');
const runtime=require('../dist/authentication/runtime');
const sql=name=>readFileSync(path.join(__dirname,'../database/migrations',name),'utf8');

test('direct staff publication and authoring failure diagnosis on disposable PostgreSQL',async t=>{
 const fixture=fixtureConfig(process.env.R2_STAGING_TEST_FIXTURE),owner=new Pool(connectionConfig(fixture.url.toString(),true));
 const previousAuth=runtime.staffAuthentication,previousOrigin=process.env.STAFF_AUTH_ORIGIN;
 let db,app,limiterDb;
 try {
  await verifyFixture(owner,fixture);
  for(const migration of migrations())await owner.query(migration.sql);
  await owner.query('CREATE ROLE direct_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS; GRANT talgov_runtime TO direct_runtime');
  const runtimeUrl=new URL(fixture.url);runtimeUrl.username='direct_runtime';db=new PostgresDatabase(runtimeConnectionConfig(runtimeUrl.toString(),true));
  async function actor(role) {
   const subject=randomUUID(),sessionId=randomUUID();
   await owner.query('INSERT INTO r2_auth_user(id,name,email,"emailVerified","twoFactorEnabled","createdAt","updatedAt") VALUES($1,$2,$3,true,true,now(),now())',[subject,'Fictional test staff',subject+'@example.invalid']);
   await owner.query('INSERT INTO r2_auth_session(id,"userId",token,"expiresAt","createdAt","updatedAt") VALUES($1,$2,$3,now()+interval \'1 hour\',now(),now())',[sessionId,subject,randomUUID()]);
   await owner.query('INSERT INTO app.staff_session_assurance(session_id) VALUES($1)',[sessionId]);
   const {rows:[row]}=await owner.query("INSERT INTO app.staff_accounts(provider,subject,role,active) VALUES('better-auth',$1,$2,true) RETURNING id",[subject,role]);
   return {...row,subject,sessionId,role,provider:'better-auth',sessionVerified:true,assurance:'mfa'};
  }
  const editor=await actor('editor'),admin=await actor('admin');
  runtime.staffAuthentication=()=>({verify:async headers=>({'fixture=editor':editor,'fixture=admin':admin,'fixture=ordinary':{...editor,role:'staff'}})[headers.get('cookie')] || null});
  const objects=new Map();let failStorage=false,failPrivate=false,beforePut;
  const storage={verifyPrivate:async()=>{if(failPrivate)throw Error('Fictional private access failure');},put:async(key,bytes)=>{if(failStorage)throw Error('Fictional transfer failure');await beforePut?.();objects.set(key,Buffer.from(bytes));},read:async key=>{if(!objects.has(key))throw Error('Fictional missing object');return objects.get(key);}};
  const media=new MediaService();media.configure(new MediaRepository(db),storage);
  const publicContent=new PublicContentService();publicContent.configure(db);
  const repository=new ContentRepository(db),content=new ContentService(publicContent);content.configure(repository);
  const logs=[];content.logger={warn:text=>logs.push(JSON.parse(text))};
  media.logger={warn:text=>logs.push(JSON.parse(text))};
  const limiter=new RateLimiterGuard(new Reflector());
  limiterDb=new PostgresDatabase(runtimeConnectionConfig(runtimeUrl.toString(),true));limiter.configure(limiterDb);
  class TestModule {}
  Module({controllers:[CmsContentController,NewsContentController,PublicCatalogController,MediaController,PublicMediaController],providers:[{provide:ContentService,useValue:content},{provide:PublicContentService,useValue:publicContent},{provide:MediaService,useValue:media},{provide:APP_GUARD,useValue:limiter},{provide:APP_GUARD,useClass:StaffGuard},{provide:APP_FILTER,useClass:AllExceptionsFilter}]})(TestModule);
  app=await NestFactory.create(TestModule,{logger:false,bodyParser:false});configureApp(app);await app.listen(0,'127.0.0.1');
  const base=await app.getUrl();process.env.STAFF_AUTH_ORIGIN=base;
  const http=(url,body,cookie='fixture=editor',origin=base)=>fetch(base+url,{method:body===undefined?'GET':'POST',headers:{cookie,origin,'content-type':'application/json'},...(body!==undefined?{body:JSON.stringify(body)}:{})});
  const publish=(kind,body,extra={})=>http('/api/admin/content/'+kind+'/publish',{title:'Fictional '+kind,body,submissionId:randomUUID(),...extra});
  const count=async(table,where='',values=[])=>Number((await owner.query('SELECT count(*) AS n FROM app.'+table+(where?' WHERE '+where:''),values)).rows[0].n);
  const sourceId=randomUUID();
  await owner.query("INSERT INTO app.content_sources(id,reference,owner,sha256,approved,reviewed_at) VALUES($1,'Fictional historical evidence','Test custodian',$2,true,now())",[sourceId,'a'.repeat(64)]);
  const oldBody={category:'ARTICLE',content:'Fictional article body'};
  const draft={title:'Fictional legacy authoring',sourceId,body:oldBody};
  const image=await sharp({create:{width:8,height:8,channels:3,background:'white'}}).jpeg().toBuffer();
  // Synthetic, fully parsed PNG close to the reported size; no supplied photo is read.
  const pixels=Buffer.alloc(512*624*3);let noise=1729;
  for(let i=0;i<pixels.length;i++){noise^=noise<<13;noise^=noise>>>17;noise^=noise<<5;pixels[i]=noise&255;}
  const pngBytes=await sharp(pixels,{raw:{width:512,height:624,channels:3}}).png({compressionLevel:0}).toBuffer();
  assert.ok(pngBytes.length>900*1024 && pngBytes.length<1024*1024);
  const pdfFile=await PDFDocument.create();pdfFile.addPage();const pdfBytes=Buffer.from(await pdfFile.save());
  const upload=(extra={})=>({title:'Fictional photo',description:'',altText:'White test image',uploadId:randomUUID(),filename:'fixture.jpg',mime:'image/jpeg',base64:image.toString('base64'),...extra});
  const pdfUpload=()=>upload({title:'Fictional PDF',filename:'fixture.pdf',mime:'application/pdf',altText:'',base64:pdfBytes.toString('base64')});
  const pngUpload=()=>upload({filename:'fixture.png',mime:'image/png',base64:pngBytes.toString('base64')});
  t.afterEach(async()=>{await owner.query("DELETE FROM app.staff_auth_throttle WHERE key LIKE 'http:%'");await owner.query('DELETE FROM app.media_throttle');});
  let historical,photo,pdf,current;
  await t.test('GET works before 003, but the exact POST link-delete permission failure produces sanitized 503 and rollback',async()=>{
   assert.equal((await http('/api/admin/content/news?page=1&limit=20')).status,200);
   const response=await http('/api/admin/content/news',draft);assert.equal(response.status,503);
   const body=await response.json();assert.ok(body.requestId);assert.equal(body.failureCode,'dependency_unavailable');assert.doesNotMatch(JSON.stringify(body),/42501|content_asset_links|permission denied|postgres:/);
   assert.equal(await count('public_content'),0);assert.equal(await count('audit_events'),0);
   assert.ok(logs.some(log=>log.component==='content' && log.operation==='content_save' && log.error_code==='42501' && log.reason==='permission_denied' && log.phase==='query' && log.transaction_outcome==='rollback_confirmed'));
   assert.doesNotMatch(JSON.stringify(logs),/Fictional|postgres:|content_asset_links|cookie|token/);
  });
  await t.test('direct publish before 004 fails at the missing receipt table, independently of the earlier link grant defect',async()=>{
   const before={content:await count('public_content'),audit:await count('audit_events')};
   const response=await publish('news',{content:'Fictional schema failure'});assert.equal(response.status,503);
   assert.ok(logs.some(log=>log.operation==='content_publish' && log.error_code==='42P01' && log.reason==='relation_missing' && log.transaction_outcome==='rollback_confirmed'));
   assert.deepEqual({content:await count('public_content'),audit:await count('audit_events')},before);
   const failure=await response.json();assert.equal(failure.failureCode,'dependency_unavailable');assert.doesNotMatch(JSON.stringify(failure),/42P01|receipt|postgres:|Fictional/);
   await assert.rejects(db.transaction(assertContentPublishingReady,true),e=>classifyFailure(e).reason==='cms_schema_missing');
  });
  await t.test('absent default categories are a service failure for valid images and PDFs; the qualification fixture is neither offered nor used',async()=>{
   await owner.query("INSERT INTO app.media_categories(kind,slug,title,approved) VALUES('document','r2-qualification','R2 Qualification',false)");
   const before={media:await count('media_assets'),revisions:await count('media_revisions'),audit:await count('audit_events')};
   for(const body of [upload(),pngUpload(),pdfUpload()]) {
    const response=await http('/api/admin/media/uploads',body);assert.equal(response.status,503);
    const result=await response.json();assert.equal(result.fieldErrors,undefined);assert.ok(result.requestId);
    assert.ok(logs.some(log=>log.component==='media' && log.operation==='media_upload' && log.request_id===result.requestId && log.reason==='media_category_missing' && log.media_stage==='reservation' && log.dependency==='database' && log.transaction_outcome==='rollback_confirmed'));
    assert.doesNotMatch(JSON.stringify(result),/category|42501|Fictional|fixture|postgres:/);
   }
   assert.equal(objects.size,0);assert.deepEqual({media:await count('media_assets'),revisions:await count('media_revisions'),audit:await count('audit_events')},before);
   assert.equal(await count('media_categories',"slug='r2-qualification' AND NOT approved"),1);
   assert.deepEqual((await (await http('/api/admin/media/options')).json()).categories,[]);
   await assert.rejects(db.transaction(assertMediaUploadsReady,true),e=>classifyFailure(e).reason==='cms_schema_missing');
  });
  await t.test('003 grants resolve the reproduced authoring failure without changing authentication',async()=>{
   await owner.query(sql('003_municipal_content_foundation.sql'));
   const response=await http('/api/admin/content/news',draft);assert.equal(response.status,201);historical=(await response.json()).data;
   assert.equal(historical.publication,'draft');
   assert.equal((await http('/api/admin/content/news',draft,'')).status,401);
  });
  await t.test('link grant repair alone leaves the direct publication receipt dependency unresolved',async()=>{
   const response=await publish('news',{content:'Fictional incomplete upgrade'});assert.equal(response.status,503);
   assert.ok(logs.some(log=>log.operation==='content_publish' && log.error_code==='42P01'));
   assert.equal(await count('public_content'),1);
  });
  await t.test('004 dry-run rolls back schema, grants and defaults without changing historical records',async()=>{
   const rehearsal=await owner.connect();
   try {
    await rehearsal.query('BEGIN');await rehearsal.query(sql('004_direct_staff_publication.sql'));
    assert.equal((await rehearsal.query("SELECT to_regclass('app.content_publication_receipts')::text AS name")).rows[0].name,'app.content_publication_receipts');
    await rehearsal.query('ROLLBACK');
   } finally {await rehearsal.query('ROLLBACK');rehearsal.release();}
   assert.equal((await owner.query("SELECT to_regclass('app.content_publication_receipts') AS name")).rows[0].name,null);
   assert.equal((await owner.query("SELECT count(*)::int AS n FROM information_schema.columns WHERE table_schema='app' AND column_name='published_by'")).rows[0].n,0);
   assert.equal(await count('media_categories',"slug IN ('website-photos','website-documents')"),0);
   assert.equal(await count('public_content','id=$1',[historical.id]),1);assert.equal(await count('content_sources'),1);
  });
  await t.test('004 preserves historical sources, content and audits and adds real file defaults only',async()=>{
   const before=(await owner.query('SELECT * FROM app.public_content WHERE id=$1',[historical.id])).rows[0];
   const auditBefore=await count('audit_events');await owner.query(sql('004_direct_staff_publication.sql'));
   const after=(await owner.query('SELECT * FROM app.public_content WHERE id=$1',[historical.id])).rows[0];
   for(const field of ['title','slug','body','source_id','publication','version'])assert.deepEqual(after[field],before[field]);
   assert.equal(await count('content_sources'),1);assert.equal(await count('audit_events'),auditBefore);
   assert.equal(await count('media_categories',"slug IN ('website-photos','website-documents')"),2);
   assert.equal(await count('media_categories',"slug='r2-qualification' AND NOT approved"),1);
   await db.transaction(assertContentPublishingReady,true);await db.transaction(assertMediaUploadsReady,true);
  });
  await t.test('CMS readiness rejects revoked runtime link grants or default categories even while the database remains reachable',async()=>{
   await owner.query('REVOKE DELETE ON app.content_asset_links FROM talgov_runtime');
   try {await assert.rejects(db.transaction(assertContentPublishingReady,true),e=>classifyFailure(e).reason==='cms_permission_missing');}
   finally {await owner.query('GRANT DELETE ON app.content_asset_links TO talgov_runtime');}
   await owner.query("UPDATE app.media_categories SET approved=false WHERE slug='website-photos'");
   try {await assert.rejects(db.transaction(assertMediaUploadsReady,true),e=>classifyFailure(e).reason==='media_category_missing');}
   finally {await owner.query("UPDATE app.media_categories SET approved=true WHERE slug='website-photos'");}
   await db.transaction(assertContentPublishingReady,true);await db.transaction(assertMediaUploadsReady,true);
  });
  await t.test('one direct action publishes news with no source or draft call and exposes it publicly',async()=>{
   const before=Date.now(),response=await publish('news',{content:'Fictional direct news',date:'1900-01-01'});assert.equal(response.status,201);current=(await response.json()).data;
   assert.equal(current.source_id,null);assert.equal(current.created_by,editor.id);assert.equal(current.published_by,editor.id);assert.equal(current.publication,'published');
   assert.ok(Date.parse(current.published_at)>=before-1000);assert.equal(current.body.date,undefined);assert.equal(current.body.category,'ARTICLE');assert.equal(current.body.summary,'Fictional direct news');
   const result=await (await http('/api/news/'+current.id,undefined,'')).json();assert.equal(result.data.id,current.id);
   assert.equal(await count('audit_events','resource_id=$1 AND actor_id=$2',[current.id,editor.id]),2);
  });
  await t.test('optional unapproved supporting evidence is associated without approval or fabrication',async()=>{
   const pending=randomUUID();await owner.query("INSERT INTO app.content_sources(id,reference,owner,sha256) VALUES($1,'Fictional supporting evidence','Test custodian',$2)",[pending,'b'.repeat(64)]);
   const response=await publish('advisories',{content:'Fictional advisory'},{sourceId:pending});assert.equal(response.status,201);
   assert.equal((await response.json()).data.source_id,pending);assert.equal((await owner.query('SELECT approved FROM app.content_sources WHERE id=$1',[pending])).rows[0].approved,false);
   assert.equal(await count('content_sources'),2);
  });
  const attachment=asset=>({assetId:asset.id,caption:asset.title,altText:asset.alt_text});
  await t.test('explicit missing or mismatched categories remain validation errors and runtime cannot create category approvals',async()=>{
   const categories=(await owner.query("SELECT id,kind FROM app.media_categories WHERE slug IN ('website-photos','website-documents')")).rows;
   for(const [body,code] of [[upload({categoryId:randomUUID()}),'category_missing'],[upload({categoryId:categories.find(c=>c.kind==='document').id}),'category_kind'],[{...pdfUpload(),categoryId:categories.find(c=>c.kind==='photo').id},'category_kind']]) {
    const response=await http('/api/admin/media/uploads',body);assert.equal(response.status,400);assert.equal((await response.json()).fieldErrors.categoryId,code);
   }
   await assert.rejects(db.transaction(tx=>tx.query("UPDATE app.media_categories SET approved=true WHERE slug='r2-qualification'")),e=>classifyFailure(e).error_code==='42501');
   assert.equal(await count('media_assets'),0);
  });
  await t.test('private upload defaults and durable recovery retain the same file without credentials or duplicate revisions',async()=>{
   const body=upload();failStorage=true;assert.equal((await http('/api/admin/media/uploads',body)).status,503);failStorage=false;
   const a=await http('/api/admin/media/uploads',body);assert.equal(a.status,201);photo=await a.json();
   const b=await (await http('/api/admin/media/uploads',body)).json();assert.equal(b.id,photo.id);assert.equal(photo.source_id,null);assert.equal(photo.publication,'draft');
   assert.equal(await count('media_revisions','asset_id=$1',[photo.id]),1);assert.equal((await http('/api/media/'+photo.id+'/download',undefined,'')).status,404);
   assert.doesNotMatch(JSON.stringify(photo),/object_key|assets\/|AWS_ACCESS|SECRET/);
   assert.equal((await owner.query('SELECT slug FROM app.media_categories WHERE id=$1',[photo.category_id])).rows[0].slug,'website-photos');
   const response=await http('/api/admin/media/uploads',upload({title:'Fictional PDF',filename:'fixture.pdf',mime:'application/pdf',altText:'',base64:pdfBytes.toString('base64')}));assert.equal(response.status,201);pdf=await response.json();
   assert.equal(pdf.kind,'document');assert.equal(pdf.source_id,null);
   assert.equal((await owner.query('SELECT slug FROM app.media_categories WHERE id=$1',[pdf.category_id])).rows[0].slug,'website-documents');
  });
  await t.test('PNG readiness permission failure preserves one reservation, rolls back completion, and retries safely into public news',async()=>{
   const body=pngUpload(),before=await count('media_assets');let pending;
   await owner.query('REVOKE INSERT ON app.media_revisions FROM talgov_runtime');
   try {
    const response=await http('/api/admin/media/uploads',body);assert.equal(response.status,503);
    const failure=await response.json();
    assert.ok(logs.some(log=>log.request_id===failure.requestId && log.operation==='media_upload' && log.media_stage==='readiness'
      && log.dependency==='database' && log.error_code==='42501' && log.reason==='permission_denied' && log.transaction_outcome==='rollback_confirmed'));
    pending=(await owner.query("SELECT id,processing FROM app.media_assets WHERE original_filename='fixture.png'")).rows[0];
    assert.equal(pending.processing,'pending');assert.equal(await count('media_assets'),before+1);
    assert.equal(await count('media_revisions','asset_id=$1',[pending.id]),0);
    assert.equal(await count('audit_events',"resource_id=$1 AND action='media.create'",[pending.id]),1);
    assert.equal(await count('audit_events',"resource_id=$1 AND action='media.update'",[pending.id]),0);
   } finally {await owner.query('GRANT INSERT ON app.media_revisions TO talgov_runtime');}
   const response=await http('/api/admin/media/uploads',body);assert.equal(response.status,201);
   const file=await response.json();assert.equal(file.id,pending.id);assert.equal(file.processing,'ready');assert.equal(file.mime,'image/png');
   const retry=await (await http('/api/admin/media/uploads',body)).json();assert.equal(retry.id,file.id);
   assert.equal(await count('media_assets'),before+1);assert.equal(await count('media_revisions','asset_id=$1',[file.id]),1);
   assert.equal(await count('audit_events',"resource_id=$1 AND action='media.update'",[file.id]),1);
   const news=await publish('news',{category:'ARTICLE',content:'Fictional PNG regression',attachments:[attachment(file)]});
   assert.equal(news.status,201,await news.clone().text());
   const download=await http('/api/media/'+file.id+'/download',undefined,'');assert.equal(download.status,200);
   assert.equal(download.headers.get('content-type'),'image/png');assert.deepEqual(Buffer.from(await download.arrayBuffer()),pngBytes);
   assert.equal(await count('audit_events',"resource_id=$1 AND action='media.publish'",[file.id]),1);
  });
  await t.test('concurrent identical upload retries return one ready file with one revision and readiness audit',async()=>{
   let arrived=0,release;const gate=new Promise(resolve=>{release=resolve;});
   beforePut=async()=>{if(++arrived===2)release();await gate;};
   const body=upload(),before=objects.size;
   try {
    const responses=await Promise.all([http('/api/admin/media/uploads',body),http('/api/admin/media/uploads',body)]);
    assert.deepEqual(responses.map(r=>r.status),[201,201]);const files=await Promise.all(responses.map(r=>r.json()));
    assert.equal(files[0].id,files[1].id);assert.equal(files[0].version,2);assert.equal(files[1].version,2);
    assert.equal(objects.size,before+1);assert.equal(await count('media_revisions','asset_id=$1',[files[0].id]),1);
    assert.equal(await count('audit_events',"resource_id=$1 AND action='media.create'",[files[0].id]),1);
    assert.equal(await count('audit_events',"resource_id=$1 AND action='media.update'",[files[0].id]),1);
    assert.equal((await http('/api/admin/media/uploads',{...body,title:'Changed fictional metadata'})).status,409);
    assert.equal(objects.size,before+1);
   } finally {release();beforePut=undefined;}
  });
  await t.test('content and file validation failures retain uploads privately and make no publication or receipt',async()=>{
   const before=await count('content_publication_receipts');
   for(const [kind,body] of [['news',{content:''}],['galleries',{category:'municipal',attachments:[]}],['transparency_reports',{category:'budget',description:'Fictional report'}],['downloadables',{category:'Forms',description:'Fictional download'}],['news',{content:'Fictional',image_url:'https://arbitrary.invalid/file'}]])assert.equal((await publish(kind,body)).status,400);
   for(const overrides of [{mime:'image/svg+xml'},{base64:'not-base64'},{filename:'unsafe/fixture.jpg'},{base64:Buffer.from('not an image').toString('base64')},{base64:''},{base64:Buffer.alloc(2*1024*1024+1).toString('base64')}])assert.equal((await http('/api/admin/media/uploads',upload(overrides))).status,400);
   assert.equal(await count('content_publication_receipts'),before);assert.equal((await owner.query('SELECT publication FROM app.media_assets WHERE id=$1',[photo.id])).rows[0].publication,'draft');
  });
  await t.test('standalone direct media checks private access and checksum, accepts optional evidence, and never duplicates its publication audit',async()=>{
   const support=(await owner.query('SELECT id FROM app.content_sources WHERE NOT approved LIMIT 1')).rows[0];
   const file=await (await http('/api/admin/media/uploads',upload({sourceId:support.id}))).json();
   const stored=(await owner.query('SELECT object_key FROM app.media_assets WHERE id=$1',[file.id])).rows[0];
   const original=objects.get(stored.object_key),body={version:file.version},path='/api/admin/media/'+file.id+'/publish-direct';
   objects.set(stored.object_key,Buffer.from('Fictional corrupt file'));assert.equal((await http(path,body)).status,503);objects.set(stored.object_key,original);
   failPrivate=true;assert.equal((await http(path,body)).status,503);failPrivate=false;
   assert.equal(await count('audit_events',"resource_id=$1 AND action='media.publish'",[file.id]),0);
   assert.equal((await http('/api/media/'+file.id+'/download',undefined,'')).status,404);
   const response=await http(path,body);assert.equal(response.status,201);const published=await response.json();assert.equal(published.publication,'published');
   assert.equal((await http(path,body)).status,409);assert.equal((await http(path,{version:published.version})).status,201);
   assert.equal(await count('audit_events',"resource_id=$1 AND action='media.publish'",[file.id]),1);
   const row=(await owner.query('SELECT version,published_at FROM app.media_assets WHERE id=$1',[file.id])).rows[0];assert.equal(row.version,published.version);
   const timestamp=row.published_at;objects.set(stored.object_key,Buffer.from('Fictional corrupt file'));
   assert.equal((await http('/api/media/'+file.id+'/download',undefined,'')).status,503);objects.set(stored.object_key,original);
   assert.equal((await http('/api/media/'+file.id+'/download',undefined,'')).status,200);
   assert.deepEqual((await owner.query('SELECT published_at FROM app.media_assets WHERE id=$1',[file.id])).rows[0].published_at,timestamp);
   assert.equal((await owner.query('SELECT approved FROM app.content_sources WHERE id=$1',[support.id])).rows[0].approved,false);
  });
  await t.test('all module kinds create, publish, edit, withdraw, republish and soft-delete with public visibility and retained history',async modules=>{
   const chief=randomUUID(),child=randomUUID();
   const fixtures={news:{content:'Fictional news'},updates:{content:'Fictional update'},advisories:{content:'Fictional advisory'},tourism_spots:{description:'Fictional destination',location:'Fictional location',opening_hours:'8 AM to 5 PM',highlights:['Fictional highlight'],attachments:[attachment(photo)]},tourism_delicacies:{description:'Fictional food'},tourism_festivals:{description:'Fictional festival',date:'2027-01-01'},events:{description:'Fictional event',date:'2027-01-01',category:'event'},pages:{content:'Fictional page'},departments:{description:'Fictional office',officials:[{id:chief,name:'Fictional official',role:'Director',office:'Test office'}],attachments:[attachment(pdf)]},organizational_chart:{nodes:[{id:chief,name:'Fictional chief',role:'Mayor',office:'Executive',photoAssetId:photo.id},{id:child,name:'Fictional reporting official',role:'Director',office:'Test office',reportsTo:chief}],attachments:[attachment(photo)]},galleries:{description:'Fictional album',category:'municipal',attachments:[attachment(photo)]},downloadables:{category:'Forms',description:'Fictional form',attachments:[attachment(pdf)]},transparency_reports:{category:'budget',description:'Fictional report',attachments:[attachment(pdf)]}};
   for(const [kind,body] of Object.entries(fixtures))await modules.test(kind,async()=>{
    const response=await publish(kind,body);assert.equal(response.status,201,kind+': '+await response.clone().text());const row=(await response.json()).data;
    assert.equal(row.publication,'published');assert.equal(await count('public_content','id=$1 AND published_by=$2',[row.id,editor.id]),1);
    assert.equal((await owner.query('SELECT id FROM app.published_content WHERE id=$1',[row.id])).rows.length,1);
    const revision=await http('/api/admin/content/'+kind+'/'+row.id+'/update',{title:'Fictional revised '+kind,body,version:row.version,submissionId:randomUUID()});
    assert.equal(revision.status,201,kind);const edited=(await revision.json()).data;assert.equal(edited.id,row.id);assert.equal(edited.slug,row.slug);assert.equal(edited.title,'Fictional revised '+kind);
    const withdrawal=await http('/api/admin/content/'+kind+'/'+row.id+'/unpublish',{version:edited.version});assert.equal(withdrawal.status,201);const privateRow=(await withdrawal.json()).data;
    assert.equal((await owner.query('SELECT id FROM app.published_content WHERE id=$1',[row.id])).rows.length,0);
    const republication=await http('/api/admin/content/'+kind+'/'+row.id+'/update',{body,version:privateRow.version,submissionId:randomUUID()});assert.equal(republication.status,201);const final=(await republication.json()).data;
    assert.equal(final.publication,'published');assert.equal((await owner.query('SELECT id FROM app.published_content WHERE id=$1',[row.id])).rows.length,1);
    assert.equal((await http('/api/admin/content/'+kind+'/'+row.id+'/delete',{version:final.version})).status,403);
    assert.equal((await http('/api/admin/content/'+kind+'/'+row.id+'/delete',{version:final.version},'fixture=admin')).status,201);
    assert.equal((await owner.query('SELECT id FROM app.published_content WHERE id=$1',[row.id])).rows.length,0);
    assert.equal(await count('public_content','id=$1 AND deleted_at IS NOT NULL',[row.id]),1);assert.equal(await count('audit_events',"resource_id=$1 AND action='content.create'",[row.id]),1);
    assert.equal(await count('content_publication_receipts','resource_id=$1',[row.id]),3);
   });
   for(const asset of [photo,pdf]){const response=await http('/api/media/'+asset.id+'/download',undefined,'');assert.equal(response.status,200);assert.ok((await response.arrayBuffer()).byteLength>0);}
  });
  await t.test('concurrent duplicate submissions have one receipt, content identity, timestamp and audit pair',async()=>{
   const body={title:'Fictional duplicate',body:{content:'Fictional repeated submission'},submissionId:randomUUID()};
   const responses=await Promise.all([1,2,3].map(()=>http('/api/admin/content/news/publish',body)));
   responses.forEach(response=>assert.equal(response.status,201));const rows=await Promise.all(responses.map(async response=>(await response.json()).data));
   assert.ok(rows.every(row=>row.id===rows[0].id && row.published_at===rows[0].published_at));
   assert.equal(await count('content_publication_receipts','actor_id=$1 AND submission_id=$2',[editor.id,body.submissionId]),1);assert.equal(await count('audit_events','resource_id=$1',[rows[0].id]),2);
   assert.equal((await http('/api/admin/content/news/publish',{...body,title:'Changed payload'})).status,409);
  });
  await t.test('direct publication retries retain the shared rate limit and create no duplicate writes',async()=>{
   const body={title:'Fictional rate-limited retry',body:{content:'Fictional retry verification'},submissionId:randomUUID()};
   let published;
   for(let attempt=0;attempt<30;attempt++){
    const response=await http('/api/admin/content/news/publish',body);assert.equal(response.status,201);
    const row=(await response.json()).data;if(published)assert.equal(row.id,published.id);else published=row;
   }
   const limited=await http('/api/admin/content/news/publish',body);assert.equal(limited.status,429);
   assert.ok(Number(limited.headers.get('retry-after'))>0);
   assert.equal(await count('audit_events','resource_id=$1',[published.id]),2);
   assert.equal(await count('content_publication_receipts','submission_id=$1',[body.submissionId]),1);
  });
  await t.test('a lost successful response is recovered from the durable receipt after reauthentication',async()=>{
   let loseResponse=true;content.configure(new ContentRepository({transaction:async work=>{const result=await db.transaction(work);if(loseResponse){loseResponse=false;throw new DatabaseError('unavailable');}return result;}}));
   const body={title:'Fictional lost response',body:{content:'Fictional receipt recovery'},submissionId:randomUUID()};
   assert.equal((await http('/api/admin/content/news/publish',body)).status,503);
   const response=await http('/api/admin/content/news/publish',body);assert.equal(response.status,201);const row=(await response.json()).data;
   assert.equal(await count('audit_events','resource_id=$1',[row.id]),2);assert.equal(await count('public_content','title=$1',[body.title]),1);
   await owner.query('UPDATE app.staff_accounts SET active=false WHERE id=$1',[editor.id]);assert.equal((await http('/api/admin/content/news/publish',body)).status,403);await owner.query('UPDATE app.staff_accounts SET active=true WHERE id=$1',[editor.id]);content.configure(repository);
  });
  await t.test('stale content or selected file versions roll back an entire published update',async()=>{
   const prior=(await owner.query('SELECT * FROM app.public_content WHERE id=$1',[current.id])).rows[0];
   const body={title:'Fictional revision',body:{content:'Revised fictional text'},version:prior.version,submissionId:randomUUID()};
   const response=await http('/api/admin/content/news/'+current.id+'/update',body);assert.equal(response.status,201);current=(await response.json()).data;
   assert.equal((await http('/api/admin/content/news/'+current.id+'/update',{...body,submissionId:randomUUID()})).status,409);
   const actual=(await owner.query('SELECT version FROM app.media_assets WHERE id=$1',[photo.id])).rows[0].version;
   assert.equal((await publish('news',{content:'Fictional stale media',attachments:[attachment(photo)]},{media:[{assetId:photo.id,version:actual-1}]})).status,409);
   assert.equal((await owner.query('SELECT title FROM app.public_content WHERE id=$1',[current.id])).rows[0].title,'Fictional revision');
  });
  await t.test('audit failure rolls content, attached media publication and receipt back together',async()=>{
   const fresh=await (await http('/api/admin/media/uploads',upload())).json(),version=fresh.version;
   const before={content:await count('public_content'),audit:await count('audit_events'),receipt:await count('content_publication_receipts')};
   await owner.query("ALTER TABLE app.audit_events ADD CONSTRAINT fixture_audit_failure CHECK(action<>'content.publish') NOT VALID");
   const response=await publish('news',{content:'Fictional rollback',attachments:[attachment(fresh)]});assert.equal(response.status,400);
   await owner.query('ALTER TABLE app.audit_events DROP CONSTRAINT fixture_audit_failure');
   const row=(await owner.query('SELECT publication,version FROM app.media_assets WHERE id=$1',[fresh.id])).rows[0];assert.equal(row.publication,'draft');assert.equal(row.version,version);assert.equal(await count('audit_events',"resource_id=$1 AND action='media.publish'",[fresh.id]),0);
   assert.deepEqual({content:await count('public_content'),audit:await count('audit_events'),receipt:await count('content_publication_receipts')},before);
  });
  await t.test('revoked file categories suppress public access and roll back new content with those attachments',async()=>{
   const row=(await owner.query('SELECT category_id FROM app.media_assets WHERE id=$1',[photo.id])).rows[0];
   const before={content:await count('public_content'),audit:await count('audit_events'),receipt:await count('content_publication_receipts')};
   await owner.query('UPDATE app.media_categories SET approved=false WHERE id=$1',[row.category_id]);
   try {
    assert.equal((await http('/api/media/'+photo.id+'/download',undefined,'')).status,404);
    assert.equal((await publish('news',{content:'Fictional unavailable category',attachments:[attachment(photo)]})).status,400);
    assert.deepEqual({content:await count('public_content'),audit:await count('audit_events'),receipt:await count('content_publication_receipts')},before);
   } finally {await owner.query('UPDATE app.media_categories SET approved=true WHERE id=$1',[row.category_id]);}
  });
  await t.test('live MFA, authorized roles, same-origin checks and protected publisher columns cannot be bypassed',async()=>{
   const body={content:'Fictional denied publication'};
   assert.equal((await publish('news',body,{published_by:admin.id})).status,400);
   assert.equal((await http('/api/admin/content/news/publish',{title:'Fictional',body,submissionId:randomUUID()},'fixture=ordinary')).status,403);
   assert.equal((await http('/api/admin/content/news/publish',{title:'Fictional',body,submissionId:randomUUID()},'')).status,401);
   assert.equal((await http('/api/admin/content/news/publish',{title:'Fictional',body,submissionId:randomUUID()},'fixture=editor','https://invalid.example')).status,403);
   await owner.query("UPDATE app.staff_session_assurance SET verified_at=now()-interval '9 hours' WHERE session_id=$1",[editor.sessionId]);assert.equal((await publish('news',body)).status,403);
   await assert.rejects(db.transaction(tx=>tx.query('SELECT app.publish_staff_content($1,$2,$3,$4,$5,$6)',[editor.id,editor.subject,editor.sessionId,current.id,current.version,randomUUID()])),error=>error.code==='unavailable');
   await owner.query('UPDATE app.staff_session_assurance SET verified_at=now() WHERE session_id=$1',[editor.sessionId]);
   await owner.query('UPDATE public.r2_auth_session SET "expiresAt"=now()-interval \'1 minute\' WHERE id=$1',[editor.sessionId]);assert.equal((await publish('news',body)).status,403);
   await owner.query('UPDATE public.r2_auth_session SET "expiresAt"=now()+interval \'1 hour\' WHERE id=$1',[editor.sessionId]);
   for(const column of ['emailVerified','twoFactorEnabled']) {
    await owner.query('UPDATE public.r2_auth_user SET "'+column+'"=false WHERE id=$1',[editor.subject]);assert.equal((await publish('news',body)).status,403);
    await owner.query('UPDATE public.r2_auth_user SET "'+column+'"=true WHERE id=$1',[editor.subject]);
   }
   const [rights]=await db.transaction(tx=>tx.query("SELECT has_column_privilege(current_user,'app.public_content','published_by','UPDATE') AS publisher,has_column_privilege(current_user,'app.media_assets','published_by','UPDATE') AS media_publisher,has_function_privilege(current_user,'app.require_publication_staff(uuid,text,text)','EXECUTE') AS helper"));assert.deepEqual(rights,{publisher:false,media_publisher:false,helper:false});
  });
  await t.test('historical source revocation still suppresses legacy publications while authorized staff content survives',async()=>{
   await http('/api/admin/content/news/'+historical.id+'/publish',{version:historical.version});
   await owner.query('UPDATE app.content_sources SET approved=false WHERE id=$1',[sourceId]);
   assert.equal((await owner.query('SELECT id FROM app.published_content WHERE id=$1',[historical.id])).rows.length,0);assert.equal((await owner.query('SELECT id FROM app.published_content WHERE id=$1',[current.id])).rows.length,1);
   await owner.query('UPDATE app.content_sources SET approved=true WHERE id=$1',[sourceId]);
  });
  await t.test('audit and receipt history are immutable, and unrelated retired authoring stays 410',async()=>{
   await assert.rejects(owner.query('UPDATE app.audit_events SET occurred_at=now()'),error=>error.code==='42501');
   await assert.rejects(owner.query('DELETE FROM app.content_publication_receipts'),error=>error.code==='42501');
   assert.equal((await publish('services_cms',{description:'Fictional retired write'})).status,410);
  });
 } finally {
  runtime.staffAuthentication=previousAuth;
  if(previousOrigin===undefined)delete process.env.STAFF_AUTH_ORIGIN;else process.env.STAFF_AUTH_ORIGIN=previousOrigin;
  try {if(app)await app.close();else {await db?.close();await limiterDb?.close();}} finally {await owner.end();}
 }
});
