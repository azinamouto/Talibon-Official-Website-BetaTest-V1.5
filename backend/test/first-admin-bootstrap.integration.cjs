// Mandatory disposable fixture: no external URL, staging credential or hosted opt-in is accepted.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Pool } = require('pg');
const { randomBytes, createHmac } = require('node:crypto');
const express = require('express');
const { connectionConfig } = require('../dist/database/postgres');
const { BetterAuthAdapter } = require('../dist/authentication/better-auth.adapter');
const { StaffGuard } = require('../dist/authentication/staff.guard');
const { fixtureConfig, verifyFixture } = require('./local-staging-fixture.cjs');
const { migrations } = require('../scripts/staging/runner.cjs');
const { bootstrapFirstAdmin, FIRST_ADMIN_AUTHORIZATION, FIRST_ADMIN_MARKER } = require('../dist/authentication/first-admin-bootstrap');
const input = () => ({ authorization:FIRST_ADMIN_AUTHORIZATION,emailOwnershipConfirmed:true,
  email:'synthetic-admin@example.invalid',displayName:'Synthetic administrator',password:randomBytes(24).toString('base64url') });
function totp(secret) {
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits='';
  for(const c of secret.replace(/=+$/,'')) bits+=alphabet.indexOf(c.toUpperCase()).toString(2).padStart(5,'0');
  const bytes=[];for(let i=0;i+8<=bits.length;i+=8) bytes.push(parseInt(bits.slice(i,i+8),2));
  const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));
  const digest=createHmac('sha1',Buffer.from(bytes)).update(counter).digest(),offset=digest[19]&15;
  return ((digest.readUInt32BE(offset)&0x7fffffff)%1000000).toString().padStart(6,'0');
}
test('first website admin bootstrap on disposable PostgreSQL',async t=>{
  const fixture=fixtureConfig(process.env.R2_STAGING_TEST_FIXTURE);
  const root=new Pool(connectionConfig(fixture.url.toString(),true)),pools=[];
  try {
    await verifyFixture(root,fixture);
    for(const name of ['NEON_API_KEY','R2_BOOTSTRAP_DATABASE_URL','STAFF_AUTH_DATABASE_URL','PGHOST','PGOPTIONS','NODE_OPTIONS']) assert.equal(Object.hasOwn(process.env,name),false);
    async function fresh(label) {
      assert.match(label,/^[a-z]+$/);
      const database='r2_bootstrap_'+label;
      await root.query(`CREATE DATABASE ${database}`);
      const url=new URL(fixture.url);url.pathname='/'+database;
      const pool=new Pool(connectionConfig(url.toString(),true));pools.push(pool);
      for(const migration of migrations()) await pool.query(migration.sql);
      return {pool,url,identity:{database,role:'postgres'}};
    }
    async function counts(pool) {
      return (await pool.query(`SELECT
        (SELECT count(*)::int FROM public.r2_auth_user) AS users,
        (SELECT count(*)::int FROM public.r2_auth_account) AS credentials,
        (SELECT count(*)::int FROM app.staff_accounts) AS staff,
        (SELECT count(*)::int FROM app.staff_auth_audit) AS auth_audit,
        (SELECT count(*)::int FROM app.audit_events) AS audit,
        (SELECT count(*)::int FROM public.r2_auth_session) AS sessions,
        (SELECT count(*)::int FROM public.r2_auth_two_factor) AS factors,
        (SELECT count(*)::int FROM app.staff_session_assurance) AS assurance`)).rows[0];
    }
    await t.test('real provider hash and atomic admin identity; normal login requires MFA before CMS access',async()=>{
      const f=await fresh('login'),account=input(),password=account.password;
      assert.deepEqual(await bootstrapFirstAdmin(f.pool,account,f.identity),{success:true,role:'admin',mfaEnrollmentRequired:true});
      assert.deepEqual(await counts(f.pool),{users:1,credentials:1,staff:1,auth_audit:2,audit:1,sessions:0,factors:0,assurance:0});
      const {rows:[identity]}=await f.pool.query(`SELECT u.id,u."emailVerified",u."twoFactorEnabled",a."userId",a."accountId",a."providerId",a.password,s.role,s.active
        FROM public.r2_auth_user u JOIN public.r2_auth_account a ON a."userId"=u.id JOIN app.staff_accounts s ON s.subject=u.id`);
      assert.equal(identity.id,identity.userId);assert.equal(identity.id,identity.accountId);assert.equal(identity.role,'admin');assert.equal(identity.active,true);
      assert.equal(identity.emailVerified,true);assert.equal(identity.twoFactorEnabled,false);assert.equal(identity.providerId,'credential');assert.notEqual(identity.password,password);
      const {verifyPassword}=await import('better-auth/crypto');
      assert.equal(await verifyPassword({hash:identity.password,password}),true);
      await f.pool.query('CREATE ROLE r2_bootstrap_runtime LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS; GRANT talgov_runtime TO r2_bootstrap_runtime');
      const runtimeUrl=new URL(f.url);runtimeUrl.username='r2_bootstrap_runtime';
      const app=express();app.use(express.json({limit:'16kb'}));
      const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
      const base=`http://127.0.0.1:${server.address().port}`;
      const adapter=new BetterAuthAdapter({databaseUrl:runtimeUrl.toString(),origin:base,secret:randomBytes(48).toString('base64url'),localTest:true});
      app.use((req,res,next)=>void adapter.handle(req,res,next));
      const jar=new Map();
      const headers=()=>new Headers({cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; ')});
      const request=async(route,body,origin=base)=>{
        const response=await fetch(base+route,{method:body===undefined?'GET':'POST',headers:{...Object.fromEntries(headers()),origin,'content-type':'application/json'},
          ...(body===undefined?{}:{body:JSON.stringify(body)})});
        for(const cookie of response.headers.getSetCookie()){const pair=cookie.split(';')[0],i=pair.indexOf('=');jar.set(pair.slice(0,i),pair.slice(i+1));}
        return {status:response.status,body:await response.json(),cookies:response.headers.getSetCookie()};
      };
      const authRuntime=require('../dist/authentication/runtime'),saved=authRuntime.staffAuthentication;
      authRuntime.staffAuthentication=()=>adapter;
      const guard=new StaffGuard({getAllAndOverride:key=>key==='roles'?['admin','editor']:undefined});
      const req={headers:{}};
      const context={getHandler:()=>null,getClass:()=>null,switchToHttp:()=>({getRequest:()=>{req.headers.cookie=headers().get('cookie');return req;}})};
      try {
        assert.equal((await request('/api/staff-auth/sign-up/email',{email:account.email,password})).status,403);
        assert.equal((await request('/api/staff-auth/bootstrap',{email:account.email,password})).status,403);
        assert.equal((await request('/api/staff-auth/sign-in/email',{email:account.email,password},'https://untrusted.example.invalid')).status,403);
        const login=await request('/api/staff-auth/sign-in/email',{email:account.email,password});assert.equal(login.status,200);assert.equal(login.body.mfaRequired,false);
        assert.match(login.cookies.join('; '),/HttpOnly/);assert.match(login.cookies.join('; '),/SameSite=Strict/i);
        assert.equal((await request('/api/staff/me')).status,401);
        await assert.rejects(guard.canActivate(context));
        const enrollment=await request('/api/staff-auth/two-factor/enable',{password});assert.equal(enrollment.status,200);
        assert.ok(Array.isArray(enrollment.body.backupCodes)&&enrollment.body.backupCodes.length>0);
        assert.equal((await request('/api/staff/me')).status,401);
        const code=totp(new URL(enrollment.body.totpURI).searchParams.get('secret'));
        assert.equal((await request('/api/staff-auth/two-factor/verify-totp',{code})).status,200);
        const me=await request('/api/staff/me');assert.equal(me.status,200);assert.equal(me.body.role,'admin');
        assert.equal(await guard.canActivate(context),true);assert.equal(req.staff.role,'admin');
        assert.equal((await request('/api/staff-auth/sign-out',{})).status,200);
        assert.equal((await request('/api/staff/me')).status,401);
      } finally {
        authRuntime.staffAuthentication=saved;
        await new Promise(resolve=>server.close(resolve));await adapter.close();
      }
    });
    await t.test('mapping and audit failures roll back real provider user and credential rows',async()=>{
      for(const [label,fail] of [['mapping','INSERT INTO app.staff_accounts'],['audit','INSERT INTO app.staff_auth_audit']]) {
        const f=await fresh(label),original=new Error('synthetic injected write failure');
        const failing={connect:async()=>{
          const client=await f.pool.connect(),query=client.query.bind(client);
          client.query=(sql,values)=>sql.includes(fail)?Promise.reject(original):query(sql,values);
          const release=client.release.bind(client);client.release=discard=>{client.query=query;release(discard);};return client;
        }};
        await assert.rejects(bootstrapFirstAdmin(failing,input(),f.identity),e=>e===original);
        assert.deepEqual(await counts(f.pool),{users:0,credentials:0,staff:0,auth_audit:0,audit:0,sessions:0,factors:0,assurance:0});
      }
    });
    await t.test('concurrent first-admin attempts create exactly one account',async()=>{
      const f=await fresh('race');
      const results=await Promise.allSettled([bootstrapFirstAdmin(f.pool,input(),f.identity),bootstrapFirstAdmin(f.pool,input(),f.identity)]);
      assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.filter(r=>r.status==='rejected').length,1);
      assert.deepEqual(await counts(f.pool),{users:1,credentials:1,staff:1,auth_audit:2,audit:1,sessions:0,factors:0,assurance:0});
    });
    await t.test('any existing admin rejects even when inactive and mapped to another provider',async()=>{
      const f=await fresh('existing');
      await f.pool.query("INSERT INTO app.staff_accounts(provider,subject,role,active) VALUES('synthetic-provider','synthetic-subject','admin',false)");
      await assert.rejects(bootstrapFirstAdmin(f.pool,input(),f.identity),e=>e.code==='already_initialized');
      assert.equal((await counts(f.pool)).users,0);
    });
    await t.test('immutable marker prevents bootstrap reuse after admin demotion',async()=>{
      const f=await fresh('consumed');await bootstrapFirstAdmin(f.pool,input(),f.identity);
      await f.pool.query("UPDATE app.staff_accounts SET role='editor',active=false");
      await assert.rejects(bootstrapFirstAdmin(f.pool,{...input(),email:'other-synthetic@example.invalid'},f.identity),e=>e.code==='already_initialized');
      const result=await f.pool.query('SELECT count(*)::int AS n FROM app.staff_auth_audit WHERE action=$1',[FIRST_ADMIN_MARKER]);assert.equal(result.rows[0].n,1);
      await assert.rejects(f.pool.query('DELETE FROM app.staff_auth_audit WHERE action=$1',[FIRST_ADMIN_MARKER]),e=>e.code==='42501');
      assert.equal((await counts(f.pool)).users,1);
    });
  } finally { await Promise.all(pools.map(p=>p.end()));await root.end(); }
});
