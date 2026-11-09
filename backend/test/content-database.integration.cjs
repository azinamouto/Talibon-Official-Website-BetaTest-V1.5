require('reflect-metadata');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID,randomBytes,createHmac}=require('node:crypto');
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
const {PublicCatalogController}=require('../dist/api/content/public-catalog.controller');
const {StaffGuard}=require('../dist/authentication/staff.guard');
const {CacheControlMiddleware}=require('../dist/security/cache-control.middleware');
const {NestFactory,APP_GUARD}=require('@nestjs/core');
const {Module}=require('@nestjs/common');
const {configureApp}=require('../dist/configure-app');
const runtime=require('../dist/authentication/runtime');
test('CMS HTTP workflows on disposable PostgreSQL with restricted runtime',async t=>{
 const fixture=fixtureConfig(process.env.R2_STAGING_TEST_FIXTURE);
 const owner=new Pool(connectionConfig(fixture.url.toString(),true));
 let db,app;
 try {
  await verifyFixture(owner,fixture);
  await owner.query('ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC');
  for(const m of migrations()) await owner.query(m.sql);
  await owner.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC');
  await owner.query('CREATE ROLE cms_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS; GRANT talgov_runtime TO cms_runtime');
  const runtimeUrl=new URL(fixture.url);runtimeUrl.username='cms_runtime';
  db=new PostgresDatabase(runtimeConnectionConfig(runtimeUrl.toString(),true));
  const publicContent=new PublicContentService();publicContent.configure(db);
  const service=new ContentService(publicContent);service.configure(new ContentRepository(db));
  async function actor(role) {
   const subject=randomUUID(),sessionId=randomUUID();
   await owner.query('INSERT INTO r2_auth_user(id,name,email,"emailVerified","twoFactorEnabled","createdAt","updatedAt") VALUES($1,$2,$3,true,true,now(),now())',[subject,'Synthetic CMS staff',subject+'@example.invalid']);
   await owner.query(`INSERT INTO r2_auth_session(id,"userId",token,"expiresAt","createdAt","updatedAt") VALUES($1,$2,$3,now()+interval '1 hour',now(),now())`,[sessionId,subject,randomUUID()]);
   await owner.query('INSERT INTO app.staff_session_assurance(session_id) VALUES($1)',[sessionId]);
   const {rows:[row]}=await owner.query("INSERT INTO app.staff_accounts(provider,subject,role,active) VALUES('better-auth',$1,$2,true) RETURNING id",[subject,role]);
   return {...row,subject,sessionId,role,provider:'better-auth',sessionVerified:true,assurance:'mfa'};
  }
  const admin=await actor('admin'),editor=await actor('editor');
  runtime.staffAuthentication=()=>({verify:async h=>h.get('cookie')==='test=admin'?admin:h.get('cookie')==='test=editor'?editor:null});
  class TestModule { configure(consumer) {consumer.apply(CacheControlMiddleware).forRoutes('*');} }
  Module({controllers:[CmsContentController,PageContentController,NewsContentController,PublicCatalogController],providers:[{provide:ContentService,useValue:service},{provide:PublicContentService,useValue:publicContent},{provide:APP_GUARD,useClass:StaffGuard}]})(TestModule);
  app=await NestFactory.create(TestModule,{logger:false,bodyParser:false});configureApp(app);await app.listen(0,'127.0.0.1');
  const base=await app.getUrl();process.env.STAFF_AUTH_ORIGIN=base;
  const sourceId=randomUUID(),unapproved=randomUUID();
  for(const [id,approved] of [[sourceId,true],[unapproved,false]]) await owner.query("INSERT INTO app.content_sources(id,reference,owner,sha256,approved,reviewed_at) VALUES($1,'Synthetic source','Test only',$2,$3,now())",[id,'a'.repeat(64),approved]);
  const input=()=>({title:'Synthetic CMS content',slug:'synthetic-'+randomUUID(),sourceId,body:{content:'Synthetic public information'}});
  const request=(path,body,cookie='test=editor',origin=base,method='POST')=>fetch(base+path,{method,headers:{cookie,origin,'content-type':'application/json'},body:JSON.stringify(body)});
  await t.test('runtime rejects administrator and elevated inherited roles',async()=>{
   const privileged=new Pool(runtimeConnectionConfig(fixture.url.toString(),true));
   try {await assert.rejects(privileged.query('SELECT 1'));} finally {await privileged.end();}
   await owner.query('ALTER ROLE cms_runtime CREATEDB');
   const elevated=new Pool(runtimeConnectionConfig(runtimeUrl.toString(),true));
   try {await assert.rejects(elevated.query('SELECT 1'));} finally {await elevated.end();}
   await owner.query('ALTER ROLE cms_runtime NOCREATEDB');
  });
  await t.test('anonymous, forged identity, CSRF, unknown fields and kinds rejected',async()=>{
   assert.equal((await request('/api/admin/content/news',input(),'')).status,401);
   assert.equal((await request('/api/admin/content/news',input(),'role=admin')).status,401);
   assert.equal((await request('/api/admin/content/news',input(),'test=editor','https://evil.invalid')).status,403);
   assert.equal((await request('/api/admin/content/news',{...input(),approved:true})).status,400);
   assert.equal((await request('/api/admin/content/payments',input())).status,400);
  });
  for(const kind of PUBLIC_KINDS) await t.test(kind+': draft, approved publish, conflict, unpublish, admin deletion',async()=>{
   let response=await request('/api/admin/content/'+kind,input());assert.equal(response.status,201);
   let row=(await response.json()).data;
   const publicRows=async()=> (await (await fetch(base+'/api/public-content/'+kind)).json()).data;
   assert.equal((await publicRows()).some(x=>x.id===row.id),false);
   const management=await fetch(base+'/api/admin/content/'+kind,{headers:{cookie:'test=editor'}});
   assert.match(management.headers.get('cache-control'),/private.*no-store/);
   assert.ok((await management.json()).data.some(x=>x.id===row.id));
   response=await request(`/api/admin/content/${kind}/${row.id}/edit`,{version:row.version,status:'published'});assert.equal(response.status,201);
   row=(await response.json()).data;assert.ok((await publicRows()).some(x=>x.id===row.id));
   assert.equal((await request(`/api/admin/content/${kind}/${row.id}/edit`,{version:1,title:'Stale'})).status,409);
   response=await request(`/api/admin/content/${kind}/${row.id}/edit`,{version:row.version,status:'draft'});row=(await response.json()).data;
   assert.equal((await publicRows()).some(x=>x.id===row.id),false);
   assert.equal((await request(`/api/admin/content/${kind}/${row.id}/delete`,{version:row.version})).status,403);
   assert.equal((await request(`/api/admin/content/${kind}/${row.id}/delete`,{version:row.version},'test=admin')).status,201);
  });
  await t.test('existing page and news write routes use source, version and staff cookies',async()=>{
   for(const kind of ['pages','news']) {
    const body={title:'Synthetic route',slug:'route-'+randomUUID(),sourceId,content:'Test only',...(kind==='news'?{summary:'Synthetic',category:'ANNOUNCEMENT'}:{})};
    let response=await request('/api/'+kind,body);assert.equal(response.status,201);
    const row=(await response.json()).data;
    response=await request(`/api/${kind}/${row.id}`,{version:1,status:'published'},'test=editor',base,'PATCH');assert.equal(response.status,200);
    assert.equal((await fetch(base+`/api/${kind}`)).status,200);
   }
  });
  await t.test('advisory/public-notice filtering and dates agree with public consumers',async()=>{
   for(const category of ['ADVISORY','NOTICE']) {
    const response=await request('/api/admin/content/news',{...input(),status:'published',body:{category,summary:'Synthetic bulletin'}});
    assert.equal(response.status,201);const row=(await response.json()).data;
    const result=await fetch(base+'/api/news?category='+category);assert.equal(result.status,200);
    const published=(await result.json()).data.find(x=>x.id===row.id);
    assert.equal(published.category,category);assert.ok(published.date);
   }
  });
  await t.test('concurrent updates, fresh administrator MFA and atomic audit failure',async()=>{
   const created=await request('/api/admin/content/pages',input());const row=(await created.json()).data;
   const results=await Promise.all(['First','Second'].map(title=>request(`/api/admin/content/pages/${row.id}/edit`,{version:1,title})));
   assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);
   await owner.query("UPDATE app.staff_session_assurance SET verified_at=now()-interval '6 minutes' WHERE session_id=$1",[admin.sessionId]);
   assert.equal((await request(`/api/admin/content/pages/${row.id}/delete`,{version:2},'test=admin')).status,403);
   await owner.query('UPDATE app.staff_session_assurance SET verified_at=now() WHERE session_id=$1',[admin.sessionId]);
   await owner.query('REVOKE INSERT ON app.audit_events FROM talgov_runtime');
   assert.equal((await request(`/api/admin/content/pages/${row.id}/edit`,{version:2,title:'Must roll back'})).status,503);
   const saved=(await owner.query('SELECT version,title FROM app.public_content WHERE id=$1',[row.id])).rows[0];
   assert.equal(saved.version,2);assert.notEqual(saved.title,'Must roll back');
   await owner.query('GRANT INSERT ON app.audit_events TO talgov_runtime');
  });
  await t.test('unapproved source, revoked session, inactive account, stale MFA and runtime privileges',async()=>{
   assert.equal((await request('/api/admin/content/news',{...input(),sourceId:unapproved,status:'published'})).status,400);
   await owner.query("UPDATE app.staff_session_assurance SET verified_at=now()-interval '9 hours' WHERE session_id=$1",[editor.sessionId]);
   assert.equal((await request('/api/admin/content/news',input())).status,403);
   await owner.query('UPDATE app.staff_session_assurance SET verified_at=now() WHERE session_id=$1',[editor.sessionId]);
   await owner.query('UPDATE app.staff_accounts SET active=false WHERE id=$1',[editor.id]);
   assert.equal((await request('/api/admin/content/news',input())).status,403);
   await owner.query('UPDATE app.staff_accounts SET active=true WHERE id=$1',[editor.id]);
   await owner.query('DELETE FROM r2_auth_session WHERE id=$1',[editor.sessionId]);
   assert.equal((await request('/api/admin/content/news',input())).status,403);
   for(const sql of ['DELETE FROM app.public_content','UPDATE app.content_sources SET approved=true','DELETE FROM app.audit_events','CREATE TABLE app.forbidden(id int)']) await assert.rejects(db.transaction(tx=>tx.query(sql)));
   assert.ok((await owner.query("SELECT 1 FROM app.audit_events WHERE action='content.create'")).rowCount>=13);
  });
  await t.test('real password and TOTP cookies drive admin/editor CMS writes and public reads',async()=>{
   const {BetterAuthAdapter}=require('../dist/authentication/better-auth.adapter');
   const {hashPassword}=require('better-auth/crypto');
   const adapter=new BetterAuthAdapter({databaseUrl:runtimeUrl.toString(),origin:base,secret:randomBytes(48).toString('base64url'),localTest:true,sendResetPassword:async()=>{throw new Error('No external mail in tests');}});
   const original=runtime.staffAuthentication;runtime.staffAuthentication=()=>adapter;
   function code(secret) {
    const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits='';
    for(const char of secret.replace(/=+$/,'')) bits+=alphabet.indexOf(char.toUpperCase()).toString(2).padStart(5,'0');
    const bytes=[];for(let i=0;i+8<=bits.length;i+=8)bytes.push(parseInt(bits.slice(i,i+8),2));
    const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));
    const digest=createHmac('sha1',Buffer.from(bytes)).update(counter).digest(),offset=digest[19]&15;
    return ((digest.readUInt32BE(offset)&0x7fffffff)%1000000).toString().padStart(6,'0');
   }
   try {
    for(const role of ['editor','admin']) {
     const subject=randomUUID(),email=subject+'@example.invalid',password=randomBytes(24).toString('base64url');
     await owner.query('INSERT INTO r2_auth_user(id,name,email,"emailVerified","createdAt","updatedAt") VALUES($1,$2,$3,true,now(),now())',[subject,'Synthetic login staff',email]);
     await owner.query('INSERT INTO r2_auth_account(id,"accountId","providerId","userId",password,"createdAt","updatedAt") VALUES($1,$2,$3,$2,$4,now(),now())',[randomUUID(),subject,'credential',await hashPassword(password)]);
     await owner.query("INSERT INTO app.staff_accounts(provider,subject,role,active) VALUES('better-auth',$1,$2,true)",[subject,role]);
     const jar=new Map();
     async function send(path,body) {
      const response=await request(path,body,[...jar].map(([k,v])=>k+'='+v).join('; '));
      for(const cookie of response.headers.getSetCookie()){const pair=cookie.split(';')[0],i=pair.indexOf('=');jar.set(pair.slice(0,i),pair.slice(i+1));}
      return response;
     }
     assert.equal((await send('/api/staff-auth/sign-in/email',{email,password})).status,200);
     assert.equal((await send('/api/admin/content/news',input())).status,401);
     const setup=await send('/api/staff-auth/two-factor/enable',{password});assert.equal(setup.status,200);
     const secret=new URL((await setup.json()).totpURI).searchParams.get('secret');
     assert.equal((await send('/api/staff-auth/two-factor/verify-totp',{code:code(secret)})).status,200);
     const created=await send('/api/admin/content/news',input());assert.equal(created.status,201);const row=(await created.json()).data;
     assert.equal((await send(`/api/admin/content/news/${row.id}/edit`,{version:1,status:'published'})).status,201);
     const published=await fetch(base+'/api/news/'+row.id);assert.equal(published.status,200);
     assert.equal((await published.json()).data.id,row.id);
     assert.equal((await send(`/api/admin/content/news/${row.id}/delete`,{version:2})).status,role==='admin'?201:403);
     assert.equal((await send('/api/staff-auth/sign-out',{})).status,200);
     assert.equal((await send('/api/admin/content/news',input())).status,401);
    }
   } finally {runtime.staffAuthentication=original;await adapter.close();}
  });
 } finally {if(app) await app.close();else await db?.close();await owner.end();}
});
