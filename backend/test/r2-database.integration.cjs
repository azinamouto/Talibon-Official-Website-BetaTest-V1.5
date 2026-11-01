const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const {Pool}=require('pg');
const {PostgresDatabase,connectionConfig}=require('../dist/database/postgres.js');
const {PgRepositories}=require('../dist/database/repositories.js');
const {migrate,isolatedConfig}=require('../scripts/r2-migrate.cjs');
const {digest,exportSnapshot,importBundle,reconcile,rollback}=require('../scripts/r2-transfer.cjs');
const url=process.env.R2_TEST_DATABASE_URL;
if (!url) throw new Error('Use test:r2:db to start an isolated database');
const owner=new Pool(isolatedConfig(url));
let db,repo;
const admin=randomUUID(), editor=randomUUID(), inactive=randomUUID(), source=randomUUID(), category=randomUUID();
const identity=subject=>({provider:'isolated-test',subject,sessionVerified:true,assurance:'mfa'});
const fixture=()=>({kind:'photo',categoryId:category,sourceId:source,title:'Synthetic test asset',description:'Isolated automated fixture',altText:'Test image',objectKey:'test/'+randomUUID(),mime:'image/png',bytes:42,sha256:'a'.repeat(64)});
const denied=code=>error=>error.code===code && error.message===`Database operation ${code}` && !error.cause;
before(async()=>{
  await migrate(owner);
  await owner.query('CREATE ROLE r2_test_runtime LOGIN INHERIT');
  await owner.query('GRANT talgov_runtime TO r2_test_runtime');
  const parsed=new URL(url); parsed.username='r2_test_runtime';
  db=new PostgresDatabase(connectionConfig(parsed.toString(),true)); repo=new PgRepositories(db);
  await owner.query(`INSERT INTO app.staff_accounts(id,provider,subject,role,active) VALUES
    ($1,'isolated-test','admin','admin',true),($2,'isolated-test','editor','editor',true),($3,'isolated-test','inactive','admin',false)`,[admin,editor,inactive]);
  await owner.query("INSERT INTO app.content_sources(id,reference,owner,sha256,approved,reviewed_at) VALUES($1,'synthetic-fixture','test-only',$2,true,now())",[source,'b'.repeat(64)]);
  await owner.query("INSERT INTO app.media_categories(id,kind,slug,title,approved) VALUES($1,'photo','test','Synthetic fixture',true)",[category]);
});
after(async()=>{await db?.close();await owner.end();});

