require('reflect-metadata');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {Pool}=require('pg');
const {fixtureConfig,verifyFixture}=require('./local-staging-fixture.cjs');
const {migrations}=require('../scripts/staging/runner.cjs');
const {PostgresDatabase,connectionConfig,runtimeConnectionConfig}=require('../dist/database/postgres');
const {ContentRepository}=require('../dist/database/content.repository');
const {ContentService}=require('../dist/api/content/content.service');
const {PublicContentService,PUBLIC_KINDS}=require('../dist/database/public-content.service');
const {CmsContentController}=require('../dist/api/content/cms.controller');
const {PageContentController}=require('../dist/api/content/pages.controller');
const {NewsContentController}=require('../dist/api/content/news.controller');
const {ServiceContentController}=require('../dist/api/content/services.controller');
const {PublicCatalogController}=require('../dist/api/content/public-catalog.controller');
const {StaffGuard}=require('../dist/authentication/staff.guard');
const {CacheControlMiddleware}=require('../dist/security/cache-control.middleware');
const {NestFactory,APP_GUARD}=require('@nestjs/core');
const {Module}=require('@nestjs/common');
const {configureApp}=require('../dist/configure-app');
const runtime=require('../dist/authentication/runtime');

test('public content and media-only CMS boundary on disposable PostgreSQL',async t=>{
 const fixture=fixtureConfig(process.env.R2_STAGING_TEST_FIXTURE);
 const owner=new Pool(connectionConfig(fixture.url.toString(),true));
 let db,app;const previousAuth=runtime.staffAuthentication;
 try {
  await verifyFixture(owner,fixture);
  await owner.query('ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC');
  for(const m of migrations()) await owner.query(m.sql);
  await owner.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC');
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
  const admin=await actor('admin'),editor=await actor('editor');let authCalls=0;
  runtime.staffAuthentication=()=>({verify:async()=>{authCalls++;throw Error('Deferred authoring must not authenticate');}});
  class TestModule { configure(consumer) {consumer.apply(CacheControlMiddleware).forRoutes('*');} }
  Module({controllers:[CmsContentController,PageContentController,NewsContentController,ServiceContentController,PublicCatalogController],providers:[{provide:ContentService,useValue:service},{provide:PublicContentService,useValue:publicContent},{provide:APP_GUARD,useClass:StaffGuard}]})(TestModule);
  app=await NestFactory.create(TestModule,{logger:false,bodyParser:false});configureApp(app);await app.listen(0,'127.0.0.1');
  const base=await app.getUrl();process.env.STAFF_AUTH_ORIGIN=base;
  const sourceId=randomUUID(),unapproved=randomUUID();
  for(const [id,approved] of [[sourceId,true],[unapproved,false]]) await owner.query("INSERT INTO app.content_sources(id,reference,owner,sha256,approved,reviewed_at) VALUES($1,'Synthetic fixture source','Test only',$2,$3,now())",[id,'a'.repeat(64),approved]);
  const input=()=>({title:'Synthetic fixture content',slug:'synthetic-'+randomUUID(),sourceId,body:{content:'Synthetic test information'}});
  await t.test('runtime rejects owners and unsafe inherited privileges',async()=>{
   const privileged=new Pool(runtimeConnectionConfig(fixture.url.toString(),true));
   try {await assert.rejects(privileged.query('SELECT 1'));} finally {await privileged.end();}
   for(const [elevate,restore] of [
    ['ALTER ROLE cms_runtime CREATEDB','ALTER ROLE cms_runtime NOCREATEDB'],
    ['ALTER TABLE app.content_sources OWNER TO cms_runtime','ALTER TABLE app.content_sources OWNER TO postgres'],
    ['GRANT talgov_runtime TO cms_runtime WITH INHERIT FALSE','GRANT talgov_runtime TO cms_runtime WITH INHERIT TRUE'],
   ]) {
    await owner.query(elevate);const unsafe=new Pool(runtimeConnectionConfig(runtimeUrl.toString(),true));
    try {await assert.rejects(unsafe.query('SELECT 1'));} finally {await unsafe.end();await owner.query(restore);}
   }
  });
  await t.test('exact news, pages and services URLs return empty valid pagination',async()=>{
   for(const kind of ['news','pages','services']) {
    const response=await fetch(new URL('/api/'+kind,base));assert.equal(response.status,200);
    const body=await response.json();assert.deepEqual(body.data,[]);
    assert.equal(body.pagination.page,1);assert.equal(body.pagination.total,0);assert.equal(body.pagination.totalPages,0);
    assert.ok(Number.isInteger(body.pagination.limit));
    const preflight=await fetch(base+'/api/'+kind,{method:'OPTIONS',headers:{origin:base,'access-control-request-method':'GET','access-control-request-headers':'X-API-Version'}});
    assert.equal(preflight.status,204);assert.equal(preflight.headers.get('access-control-allow-origin'),base);
   }
  });
  await t.test('each public list independently rejects unexpected utm_source',async()=>{
   for(const kind of ['news','pages','services']) {
    const response=await fetch(base+'/api/'+kind+'?utm_source=chatgpt.com');assert.equal(response.status,400);
    assert.match(JSON.stringify(await response.json()),/utm_source/);
   }
  });
  await t.test('text authoring is 410 before parsing, staff verification or writes',async()=>{
   const before=(await owner.query('SELECT count(*)::int AS count FROM app.audit_events')).rows[0].count;
   for(const target of ['/api/admin/content/news','/api/admin/content/pages/'+randomUUID()+'/edit','/api/admin/content/news/'+randomUUID()+'/delete','/api/news','/api/pages/'+randomUUID(),'/api/services/'+randomUUID()]) {
    for(const method of ['POST','PATCH','DELETE']) {
     const response=await fetch(base+target,{method,headers:{cookie:'forged=admin',origin:'https://evil.invalid','content-type':'application/json'},body:'{malformed'});
     assert.equal(response.status,410);assert.match(response.headers.get('cache-control'),/no-store/);
     assert.equal((await response.json()).message,'CMS authoring is limited to photos and documents.');
    }
   }
   for(const target of ['/api/admin/content/news','/api/news/manage','/api/pages/manage/'+randomUUID(),'/api/services/manage']) assert.equal((await fetch(base+target)).status,410);
   assert.equal(authCalls,0);assert.equal((await owner.query('SELECT count(*)::int AS count FROM app.audit_events')).rows[0].count,before);
   assert.equal((await owner.query('SELECT count(*)::int AS count FROM app.public_content')).rows[0].count,0);
  });
  // Repository writes below prepare synthetic operator fixtures, not staff API features.
  // Keep publication, concurrency and audit rollback coverage for retained database code.
  for(const kind of PUBLIC_KINDS) await t.test(kind+': approved fixture visibility, versions and deletion',async()=>{
   let row=(await repo.save(editor,kind,input(),'fixture-create')).data;
   const publicRows=async()=> (await (await fetch(base+'/api/public-content/'+kind)).json()).data;
   assert.equal((await publicRows()).some(x=>x.id===row.id),false);
   row=(await repo.save(editor,kind,{version:row.version,status:'published'},'fixture-publish',row.id)).data;
   assert.ok((await publicRows()).some(x=>x.id===row.id));
   await assert.rejects(repo.save(editor,kind,{version:1,title:'Stale'},'fixture-stale',row.id),error=>error.code==='conflict');
   row=(await repo.save(editor,kind,{version:row.version,status:'draft'},'fixture-unpublish',row.id)).data;
   assert.equal((await publicRows()).some(x=>x.id===row.id),false);
   await assert.rejects(repo.remove(editor,kind,row.id,row.version,'fixture-delete'),error=>error.code==='forbidden');
   await repo.remove(admin,kind,row.id,row.version,'fixture-delete');
  });
  await t.test('news filtering and source revocation preserve privacy',async()=>{
   for(const category of ['ADVISORY','NOTICE']) {
    const row=(await repo.save(editor,'news',{...input(),status:'published',body:{category,summary:'Synthetic fixture bulletin'}},'fixture-category')).data;
    const result=await fetch(base+'/api/news?category='+category);assert.equal(result.status,200);
    const published=(await result.json()).data.find(x=>x.id===row.id);
    assert.equal(published.category,category);assert.ok(published.date);
    assert.equal(published.created_by,undefined);assert.equal(published.object_key,undefined);
   }
   await owner.query('UPDATE app.content_sources SET approved=false WHERE id=$1',[sourceId]);
   assert.deepEqual((await (await fetch(base+'/api/news')).json()).data,[]);
   await owner.query('UPDATE app.content_sources SET approved=true WHERE id=$1',[sourceId]);
  });
  await t.test('fixture update conflicts and audit failures remain atomic',async()=>{
   const row=(await repo.save(editor,'pages',input(),'fixture-concurrent')).data;
   const results=await Promise.allSettled(['First','Second'].map(title=>repo.save(editor,'pages',{version:1,title},'fixture-concurrent',row.id)));
   assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.code,'conflict');
   await owner.query('REVOKE INSERT ON app.audit_events FROM talgov_runtime');
   await assert.rejects(repo.save(editor,'pages',{version:2,title:'Must roll back'},'fixture-audit',row.id));
   const saved=(await owner.query('SELECT version,title FROM app.public_content WHERE id=$1',[row.id])).rows[0];
   assert.equal(saved.version,2);assert.notEqual(saved.title,'Must roll back');
   await owner.query('GRANT INSERT ON app.audit_events TO talgov_runtime');
  });
  await t.test('unapproved sources, stale MFA and forbidden runtime writes fail closed',async()=>{
   await assert.rejects(repo.save(editor,'news',{...input(),sourceId:unapproved,status:'published'},'fixture-unapproved'),error=>error.code==='invalid');
   await owner.query("UPDATE app.staff_session_assurance SET verified_at=now()-interval '9 hours' WHERE session_id=$1",[editor.sessionId]);
   await assert.rejects(repo.save(editor,'news',input(),'fixture-stale-mfa'),error=>error.code==='forbidden');
   for(const sql of ['DELETE FROM app.public_content','UPDATE app.content_sources SET approved=true','DELETE FROM app.audit_events','CREATE TABLE app.forbidden(id int)']) await assert.rejects(db.transaction(tx=>tx.query(sql)));
  });
 } finally {runtime.staffAuthentication=previousAuth;if(app) await app.close();else await db?.close();await owner.end();}
});
