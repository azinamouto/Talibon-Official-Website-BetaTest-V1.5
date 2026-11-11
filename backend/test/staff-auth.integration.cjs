const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes, randomUUID, createHmac } = require('node:crypto');
const express = require('express');
const { Pool } = require('pg');
const { migrate, isolatedConfig } = require('../scripts/r2-migrate.cjs');
const { BetterAuthAdapter, providerOptions } = require('../dist/authentication/better-auth.adapter');
const { getMigrations } = require('better-auth/db/migration');
const { hashPassword } = require('better-auth/crypto');
let admin, adapter, server, base, runtime, resetDelivery;
const accounts = new Map();
const hosted = process.env.R2_AUTH_HOSTED === '1';
function totp(secret, timestamp=Date.now()) {
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits='';
  for (const char of secret.replace(/=+$/,'')) bits+=alphabet.indexOf(char.toUpperCase()).toString(2).padStart(5,'0');
  const bytes=[]; for(let i=0;i+8<=bits.length;i+=8) bytes.push(parseInt(bits.slice(i,i+8),2));
  const counter=Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(Math.floor(timestamp/30000)));
  const digest=createHmac('sha1',Buffer.from(bytes)).update(counter).digest(); const offset=digest[19]&15;
  return ((digest.readUInt32BE(offset)&0x7fffffff)%1000000).toString().padStart(6,'0');
}
let clientNumber=0;
function browser() {
  const clientIp=`127.0.0.${++clientNumber}`;
  const jar=new Map();
  return { jar, async request(route, body, extra={}) {
    const response=await fetch(base+route,{method:body===undefined?'GET':'POST',
      headers:{cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; '),origin:base,'content-type':'application/json','x-test-client':clientIp,...extra},
      ...(body===undefined?{}:{body:JSON.stringify(body)})});
    for(const cookie of response.headers.getSetCookie()) {const pair=cookie.split(';')[0];const i=pair.indexOf('=');jar.set(pair.slice(0,i),pair.slice(i+1));}
    return {status:response.status,body:await response.json(),cookies:response.headers.getSetCookie()};
  }};
}
async function seed(role='editor', active=true, verified=true) {
  const subject=randomUUID(), password=randomBytes(24).toString('base64url'), email=`${subject}@example.invalid`;
  const hash=await hashPassword(password);
  await admin.query('INSERT INTO r2_auth_user(id,name,email,"emailVerified","createdAt","updatedAt") VALUES($1,$2,$3,$4,now(),now())',[subject,'Synthetic staff',email,verified]);
  await admin.query('INSERT INTO r2_auth_account(id,"accountId","providerId","userId",password,"createdAt","updatedAt") VALUES($1,$2,$3,$2,$4,now(),now())',[randomUUID(),subject,'credential',hash]);
  const result=await admin.query("INSERT INTO app.staff_accounts(provider,subject,role,active) VALUES('better-auth',$1,$2,$3) RETURNING id",[subject,role,active]);
  const account={subject,password,email,id:result.rows[0].id}; accounts.set(subject,account); return account;
}
async function enroll(account) {
  const client=browser();
  const login=await client.request('/api/staff-auth/sign-in/email',{email:account.email,password:account.password});
  assert.equal(login.status,200);
  assert.match(login.cookies.join('; '),/HttpOnly/i);
  assert.match(login.cookies.join('; '),/SameSite=Strict/i);
  assert.match(login.cookies.join('; '),/Path=\//i);
  assert.equal((await client.request('/api/staff/me')).status,401,'password-only session cannot access staff');
  const setup=await client.request('/api/staff-auth/two-factor/enable',{password:account.password});
  assert.equal(setup.status,200);
  account.secret=new URL(setup.body.totpURI).searchParams.get('secret'); account.backup=setup.body.backupCodes;
  account.lastTotp=totp(account.secret);
  assert.equal((await client.request('/api/staff-auth/two-factor/verify-totp',{code:account.lastTotp})).status,200);
  return client;
}
async function challenge(account) {
  const client=browser();
  const login=await client.request('/api/staff-auth/sign-in/email',{email:account.email,password:account.password});
  assert.equal(login.status,200);
  assert.equal(login.body.mfaRequired,true);
  return client;
}
async function nextTotp(secret, previous) {
  const deadline=Date.now()+35000;
  while(Date.now()<deadline) {
    const code=totp(secret);
    if(code!==previous) return code;
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  throw new Error('TOTP did not advance during the test window');
}
before(async()=>{
  const {fixtureConfig,verifyFixture}=require('./local-staging-fixture.cjs');
  const fixture=process.env.R2_STAGING_TEST_FIXTURE ? fixtureConfig(process.env.R2_STAGING_TEST_FIXTURE) : null;
  assert.ok(!fixture || !hosted);
  const url=fixture ? fixture.url.toString() : process.env.R2_AUTH_TEST_URL;
  let config;
  if(hosted) {
    const { verifyTarget,neonConfig }=require('../scripts/r2-neon-target.cjs'); verifyTarget();
    const database=new URL(url).pathname.slice(1); assert.match(database,/^r2_auth_[a-f0-9]{12}$/);
    config=neonConfig(url,{databases:[database]});
  } else config=fixture ? require('../dist/database/postgres').connectionConfig(url,true) : isolatedConfig(url);
  admin=new Pool(config);
  if(fixture) {
    await verifyFixture(admin,fixture);
    for(const m of require('../scripts/staging/runner.cjs').migrations()) await admin.query(m.sql);
  } else {
    await migrate(admin);
  }
  const origin='http://127.0.0.1';
  const options={databaseUrl:url,origin,secret:randomBytes(48).toString('base64url'),localTest:!hosted,sendResetPassword:async input=>{resetDelivery=input;}};
  const file=path.join(__dirname,'../database/auth/001_provider.sql');
  if(!fs.existsSync(file)) {
    assert.equal(hosted,false,'Schema generation is local only');
    const plan=await getMigrations(providerOptions(admin,options));
    fs.writeFileSync(file,'-- Generated from pinned Better Auth 1.7.15; reviewed and applied only by isolated qualification.\n'+await plan.compileMigrations());
  }
  if(!fixture) {
    await admin.query(fs.readFileSync(file,'utf8'));
    await admin.query(fs.readFileSync(path.join(__dirname,'../database/auth/002_staff_policy.sql'),'utf8'));
  }
  const schemaPlan=await getMigrations(providerOptions(admin,options));
  assert.equal(schemaPlan.toBeCreated.length,0);
  assert.equal(schemaPlan.toBeAdded.length,0);
  if(hosted) runtime=process.env.R2_AUTH_RUNTIME_URL;
  else {
    await admin.query('CREATE ROLE r2_auth_runtime LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS');
    await admin.query('GRANT talgov_runtime TO r2_auth_runtime');
    const u=new URL(url);u.username='r2_auth_runtime';runtime=u.toString();
  }
  const app=express();app.use(express.json({limit:'16kb'}));
  // Simulated independent network clients; production never reads this test header.
  app.use((req,_res,next)=>{Object.defineProperty(req,'ip',{value:req.headers['x-test-client']||'127.0.0.1'});next();});
  server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
  base=`http://127.0.0.1:${server.address().port}`;
  // HTTP transport is loopback; hosted DB still uses certificate verification and required channel binding.
  adapter=new BetterAuthAdapter({...options,databaseUrl:runtime,origin:base,localTest:true});
  app.use((req,res,next)=>void adapter.handle(req,res,next));app.use((_req,res)=>res.status(404).json({message:'Not found'}));
});
after(async()=>{await new Promise(resolve=>server?server.close(resolve):resolve());await adapter?.close();await admin?.end();});

test('closed registration, forbidden provider endpoints, cross-origin and default-deny',async()=>{
  const client=browser();
  for(const route of ['/sign-up/email','/sign-in/social','/two-factor/disable','/update-user','/admin/create-user','/get-session'])
    assert.equal((await client.request('/api/staff-auth'+route,{})).status,403);
  assert.equal((await client.request('/api/staff-auth/sign-in/email',{}, {origin:'https://evil.invalid'})).status,403);
  assert.equal((await client.request('/api/staff-auth/sign-in/email',{}, {origin:'null'})).status,403);
  assert.equal((await client.request('/api/staff-auth/sign-in/email',{}, {'content-type':'text/plain'})).status,403);
  assert.equal((await client.request('/api/staff/me')).status,401);
  const result=await adapter.auth.handler(new Request(base+'/api/staff-auth/sign-up/email',{method:'POST',headers:{origin:base,'content-type':'application/json'},body:JSON.stringify({email:'closed@example.invalid',password:randomBytes(24).toString('hex'),name:'Synthetic'})}));
  assert.equal(result.ok,false,'provider itself rejects signup');
});
test('real password login, TOTP enrollment, MFA proof, secure response, editor escalation denial',async()=>{
  const account=await seed(); const client=await enroll(account);
  const factor=await admin.query('SELECT secret,"backupCodes" FROM r2_auth_two_factor WHERE "userId"=$1',[account.subject]);
  assert.notEqual(factor.rows[0].secret,account.secret);
  assert.equal(factor.rows[0].backupCodes.includes(account.backup[0]),false);
  const secure=providerOptions(adapter.pool,{databaseUrl:'postgresql://localhost/test',origin:'https://staff.example.invalid',
    secret:randomBytes(48).toString('base64url'),sendResetPassword:async()=>{}});
  assert.equal(secure.advanced.useSecureCookies,true);
  assert.deepEqual(secure.advanced.defaultCookieAttributes,{httpOnly:true,sameSite:'strict',path:'/'});
  assert.equal(secure.session.expiresIn,28800);
  assert.equal(secure.session.disableSessionRefresh,true);
  const me=await client.request('/api/staff/me');assert.equal(me.status,200);assert.equal(me.body.role,'editor');
  assert.equal((await client.request(`/api/staff/${account.id}/deactivate`,{})).status,403);
  assert.equal((await client.request('/api/staff/unknown')).status,403);
  assert.equal((await client.request('/api/staff-auth/two-factor/verify-totp',{code:totp(account.secret),trustDevice:true})).status,400);
});
test('MFA challenge, wrong factor, backup recovery single use, session revocation',async()=>{
  const account=await seed();const enrolled=await enroll(account);
  assert.equal((await enrolled.request('/api/staff-auth/sign-out',{})).status,200);
  assert.equal((await enrolled.request('/api/staff/me')).status,401);
  const client=browser();
  const login=await client.request('/api/staff-auth/sign-in/email',{email:account.email,password:account.password});
  assert.equal(login.status,200);assert.equal(login.body.mfaRequired,true);assert.equal('token' in login.body,false);
  assert.equal((await client.request('/api/staff/me')).status,401);
  assert.equal((await client.request('/api/staff-auth/two-factor/verify-totp',{code:'not-a-code'})).status,401);
  assert.equal((await client.request('/api/staff-auth/two-factor/verify-backup-code',{code:account.backup[0]})).status,200);
  assert.equal((await client.request('/api/staff/me')).status,200);
  const other=browser();await other.request('/api/staff-auth/sign-in/email',{email:account.email,password:account.password});
  assert.equal((await other.request('/api/staff-auth/two-factor/verify-backup-code',{code:account.backup[0]})).status,401);
  const cookies=[...client.jar];await client.request('/api/staff-auth/sign-out',{});client.jar.clear();for(const pair of cookies)client.jar.set(...pair);
  assert.equal((await client.request('/api/staff/me')).status,401);
});
test('password recovery consumes token, revokes sessions, preserves mandatory MFA',async()=>{
  const account=await seed();const client=await enroll(account);const anonymous=browser();
  const known=await anonymous.request('/api/staff-auth/request-password-reset',{email:account.email});
  const absent=await anonymous.request('/api/staff-auth/request-password-reset',{email:'absent@example.invalid'});
  assert.deepEqual(known.body,absent.body);assert.equal(known.status,200);
  assert.ok(resetDelivery?.url);const token=new URLSearchParams(new URL(resetDelivery.url).hash.slice(1)).get('token');
  const newPassword=randomBytes(24).toString('base64url');
  assert.equal((await anonymous.request('/api/staff-auth/reset-password',{token,newPassword})).status,200);
  assert.equal((await anonymous.request('/api/staff-auth/reset-password',{token,newPassword})).status,400);
  assert.equal((await client.request('/api/staff/me')).status,401);
  const login=await anonymous.request('/api/staff-auth/sign-in/email',{email:account.email,password:newPassword});
  assert.equal(login.body.mfaRequired,true);assert.equal((await anonymous.request('/api/staff/me')).status,401);
});
test('expiry, forged cookies, deactivated account, administrator revocation and audit immutability',async()=>{
  const administrator=await seed('admin');const adminClient=await enroll(administrator);
  assert.equal((await adminClient.request(`/api/staff/${administrator.id}/deactivate`,{version:1})).status,409,'the last administrator cannot be deactivated');
  const account=await seed();const client=await enroll(account);
  await admin.query("UPDATE app.staff_session_assurance SET verified_at=now()-interval '6 minutes' WHERE session_id=(SELECT id FROM r2_auth_session WHERE \"userId\"=$1)",[administrator.subject]);
  assert.equal((await adminClient.request(`/api/staff/${account.id}/revoke`,{})).status,403,'staff access changes require fresh MFA');
  const freshCode=await nextTotp(administrator.secret,administrator.lastTotp);
  assert.equal((await adminClient.request('/api/staff-auth/two-factor/verify-totp',{code:freshCode})).status,200);
  assert.equal((await adminClient.request(`/api/staff/${account.id}/revoke`,{})).status,200);
  assert.equal((await client.request('/api/staff/me')).status,401);
  const second=await seed();const other=await enroll(second);
  assert.equal((await adminClient.request(`/api/staff/${second.id}/deactivate`,{version:1})).status,200);
  assert.equal((await other.request('/api/staff/me')).status,401);
  const third=await seed();const expired=await enroll(third);
  await admin.query('UPDATE r2_auth_session SET "expiresAt"=now()-interval \'1 second\' WHERE "userId"=$1',[third.subject]);
  assert.equal((await expired.request('/api/staff/me')).status,401);
  assert.equal((await browser().request('/api/staff/me',undefined,{cookie:'talgov-staff.session_token=forged'})).status,401);
  await assert.rejects(adapter.pool.query("UPDATE app.staff_auth_audit SET action='forged'"));
  await assert.rejects(adapter.pool.query('CREATE TABLE public.unauthorized(id int)'));
  const count=await admin.query('SELECT count(*)::int n FROM app.staff_auth_audit');assert.ok(count.rows[0].n>10);
});
test('concurrent staff sessions remain isolated and concurrent TOTP replay is denied',async()=>{
  const account=await seed();const original=await enroll(account);
  const current=await nextTotp(account.secret,account.lastTotp);
  const first=await challenge(account),second=await challenge(account);
  const later=totp(account.secret,Date.now()+30000);
  assert.notEqual(current,later);
  const sessions=await Promise.all([
    first.request('/api/staff-auth/two-factor/verify-totp',{code:current}),
    second.request('/api/staff-auth/two-factor/verify-totp',{code:later}),
  ]);
  assert.deepEqual(sessions.map(result=>result.status),[200,200]);
  assert.deepEqual((await Promise.all([original.request('/api/staff/me'),first.request('/api/staff/me'),second.request('/api/staff/me')])).map(result=>result.status),[200,200,200]);
  const count=await admin.query('SELECT count(*)::int n FROM r2_auth_session WHERE "userId"=$1',[account.subject]);
  assert.equal(count.rows[0].n,3);
});
test('staff directory and audit are admin-only, bounded, versioned and MFA-stepped-up',async()=>{
  const administrator=await seed('admin');const adminClient=await enroll(administrator);
  const editor=await seed('editor');const editorClient=await enroll(editor);
  const target=await seed('editor');const targetClient=await enroll(target);
  const inactive=await seed('editor',false);
  assert.equal((await adminClient.request('/api/staff/me')).body.role,'admin');
  const firstPage=await adminClient.request('/api/staff?limit=1&page=1');
  assert.equal(firstPage.status,200,JSON.stringify(firstPage.body));assert.equal(firstPage.body.data.length,1);
  assert.equal(firstPage.body.pagination.limit,1);assert.equal(firstPage.body.pagination.page,1);
  assert.equal(typeof firstPage.body.pagination.hasMore,'boolean');
  assert.equal('subject' in firstPage.body.data[0],false);
  assert.equal((await adminClient.request('/api/staff?limit=101')).status,400);
  const editorList=await editorClient.request('/api/staff');
  assert.equal(editorList.status,403);
  assert.equal((await editorClient.request('/api/staff/audit')).status,403);
  assert.equal((await editorClient.request(`/api/staff/${administrator.id}/role`,{version:1,role:'admin'})).status,403);
  assert.equal((await adminClient.request(`/api/staff/${target.id}/revoke`,{}, {origin:'https://evil.invalid'})).status,403);
  const stepUp=await nextTotp(administrator.secret,administrator.lastTotp);
  assert.equal((await adminClient.request('/api/staff-auth/two-factor/verify-totp',{code:stepUp})).status,200);
  assert.equal((await adminClient.request(`/api/staff/${inactive.id}/activate`,{version:1})).status,200);
  const activated=await enroll(inactive);
  assert.equal((await activated.request('/api/staff/me')).status,200);
  assert.equal((await adminClient.request(`/api/staff/${target.id}/role`,{version:1,role:'admin'})).status,200);
  assert.equal((await targetClient.request('/api/staff/me')).status,401);
  assert.equal((await adminClient.request(`/api/staff/${target.id}/deactivate`,{version:1})).status,409,'stale staff versions are rejected');
  assert.equal((await adminClient.request(`/api/staff/${target.id}/deactivate`,{version:2})).status,200);
  const updated=await admin.query('SELECT role,active,version FROM app.staff_accounts WHERE id=$1',[target.id]);
  assert.deepEqual(updated.rows[0],{role:'admin',active:false,version:3});
  const audit=await adminClient.request('/api/staff/audit?limit=100');
  assert.equal(audit.status,200);
  assert.ok(audit.body.data.some(event=>event.action==='account.role.editor_to_admin' && event.subjectId===target.subject));
  assert.ok(audit.body.data.some(event=>event.action==='account.activate' && event.subjectId===inactive.subject));
  assert.ok(audit.body.data.some(event=>event.action==='account.deactivate' && event.subjectId===target.subject));
  assert.ok(audit.body.data.some(event=>event.source==='mutation' && event.actorId===administrator.id));
});
test('concurrent TOTP replay and backup-code reuse authorize at most one session',async()=>{
  const account=await seed();await enroll(account);
  const code=await nextTotp(account.secret,account.lastTotp);
  const first=await challenge(account),second=await challenge(account);
  const replay=await Promise.all([
    first.request('/api/staff-auth/two-factor/verify-totp',{code}),
    second.request('/api/staff-auth/two-factor/verify-totp',{code}),
  ]);
  assert.equal(replay.filter(result=>result.status===200).length,1);
  assert.equal(replay.filter(result=>result.status===401).length,1);
  const backupOne=await challenge(account),backupTwo=await challenge(account);
  const backup=await Promise.all([
    backupOne.request('/api/staff-auth/two-factor/verify-backup-code',{code:account.backup[1]}),
    backupTwo.request('/api/staff-auth/two-factor/verify-backup-code',{code:account.backup[1]}),
  ]);
  assert.equal(backup.filter(result=>result.status===200).length,1);
  const denied=backup.find(result=>result.status!==200);
  assert.ok(denied && [401,409].includes(denied.status),'a consumed backup code must be rejected');
});
