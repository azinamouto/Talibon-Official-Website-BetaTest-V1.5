require('reflect-metadata');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {readFileSync}=require('node:fs');
const {Pool}=require('pg');
const {fixtureConfig,verifyFixture}=require('./local-staging-fixture.cjs');
const {migrations}=require('../scripts/staging/runner.cjs');
const {PostgresDatabase,connectionConfig,runtimeConnectionConfig}=require('../dist/database/postgres');
const {ContentRepository}=require('../dist/database/content.repository');
const {ContentService}=require('../dist/api/content/content.service');
const {PublicContentService}=require('../dist/database/public-content.service');
const {CmsContentController}=require('../dist/api/content/cms.controller');
const {NewsContentController}=require('../dist/api/content/news.controller');
const {PublicCatalogController}=require('../dist/api/content/public-catalog.controller');
const {StaffGuard}=require('../dist/authentication/staff.guard');
const {CacheControlMiddleware}=require('../dist/security/cache-control.middleware');
const {NestFactory,APP_GUARD}=require('@nestjs/core');
const {Module}=require('@nestjs/common');
const {configureApp}=require('../dist/configure-app');
const runtime=require('../dist/authentication/runtime');
const municipalSql=readFileSync(require('node:path').join(__dirname,'../database/migrations/003_municipal_content_foundation.sql'),'utf8');
test('R2.1 municipal publishing on disposable PostgreSQL',async t=>{
 const fixture=fixtureConfig(process.env.R2_STAGING_TEST_FIXTURE);
 const owner=new Pool(connectionConfig(fixture.url.toString(),true));
 let db,app;const previousAuth=runtime.staffAuthentication;
 try {
  await verifyFixture(owner,fixture);
  await owner.query('ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC');
  for(const m of migrations()) await owner.query(m.sql);
  const preservedSource=randomUUID(),preservedPage=randomUUID();
  await owner.query("INSERT INTO app.content_sources(id,reference,owner,sha256,approved,reviewed_at) VALUES($1,'Synthetic existing R2 source','Test only',$2,true,now())",[preservedSource,'c'.repeat(64)]);
  await owner.query(`INSERT INTO app.public_content(id,kind,legacy_id,slug,title,body,source_id,publication,published_at)
    VALUES($1,'pages','preserved-fixture','preserved-fixture','Existing R2 fixture','{"content":"Preserved fixture text"}',$2,'published',now())`,[preservedPage,preservedSource]);
  const before=(await owner.query("SELECT count(*)::int AS n FROM app.public_content")).rows[0].n;
  await owner.query('BEGIN');await owner.query(municipalSql);await owner.query('COMMIT');
  assert.equal((await owner.query('SELECT count(*)::int AS n FROM app.public_content')).rows[0].n,before);
  const retained=(await owner.query('SELECT title,body,publication FROM app.public_content WHERE id=$1',[preservedPage])).rows[0];
  assert.deepEqual(retained,{title:'Existing R2 fixture',body:{content:'Preserved fixture text'},publication:'published'});
  await owner.query('CREATE ROLE cms_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS; GRANT talgov_runtime TO cms_runtime');
  const runtimeUrl=new URL(fixture.url);runtimeUrl.username='cms_runtime';
  db=new PostgresDatabase(runtimeConnectionConfig(runtimeUrl.toString(),true));
  const repo=new ContentRepository(db),publicContent=new PublicContentService();publicContent.configure(db);
  const service=new ContentService(publicContent);service.configure(repo);
  async function actor(role) {
   const subject=randomUUID(),sessionId=randomUUID();
   await owner.query('INSERT INTO r2_auth_user(id,name,email,"emailVerified","twoFactorEnabled","createdAt","updatedAt") VALUES($1,$2,$3,true,true,now(),now())',[subject,'Synthetic fixture staff',subject+'@example.invalid']);
   await owner.query("INSERT INTO r2_auth_session(id,\"userId\",token,\"expiresAt\",\"createdAt\",\"updatedAt\") VALUES($1,$2,$3,now()+interval '1 hour',now(),now())",[sessionId,subject,randomUUID()]);
   await owner.query('INSERT INTO app.staff_session_assurance(session_id) VALUES($1)',[sessionId]);
   const {rows:[row]}=await owner.query("INSERT INTO app.staff_accounts(provider,subject,role,active) VALUES('better-auth',$1,$2,true) RETURNING id",[subject,role]);
   return {...row,subject,sessionId,role,provider:'better-auth',sessionVerified:true,assurance:'mfa'};
  }
  const admin=await actor('admin'),editor=await actor('editor');
  runtime.staffAuthentication=()=>({verify:async headers=>headers.get('cookie')==='test=admin'?admin:headers.get('cookie')==='test=editor'?editor:null});
  class TestModule { configure(consumer) {consumer.apply(CacheControlMiddleware).forRoutes('*');} }
  Module({controllers:[CmsContentController,NewsContentController,PublicCatalogController],providers:[{provide:ContentService,useValue:service},{provide:PublicContentService,useValue:publicContent},{provide:APP_GUARD,useClass:StaffGuard}]})(TestModule);
  app=await NestFactory.create(TestModule,{logger:false,bodyParser:false});configureApp(app);await app.listen(0,'127.0.0.1');
  const base=await app.getUrl();process.env.STAFF_AUTH_ORIGIN=base;
  const http=(path,body,cookie='test=editor',origin=base)=>fetch(base+path,{method:body===undefined?'GET':'POST',headers:{cookie,origin,'content-type':'application/json'},...(body!==undefined?{body:JSON.stringify(body)}:{})});
  let sourceId=randomUUID();
  const input=(body={category:'ARTICLE',summary:'Synthetic summary',content:'Synthetic municipal information'})=>({title:'Synthetic fixture content',slug:'synthetic-'+randomUUID(),sourceId,body});
  await t.test('migration also applies after 001 and 002 without content policy or auth tables',async()=>{
   const name='r2_municipal_'+randomUUID().replace(/-/g,'');await owner.query(`CREATE DATABASE ${name}`);
   const url=new URL(fixture.url);url.pathname='/'+name;const fresh=new Pool(connectionConfig(url.toString(),true));
   try{await fresh.query(readFileSync(require('node:path').join(__dirname,'../database/migrations/001_foundation.sql'),'utf8'));await fresh.query(readFileSync(require('node:path').join(__dirname,'../database/migrations/002_privileges.sql'),'utf8'));await fresh.query('BEGIN');await fresh.query(municipalSql);await fresh.query('COMMIT');assert.equal((await fresh.query("SELECT column_default FROM information_schema.columns WHERE table_schema='app' AND table_name='public_content' AND column_name='version'")).rows[0].column_default,'1');}finally{await fresh.end();}
  });
  await t.test('anonymous, editor approval and cross-origin writes are rejected',async()=>{
   assert.equal((await http('/api/admin/content/news',undefined,'')).status,401);
   assert.equal((await http('/api/admin/content/news',input(),'test=editor','https://evil.invalid')).status,403);
   assert.equal((await http('/api/admin/content/sources',{reference:'Test',owner:'Test',sha256:'a'.repeat(64)})).status,403);
   assert.equal((await http('/api/admin/content/news',{...input(),role:'admin'})).status,400);
   for(const path of ['/api/services/manage','/api/news/manage','/api/payments','/api/forms/submissions']) assert.equal((await http(path,{})).status,410);
  });
  await t.test('fresh administrator creates and atomically approves actual source records',async()=>{
   const created=await http('/api/admin/content/sources',{reference:'Synthetic fixture source',owner:'Test custodian',sha256:'a'.repeat(64)},'test=admin');assert.equal(created.status,201);
   const row=(await created.json()).data;sourceId=row.id;assert.equal(row.approved,false);
   assert.equal((await http(`/api/admin/content/sources/${sourceId}/approve`,{})).status,403);
   await owner.query("UPDATE app.staff_session_assurance SET verified_at=now()-interval '6 minutes' WHERE session_id=$1",[admin.sessionId]);
   assert.equal((await http(`/api/admin/content/sources/${sourceId}/approve`,{},'test=admin')).status,403);
   await owner.query('UPDATE app.staff_session_assurance SET verified_at=now() WHERE session_id=$1',[admin.sessionId]);
   assert.equal((await http(`/api/admin/content/sources/${sourceId}/approve`,{},'test=admin')).status,201);
   assert.deepEqual((await owner.query('SELECT action FROM app.audit_events WHERE resource_id=$1 ORDER BY occurred_at,id',[sourceId])).rows.map(row=>row.action),['source.create','source.approve']);
   await assert.rejects(db.transaction(tx=>tx.query('SELECT app.approve_content_source($1,$2,$3,$4,$5)',[editor.id,editor.subject,editor.sessionId,sourceId,'forged-approval'])));
  });
  await t.test('HTTP draft, private preview, separate publish, unpublish, archive, restore and delete',async()=>{
   const created=await http('/api/admin/content/news',input());assert.equal(created.status,201);let row=(await created.json()).data;
   assert.equal(row.publication,'draft');assert.equal((await publicContent.list('news')).data.length,0);
   assert.equal((await http(`/api/admin/content/news/${row.id}/preview`,undefined,'')).status,401);
   const preview=await http(`/api/admin/content/news/${row.id}/preview`);assert.equal(preview.status,200);assert.match(preview.headers.get('cache-control'),/no-store/);
   assert.equal((await http(`/api/admin/content/news/${row.id}/edit`,{version:row.version,status:'published'})).status,400);
   for(const action of ['publish','unpublish','archive','restore']) {
    const result=await http(`/api/admin/content/news/${row.id}/${action}`,{version:row.version});assert.equal(result.status,201);row=(await result.json()).data;
    assert.equal((await publicContent.list('news')).data.some(item=>item.id===row.id),action==='publish');
    if(action==='publish')assert.equal((await http(`/api/admin/content/news/${row.id}/edit`,{version:row.version,title:'Cannot edit live'})).status,409);
   }
   assert.equal((await http(`/api/admin/content/news/${row.id}/delete`,{version:row.version})).status,403);
   assert.equal((await http(`/api/admin/content/news/${row.id}/delete`,{version:row.version},'test=admin')).status,201);
   const audits=(await owner.query('SELECT action FROM app.audit_events WHERE resource_id=$1',[row.id])).rows.map(item=>item.action);
   assert.deepEqual(audits,['content.create','content.publish','content.unpublish','content.archive','content.restore','content.delete']);
  });
  const photo=randomUUID(),pdf=randomUUID();
  await t.test('verified library attachments, captions and document categories govern publication',async()=>{
   for(const [id,kind,mime] of [[photo,'photo','image/png'],[pdf,'document','application/pdf']]) {
    const category=randomUUID();await owner.query('INSERT INTO app.media_categories(id,kind,slug,title,approved) VALUES($1,$2,$3,$4,true)',[category,kind,'synthetic-'+kind,'Test '+kind]);
    await owner.query(`INSERT INTO app.media_assets(id,kind,category_id,source_id,title,alt_text,object_key,mime,bytes,sha256,created_by,updated_by,processing,publication,published_at)
      VALUES($1,$2,$3,$4,'Synthetic media','Synthetic alternative text',$5,$6,42,$7,$8,$8,'ready','published',now())`,[id,kind,category,sourceId,'synthetic/'+id,mime,'b'.repeat(64),admin.id]);
   }
   let row=(await repo.save(editor,'transparency_reports',input({description:'Synthetic finance report',category:'finance',attachments:[{assetId:pdf,caption:'Audited PDF',altText:''}]}),'attachment-create')).data;
   await owner.query("UPDATE app.media_assets SET publication='draft',published_at=NULL WHERE id=$1",[pdf]);
   await assert.rejects(repo.change(editor,row.kind,row.id,row.version,'publish','attachment-invalid'),e=>e.code==='invalid');
   await owner.query("UPDATE app.media_assets SET publication='published',published_at=now() WHERE id=$1",[pdf]);
   row=(await repo.change(editor,row.kind,row.id,row.version,'publish','attachment-publish')).data;
   const published=(await publicContent.list(row.kind,1,20,{category:'finance'})).data[0];assert.equal(published.file_url,`/api/media/${pdf}/download`);assert.equal(published.attachments[0].caption,'Audited PDF');assert.equal(published.source_id,undefined);assert.equal(published.object_key,undefined);
   await owner.query('UPDATE app.media_categories SET approved=false WHERE id=(SELECT category_id FROM app.media_assets WHERE id=$1)',[pdf]);assert.equal((await publicContent.list(row.kind)).data.length,0);
   await owner.query('UPDATE app.media_categories SET approved=true WHERE id=(SELECT category_id FROM app.media_assets WHERE id=$1)',[pdf]);
   await assert.rejects(repo.save(editor,'galleries',input({description:'Test',category:'municipal',attachments:[{assetId:pdf,caption:'Wrong type',altText:''}]}),'wrong-gallery'),e=>e.code==='invalid');
   await assert.rejects(repo.save(editor,'galleries',input({description:'Test',category:'municipal',attachments:[{assetId:photo,caption:'Missing alt',altText:''}]}),'missing-alt'),e=>e.code==='invalid');
  });
  await t.test('every municipal module publishes through approved views',async()=>{
   const document={assetId:pdf,caption:'Synthetic document',altText:''};const image={assetId:photo,caption:'Synthetic caption',altText:'Synthetic photo'};
   const cases={advisories:{summary:'Test',content:'Test'},updates:{summary:'Test',content:'Test'},tourism_spots:{description:'Test',location:'Test'},tourism_festivals:{description:'Test',date:'2026-11-17'},tourism_delicacies:{description:'Test'},departments:{description:'Test'},galleries:{description:'Test',category:'tourism',attachments:[image]},downloadables:{description:'Test',category:'official-reports',attachments:[document]},pages:{content:'Synthetic mandate'},organizational_chart:{mayor:{name:'Test only',role:'Test only'},level2:[],departments:[]}};
   for(const [kind,body] of Object.entries(cases)) {
    const data=input(body);if(kind==='pages')data.slug='executive-mandate';if(kind==='organizational_chart')data.slug='executive-chart';
    let row=(await repo.save(editor,kind,data,'module-create')).data;row=(await repo.change(editor,kind,row.id,row.version,'publish','module-publish')).data;
    const visible=(await publicContent.list(kind)).data.find(item=>item.id===row.id);assert.ok(visible,kind);
    if(kind==='galleries')assert.equal(visible.attachments[0].alt_text,'Synthetic photo');
   }
   assert.equal((await publicContent.list('news',1,50,{category:'ADVISORY'})).data[0].category,'ADVISORY');
   assert.equal((await publicContent.list('news',1,50,{category:'UPDATE'})).data[0].category,'UPDATE');
   const {SearchService}=require('../dist/api/search/search.service');
   const search=await new SearchService(publicContent).search({q:'Synthetic',type:'news',category:'ADVISORY'});
   assert.ok(search.data.length);assert.equal(search.data[0].type,'news');assert.equal(search.data[0].category,'ADVISORY');
   const dashboard=await repo.dashboard(editor);assert.ok(dashboard.counts.some(row=>row.kind==='galleries' && row.total===1));assert.equal(dashboard.media.reduce((sum,row)=>sum+row.total,0),2);
  });
  await t.test('validation rejects URLs, unknown fields, invalid slugs and mismatched metadata',async()=>{
   for(const patch of [{slug:'../admin'},{body:{category:'ARTICLE',summary:'Test',content:'Test',image_url:'javascript:alert(1)'}},{body:{category:'UNKNOWN',summary:'Test',content:'Test'}},{body:{category:'ARTICLE',summary:'Test',content:'Test',attachments:[{assetId:randomUUID(),caption:'Missing',altText:'Test'}]}}])assert.equal((await http('/api/admin/content/news',{...input(),...patch})).status,400);
   const created=await http('/api/admin/content/news',input());const row=(await created.json()).data;
   assert.equal((await http('/api/admin/content/news',{...input(),slug:row.slug})).status,409);
  });
  await t.test('editing preserves imported government metadata and rejects altered legacy URLs',async()=>{
   const id=randomUUID(),body={content:'Synthetic original mandate',image_url:'https://official.example.invalid/mandate.png',original_reference:'Retained R2 metadata'};
   await owner.query(`INSERT INTO app.public_content(id,kind,legacy_id,slug,title,body,source_id) VALUES($1::uuid,'pages',$1::uuid::text,'legislative-mandate','Synthetic legislative mandate',$2,$3)`,[id,JSON.stringify(body),sourceId]);
   const result=await http(`/api/admin/content/pages/${id}/edit`,{version:1,body:{...body,content:'Synthetic reviewed revision'}});assert.equal(result.status,201);
   const edited=(await result.json()).data;assert.equal(edited.body.original_reference,body.original_reference);assert.equal(edited.body.image_url,body.image_url);
   assert.equal((await http(`/api/admin/content/pages/${id}/edit`,{version:edited.version,body:{...edited.body,image_url:'javascript:alert(1)'}})).status,400);
   assert.equal((await http(`/api/admin/content/pages/${id}/publish`,{version:edited.version})).status,201);
  });
  await t.test('optimistic concurrent edits and audit failure roll back all metadata and links',async()=>{
   const row=(await repo.save(editor,'news',input(),'concurrent-create')).data;
   const results=await Promise.allSettled(['First','Second'].map(title=>repo.save(editor,'news',{version:1,title},'concurrent-edit',row.id)));
   assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.code,'conflict');
   await owner.query('REVOKE INSERT ON app.audit_events FROM talgov_runtime');
   await assert.rejects(repo.save(editor,'news',{version:2,title:'Must roll back',body:{category:'ARTICLE',summary:'Test',content:'Test',featuredAssetId:photo}},'audit-failure',row.id));
   assert.equal((await owner.query('SELECT version FROM app.public_content WHERE id=$1',[row.id])).rows[0].version,2);
   assert.equal((await owner.query('SELECT count(*)::int AS n FROM app.content_asset_links WHERE content_id=$1',[row.id])).rows[0].n,0);
   await owner.query('GRANT INSERT ON app.audit_events TO talgov_runtime');
  });
  await t.test('revoked provenance, stale MFA, inactive accounts and forbidden runtime privileges fail closed',async()=>{
   await owner.query('UPDATE app.content_sources SET approved=false WHERE id=$1',[sourceId]);assert.equal((await publicContent.list('news')).data.length,0);
   await owner.query('UPDATE app.content_sources SET approved=true WHERE id=$1',[sourceId]);
   await owner.query("UPDATE app.staff_session_assurance SET verified_at=now()-interval '9 hours' WHERE session_id=$1",[editor.sessionId]);
   await assert.rejects(repo.save(editor,'news',input(),'stale-mfa'),e=>e.code==='forbidden');
   await owner.query('UPDATE app.staff_session_assurance SET verified_at=now() WHERE session_id=$1',[editor.sessionId]);await owner.query('UPDATE app.staff_accounts SET active=false WHERE id=$1',[editor.id]);
   await assert.rejects(repo.dashboard(editor),e=>e.code==='forbidden');
   for(const sql of ['DELETE FROM app.public_content','UPDATE app.content_sources SET approved=true','DELETE FROM app.audit_events','UPDATE app.audit_events SET action=\'content.create\'','CREATE TABLE app.forbidden(id int)','UPDATE app.public_content SET created_at=now()'])await assert.rejects(db.transaction(tx=>tx.query(sql)));
  });
 } finally {runtime.staffAuthentication=previousAuth;if(app)await app.close();else await db?.close();await owner.end();}
});