test('migrations replay, upgrade, checksum drift and failed DDL roll back atomically',async()=>{
  assert.deepEqual(await migrate(owner),{migrations:2,applied:0});
  const directory=path.join(process.env.R2_TEST_SCRATCH,'migrations'); fs.mkdirSync(directory);
  const original=path.join(__dirname,'../database/migrations');
  fs.copyFileSync(path.join(original,'001_foundation.sql'),path.join(directory,'001_foundation.sql'));
  const next=new URL(url); next.pathname='/r2_upgrade'; const upgrade=new Pool(isolatedConfig(next.toString()));
  try {
    assert.equal((await migrate(upgrade,directory,true)).applied,1);
    assert.equal((await upgrade.query("SELECT to_regclass('app.staff_accounts') AS t")).rows[0].t,null);
    assert.equal((await migrate(upgrade,directory)).applied,1);
    assert.equal((await migrate(upgrade)).applied,1);
    fs.copyFileSync(path.join(original,'002_privileges.sql'),path.join(directory,'002_privileges.sql'));
    fs.writeFileSync(path.join(directory,'001_foundation.sql'),fs.readFileSync(path.join(original,'001_foundation.sql'),'utf8').replace(/\r\n/g,'\n').replace(/\n/g,'\r\n'));
    assert.equal((await migrate(upgrade,directory)).applied,0);
    fs.appendFileSync(path.join(directory,'001_foundation.sql'),'\n-- drift');
    fs.copyFileSync(path.join(original,'002_privileges.sql'),path.join(directory,'002_privileges.sql'));
    await assert.rejects(migrate(upgrade,directory),/checksum/);
    fs.copyFileSync(path.join(original,'001_foundation.sql'),path.join(directory,'001_foundation.sql'));
    fs.writeFileSync(path.join(directory,'003_failure.sql'),'CREATE TABLE app.should_rollback(id int); SELECT nonexistent_column;');
    await assert.rejects(migrate(upgrade,directory));
    assert.equal((await upgrade.query("SELECT to_regclass('app.should_rollback') AS t")).rows[0].t,null);
    assert.equal((await upgrade.query('SELECT count(*)::int AS n FROM public.r2_schema_migrations')).rows[0].n,2);
  } finally {await upgrade.end();}
});
test('TLS/configuration is fail closed and rehearsal commands reject remote or unmarked targets',()=>{
  assert.equal(connectionConfig('postgresql://user@db.example/r2',false).ssl.rejectUnauthorized,true);
  for(const candidate of ['postgresql://user@db.example/r2?sslmode=disable','postgresql://user@db.example/r2?options=x','not-a-url']) assert.throws(()=>connectionConfig(candidate));
  assert.throws(()=>connectionConfig('postgresql://user@db.example/r2',true));
  assert.throws(()=>isolatedConfig('postgresql://user@db.example/r2_test'));
  assert.throws(()=>isolatedConfig('postgresql://user@localhost/production'));
});
test('staff authorization rejects unknown/inactive identities, missing assurance and editor admin actions',async()=>{
  for(const actor of [undefined,identity('missing'),identity('inactive'),{...identity('admin'),assurance:'password'}, {...identity('admin'),sessionVerified:false}]) {
    await assert.rejects(repo.create(actor,fixture(),'test-denial'),denied('forbidden'));
  }
  await assert.rejects(repo.setAccess(identity('editor'),admin,1,'editor',false,'test-denial'),denied('forbidden'));
  await assert.rejects(repo.listAudit(identity('editor')),denied('forbidden'));
});
test('media CRUD, parameterization, optimistic conflict, publication and soft deletion are audited',async()=>{
  const row=await repo.create(identity('editor'),fixture(),'test-create');
  assert.equal(row.publication,'draft'); assert.equal(row.processing,'pending');
  assert.equal((await repo.listPublished()).length,0);
  await assert.rejects(repo.publish(identity('editor'),row.id,1,true,'test-publish'),denied('invalid'));
  await owner.query("UPDATE app.media_assets SET processing='ready' WHERE id=$1",[row.id]);
  await owner.query('UPDATE app.content_sources SET approved=false WHERE id=$1',[source]);
  await assert.rejects(repo.publish(identity('editor'),row.id,1,true,'test-unapproved'),denied('invalid'));
  await owner.query('UPDATE app.content_sources SET approved=true WHERE id=$1',[source]);
  await owner.query('UPDATE app.media_categories SET approved=false WHERE id=$1',[category]);
  await assert.rejects(repo.publish(identity('editor'),row.id,1,true,'test-category'),denied('invalid'));
  await owner.query('UPDATE app.media_categories SET approved=true WHERE id=$1',[category]);
  const title="x'; DROP TABLE app.staff_accounts; --";
  const edited=await repo.update(identity('editor'),row.id,1,title,'Test alt','test-edit'); assert.equal(edited.title,title);
  await assert.rejects(repo.update(identity('editor'),row.id,1,'stale','alt','test-stale'),denied('conflict'));
  const published=await repo.publish(identity('editor'),row.id,2,true,'test-publish'); assert.equal(published.version,3);
  const [visible]=await repo.listPublished(); assert.equal(visible.id,row.id); assert.equal(visible.object_key,undefined);
  await owner.query('UPDATE app.content_sources SET approved=false WHERE id=$1',[source]);
  assert.equal((await repo.listPublished()).length,0);
  await owner.query('UPDATE app.content_sources SET approved=true WHERE id=$1',[source]);
  await owner.query('UPDATE app.media_categories SET approved=false WHERE id=$1',[category]);
  assert.equal((await repo.listPublished()).length,0);
  await owner.query('UPDATE app.media_categories SET approved=true WHERE id=$1',[category]);
  await assert.rejects(repo.remove(identity('editor'),row.id,3,'test-delete'),denied('forbidden'));
  await repo.remove(identity('admin'),row.id,3,'test-delete');
  assert.equal((await repo.listPublished()).length,0);
  const audit=await repo.listAudit(identity('admin')); assert.equal(audit.filter(e=>e.resource_id===row.id).length,4);
});
test('constraints reject invalid metadata, duplicate keys, missing FKs and unsupported roles',async()=>{
  for(const patch of [{bytes:0},{sha256:'bad'},{mime:'text/html'},{title:' '},{categoryId:randomUUID()},{kind:'document'}]) {
    await assert.rejects(repo.create(identity('editor'),{...fixture(),...patch},'test-invalid'),denied('invalid'));
  }
  const data=fixture(); await repo.create(identity('editor'),data,'test-unique');
  await assert.rejects(repo.create(identity('editor'),data,'test-unique'),denied('conflict'));
  await assert.rejects(repo.setAccess(identity('admin'),editor,1,'super_admin',true,'test-role'),denied('invalid'));
});
test('public content filters drafts, deleted, future and revoked provenance; runtime cannot edit content',async()=>{
  const id=randomUUID();
  await owner.query(`INSERT INTO app.public_content(id,kind,legacy_id,slug,title,body,source_id) VALUES($1,'pages','test','test','Synthetic test','{}',$2)`,[id,source]);
  assert.equal((await repo.list('pages')).length,0);
  await owner.query("UPDATE app.public_content SET publication='published',published_at=now()+interval '1 day' WHERE id=$1",[id]);
  assert.equal((await repo.list('pages')).length,0);
  await owner.query("UPDATE app.public_content SET published_at=now()-interval '1 day' WHERE id=$1",[id]);
  assert.equal((await repo.list('pages')).length,1);
  assert.equal((await repo.list("pages' OR true --")).length,0);
  await owner.query('UPDATE app.content_sources SET approved=false WHERE id=$1',[source]);
  assert.equal((await repo.list('pages')).length,0);
  await owner.query('UPDATE app.content_sources SET approved=true WHERE id=$1',[source]);
  await owner.query("UPDATE app.public_content SET publication='archived',deleted_at=now() WHERE id=$1",[id]);
  assert.equal((await repo.list('pages')).length,0);
  await assert.rejects(repo.list('pages',101),denied('invalid'));
  await assert.rejects(db.transaction(tx=>tx.query("UPDATE app.public_content SET title='unauthorized'")),denied('unavailable'));
});
test('runtime least privilege prevents DDL, approval, readiness, audit tampering and schema history changes',async()=>{
  for(const sql of ["CREATE TABLE app.no_access(id int)","UPDATE app.content_sources SET approved=true", "UPDATE app.media_categories SET approved=true",
    "UPDATE app.media_assets SET processing='ready'",'DELETE FROM app.media_assets','DELETE FROM app.audit_events',
    "UPDATE app.audit_events SET action='media.create'",'TRUNCATE app.audit_events','DELETE FROM public.r2_schema_migrations',
    'SELECT * FROM app.public_content','SELECT * FROM app.import_batches']) {
    await assert.rejects(db.transaction(tx=>tx.query(sql)),denied('unavailable'));
  }
});
test('revision immutability and content/media foreign keys preserve referenced history',async()=>{
  const asset=await repo.create(identity('editor'),fixture(),'test-history');
  const revision=randomUUID();
  await owner.query(`INSERT INTO app.media_revisions(id,asset_id,object_key,sha256,bytes,mime,actor_id)
    VALUES($1,$2,$3,$4,42,'image/png',$5)`,[revision,asset.id,'revision/'+revision,'a'.repeat(64),editor]);
  await assert.rejects(owner.query('DELETE FROM app.media_revisions WHERE id=$1',[revision]),e=>e.code==='42501');
  await assert.rejects(owner.query('DELETE FROM app.media_assets WHERE id=$1',[asset.id]),e=>['23001','23503'].includes(e.code));
  await assert.rejects(owner.query('INSERT INTO app.content_asset_links(content_id,asset_id) VALUES($1,$2)',[randomUUID(),asset.id]),e=>e.code==='23503');
});
test('audit failure rolls back mutation; failed transactions release a usable connection',async()=>{
  const input=fixture();
  await assert.rejects(repo.create(identity('editor'),input,'invalid request id with PII spaces'),denied('invalid'));
  assert.equal((await owner.query('SELECT count(*)::int AS n FROM app.media_assets WHERE object_key=$1',[input.objectKey])).rows[0].n,0);
  await assert.rejects(db.transaction(async tx=>{await tx.query("UPDATE app.staff_accounts SET active=false WHERE id=$1",[editor]);throw new Error('secret test provider detail');}),denied('unavailable'));
  assert.equal((await owner.query('SELECT active FROM app.staff_accounts WHERE id=$1',[editor])).rows[0].active,true);
  assert.equal((await db.transaction(tx=>tx.query('SELECT 42 AS n')))[0].n,42);
});
test('statement, lock, idle transaction and pool acquisition timeouts fail safely and recover',async()=>{
  await assert.rejects(db.transaction(async tx=>{await tx.query("SET LOCAL statement_timeout='40ms'");await tx.query('SELECT pg_sleep(1)');}),denied('unavailable'));
  const lock=await owner.connect(); await lock.query('BEGIN'); await lock.query('SELECT * FROM app.staff_accounts WHERE id=$1 FOR UPDATE',[editor]);
  try {await assert.rejects(db.transaction(async tx=>{await tx.query("SET LOCAL lock_timeout='40ms'");await tx.query('UPDATE app.staff_accounts SET version=version+1 WHERE id=$1',[editor]);}),denied('unavailable'));}
  finally {await lock.query('ROLLBACK');lock.release();}
  const config=isolatedConfig(url); config.max=1; config.connectionTimeoutMillis=1000;
  const tiny=new PostgresDatabase(config);
  let ready; const acquired=new Promise(r=>ready=r); let release;const held=new Promise(r=>release=r);
  const first=tiny.transaction(async tx=>{await tx.query('SELECT 1');ready();await held;});
  await acquired;
  try {await assert.rejects(tiny.transaction(tx=>tx.query('SELECT 1')),denied('unavailable'));}
  finally {release();await first;await tiny.close();}
  await assert.rejects(db.transaction(async tx=>{
    await tx.query("SET LOCAL idle_in_transaction_session_timeout='40ms'");
    await new Promise(r=>setTimeout(r,120));
    await tx.query('SELECT 1');
  }),denied('unavailable'));
  await assert.rejects(db.transaction(async tx=>{
    await tx.query('SET LOCAL transaction_timeout=0');
    await tx.query("SET LOCAL transaction_timeout='40ms'");
    await tx.query('SELECT pg_sleep(1)');
  }),denied('unavailable'));
  assert.equal((await db.transaction(tx=>tx.query("SHOW idle_in_transaction_session_timeout")))[0].idle_in_transaction_session_timeout,'5s');
  assert.equal((await db.transaction(tx=>tx.query("SHOW transaction_timeout")))[0].transaction_timeout,'10s');
  assert.equal((await db.transaction(tx=>tx.query('SELECT 1 AS n')))[0].n,1);
});
test('last-admin protection and concurrent demotion cannot remove all active admins',async()=>{
  await assert.rejects(repo.setAccess(identity('admin'),admin,1,'editor',false,'test-last'),denied('forbidden'));
  const second=randomUUID();await owner.query("INSERT INTO app.staff_accounts(id,provider,subject,role,active) VALUES($1,'isolated-test','second','admin',true)",[second]);
  const results=await Promise.allSettled([
    repo.setAccess(identity('admin'),second,1,'editor',false,'test-concurrent-a'),
    repo.setAccess(identity('second'),admin,1,'editor',false,'test-concurrent-b')]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal((await owner.query("SELECT count(*)::int AS n FROM app.staff_accounts WHERE role='admin' AND active")).rows[0].n,1);
});
test('snapshot export partitions rows, detects drift, imports idempotently and reconciles exact data; rollback preserves audit',async()=>{
  const sourceUrl=new URL(url);sourceUrl.pathname='/r2_source';const legacy=new Pool(isolatedConfig(sourceUrl.toString()));
  try {
    await legacy.query('CREATE TABLE public.pages(id text PRIMARY KEY,title text); CREATE TABLE public.certificate_requests(id int)');
    await legacy.query("INSERT INTO public.pages VALUES('one','Synthetic source'),('two','Quarantine fixture'); INSERT INTO public.certificate_requests VALUES(1)");
    const sid=randomUUID(),cid=randomUUID(),batch=randomUUID();
    const plan={version:1,approvalReference:'synthetic-test-only',rows:[
      {table:'pages',id:'one',sourceDigest:digest({id:'one',title:'Synthetic source'}),disposition:'approved',reason:'Synthetic test',targets:[
        {table:'content_sources',row:{id:sid,reference:'test',owner:'test',sha256:'c'.repeat(64),approved:true,reviewed_at:'2026-01-01T00:00:00Z'}},
        {table:'public_content',row:{id:cid,kind:'pages',legacy_id:'one',slug:'import-test',title:'Synthetic source',body:{text:'null vs zero',nullable:null,zero:0},source_id:sid,publication:'published',published_at:'2026-01-01T00:00:00Z'}}]},
      {table:'pages',id:'two',sourceDigest:digest({id:'two',title:'Quarantine fixture'}),disposition:'quarantined',reason:'No approval'}]};
    const bundle=await exportSnapshot(legacy,plan);
    assert.equal(bundle.payload.inventory.find(t=>t.table==='certificate_requests').disposition,'excluded');
    assert.equal(bundle.payload.inventory.find(t=>t.table==='pages').quarantined,1);
    assert.deepEqual(await exportSnapshot(legacy,plan),bundle);
    await assert.rejects(exportSnapshot(legacy,{...plan,rows:plan.rows.slice(0,1)}));
    await legacy.query("UPDATE public.pages SET title='Drift' WHERE id='one'");
    await assert.rejects(exportSnapshot(legacy,plan));
    assert.equal((await importBundle(owner,bundle,batch,true)).matched,2);
    assert.equal((await owner.query('SELECT count(*)::int AS n FROM app.import_batches WHERE id=$1',[batch])).rows[0].n,0);
    assert.equal((await importBundle(owner,bundle,batch)).matched,2);
    assert.equal((await importBundle(owner,bundle,batch)).replayed,true);
    assert.equal((await reconcile(owner,batch)).matched,2);
    await owner.query("UPDATE app.public_content SET title='Changed since import' WHERE id=$1",[cid]);
    await assert.rejects(reconcile(owner,batch));await assert.rejects(rollback(owner,batch));
    await owner.query("UPDATE app.public_content SET title='Synthetic source' WHERE id=$1",[cid]);
    assert.equal((await rollback(owner,batch)).replayed,false);
    assert.equal((await rollback(owner,batch)).replayed,true);
    assert.equal((await owner.query('SELECT count(*)::int AS n FROM app.public_content WHERE id=$1',[cid])).rows[0].n,0);
    await assert.rejects(importBundle(owner,bundle,batch));
    assert.equal((await owner.query('SELECT count(*)::int AS n FROM app.audit_events WHERE resource_id=$1',[batch])).rows[0].n,2);
    const bad=structuredClone(bundle); bad.payload.targets.find(t=>t.table==='public_content').row.source_id=randomUUID();bad.digest=digest(bad.payload);
    await assert.rejects(importBundle(owner,bad,randomUUID()));
    assert.equal((await owner.query('SELECT count(*)::int AS n FROM app.content_sources WHERE id=$1',[sid])).rows[0].n,0);
    const tampered=structuredClone(bundle);tampered.payload.targets[0].row.title='tamper';
    await assert.rejects(importBundle(owner,tampered,randomUUID()));
  } finally {await legacy.end();}
});
