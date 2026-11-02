// Run only after building backend. No production or parent-branch write path.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomBytes, createHash } = require('node:crypto');
const { execFileSync, spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const { Pool } = require('pg');
const { parse } = require('dotenv');
const { target, verifyTarget, neonConfig } = require('./r2-neon-target.cjs');
const { migrate } = require('./r2-migrate.cjs');
const { digest } = require('./r2-transfer.cjs');
const { PostgresDatabase } = require('../dist/database/postgres.js');
const root = path.resolve(__dirname, '../..');
const credentials = path.join(root, '.env.neon-qualification');
const roles = { migration: 'talgov_r2_migration', runtime: 'talgov_r2_app' };
function protect(file) {
  const sid = execFileSync('powershell.exe', ['-NoProfile', '-Command', '[Security.Principal.WindowsIdentity]::GetCurrent().User.Value'], {encoding:'utf8'}).trim();
  execFileSync('icacls.exe', [file, '/inheritance:r', '/grant:r', `*${sid}:(F)`], {stdio:'pipe'});
}
function pgTool(tool, url, args, caFile) {
  const u = new URL(url);
  const result = spawnSync(tool, args, {encoding:'utf8', env:{...process.env,
    PGHOST:u.hostname, PGPORT:u.port || '5432', PGDATABASE:u.pathname.slice(1), PGUSER:decodeURIComponent(u.username),
    PGPASSWORD:decodeURIComponent(u.password), PGSSLMODE:'verify-full', PGSSLROOTCERT:caFile, PGCHANNELBINDING:'require', PGCONNECT_TIMEOUT:'10'}});
  if (result.status !== 0) throw new Error(`${tool} failed; provider output suppressed`);
}
async function main() {
  verifyTarget();
  console.log('PASS: exact project, organization, region, nondefault development branch and endpoint verified');
  const provisioningFile=path.join(root,'.env.neon-provisioning');
  const provisioning = parse(fs.readFileSync(fs.existsSync(provisioningFile)?provisioningFile:path.join(root,'.env.local')));
  const admin = new Pool(neonConfig(provisioning.DATABASE_URL_UNPOOLED));
  let migration, runtime, restored;
  try {
    if (!fs.existsSync(credentials)) {
      const catalog = await admin.query("SELECT schemaname,tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema')");
      assert.equal(catalog.rowCount, 0, 'Initial development database must be empty');
      assert.equal((await admin.query("SELECT 1 FROM pg_database WHERE datname IN ('r2_source','r2_upgrade','r2_restore')")).rowCount, 0);
      assert.equal((await admin.query('SELECT 1 FROM pg_roles WHERE rolname=ANY($1)', [[...Object.values(roles),'talgov_runtime']])).rowCount, 0);
      const urls = {};
      for (const [purpose, role] of Object.entries(roles)) {
        const u = new URL(provisioning.DATABASE_URL_UNPOOLED); u.username = role; u.password = randomBytes(32).toString('hex');
        if (purpose === 'runtime') u.hostname = target.host.replace('.c-2.', '-pooler.c-2.');
        urls[purpose] = u.toString();
      }
      // Save once before provisioning so an interrupted run never loses generated credentials.
      fs.writeFileSync(credentials, `R2_MIGRATION_DATABASE_URL=${urls.migration}\nDATABASE_URL=${urls.runtime}\nNEON_BRANCH=${target.name}\n`, {flag:'wx',mode:0o600});
      protect(credentials);
      const c = await admin.connect();
      try {
        await c.query('BEGIN');
        await c.query("SET LOCAL password_encryption='scram-sha-256'");
        await c.query('CREATE ROLE talgov_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS');
        for (const [purpose, role] of Object.entries(roles)) {
          const password = new URL(urls[purpose]).password; assert.match(password,/^[a-f0-9]{64}$/);
          await c.query(`CREATE ROLE ${role} LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '${password}'`);
        }
        await c.query('GRANT talgov_runtime TO talgov_r2_app');
        // Scope DDL ownership to this database; neither login owns the database or manages roles.
        await c.query('REVOKE CREATE,TEMPORARY ON DATABASE neondb FROM PUBLIC');
        await c.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC');
        await c.query('GRANT CONNECT,CREATE ON DATABASE neondb TO talgov_r2_migration');
        await c.query('GRANT USAGE,CREATE ON SCHEMA public TO talgov_r2_migration');
        await c.query('GRANT CONNECT ON DATABASE neondb TO talgov_r2_app');
        await c.query('COMMIT');
      } catch(e) {await c.query('ROLLBACK'); throw e;} finally {c.release();}
      console.log('PASS: empty development target; separate restricted SCRAM logins provisioned; credentials saved only in ACL-protected ignored file');
    }
    // PostgreSQL 16+ requires SET membership to assign another role as DB owner.
    // Bootstrap membership is temporary and never granted to the runtime login.
    await admin.query('GRANT talgov_r2_migration TO neondb_owner WITH INHERIT FALSE, SET TRUE');
    try {
      for (const db of ['r2_source','r2_upgrade','r2_restore']) {
        if (!(await admin.query('SELECT 1 FROM pg_database WHERE datname=$1',[db])).rowCount) {
          await admin.query(`CREATE DATABASE ${db} OWNER talgov_r2_migration`);
          await admin.query(`REVOKE ALL ON DATABASE ${db} FROM PUBLIC`);
        }
      }
    } finally { await admin.query('REVOKE talgov_r2_migration FROM neondb_owner'); }
    const env = parse(fs.readFileSync(credentials));
    migration = new Pool(neonConfig(env.R2_MIGRATION_DATABASE_URL));
    runtime = new Pool(neonConfig(env.DATABASE_URL,{pooled:true}));
    const roleRows = (await admin.query(`SELECT rolname,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls
      FROM pg_roles WHERE rolname=ANY($1) ORDER BY rolname`,[Object.values(roles)])).rows;
    assert.equal(roleRows.length,2);
    for (const row of roleRows) assert.ok(Object.entries(row).every(([k,v])=>k==='rolname'||v===false));
    const memberships=(await admin.query(`SELECT r.rolname AS member,g.rolname AS parent,m.admin_option FROM pg_auth_members m
      JOIN pg_roles r ON r.oid=m.member JOIN pg_roles g ON g.oid=m.roleid WHERE r.rolname=ANY($1) ORDER BY 1,2`,[Object.values(roles)])).rows;
    assert.deepEqual(memberships,[{member:roles.runtime,parent:'talgov_runtime',admin_option:false}]);
    for (const [name,pool] of [['migration-direct',migration],['runtime-pooled',runtime]]) {
      const c = await pool.connect();
      try {assert.equal(c.connection.stream.authorized,true); assert.equal(c.ssl.rejectUnauthorized,true);
        console.log(`PASS: ${name} verified TLS and mandatory SCRAM-SHA-256-PLUS; login ${(await c.query('SELECT current_user')).rows[0].current_user}`);
      } finally {c.release();}
    }
    console.log('Migration dry run:',JSON.stringify(await migrate(migration,undefined,true)));
    if (!(await migration.query("SELECT to_regclass('app.staff_accounts') AS t")).rows[0].t) console.log('PASS: dry run left no app schema');
    console.log('Migration apply:',JSON.stringify(await migrate(migration)));
    assert.deepEqual(await migrate(migration),{migrations:2,applied:0});
    const denied = e=>e.code==='42501';
    for (const sql of ['CREATE ROLE r2_forbidden','CREATE DATABASE r2_forbidden']) await assert.rejects(migration.query(sql),denied);
    for (const sql of ['CREATE SCHEMA r2_forbidden','CREATE TEMP TABLE r2_forbidden(id int)','SET ROLE talgov_r2_migration','SELECT * FROM public.r2_schema_migrations']) await assert.rejects(runtime.query(sql),denied);
    console.log('PASS: role flags, memberships, DDL/temporary objects, role escalation and ledger denials');
    const application=new PostgresDatabase(neonConfig(env.DATABASE_URL,{pooled:true}));
    try {
      const results=await Promise.all(Array.from({length:8},(_,i)=>application.transaction(async tx=>{
        const [before]=await tx.query("SELECT current_setting('talgov.qualification_marker',true) AS marker");
        assert.ok(!before.marker);
        await tx.query("SELECT set_config('talgov.qualification_marker',$1,true)",[String(i)]);
        const [after]=await tx.query("SELECT current_setting('talgov.qualification_marker') AS marker");
        return after.marker;
      })));
      assert.deepEqual(results,Array.from({length:8},(_,i)=>String(i)));
      assert.ok(application.pool.totalCount<=2);
    } finally {await application.close();}
    const bad=new URL(env.DATABASE_URL); bad.password=randomBytes(32).toString('hex');
    const rejected=new PostgresDatabase(neonConfig(bad.toString(),{pooled:true}));
    try {await assert.rejects(rejected.transaction(tx=>tx.query('SELECT 1')),e=>e.message==='Database operation unavailable'&&!e.cause);}
    finally {await rejected.close();}
    console.log('PASS: 8 concurrent pooled transactions, pool bound 2, no transaction-setting leakage; wrong password sanitized');
    // Ordinary local app variables must never keep the provisioning login.
    if(!fs.existsSync(provisioningFile)) {
      fs.writeFileSync(provisioningFile,`DATABASE_URL_UNPOOLED=${provisioning.DATABASE_URL_UNPOOLED}\n`,{flag:'wx',mode:0o600});
      protect(provisioningFile);
    }
    const runtimeDirect=new URL(env.DATABASE_URL); runtimeDirect.hostname=target.host;
    const localFile=path.join(root,'.env.local');
    let localText=fs.readFileSync(localFile,'utf8');
    for(const [key,value] of Object.entries({DATABASE_URL:env.DATABASE_URL,DATABASE_URL_UNPOOLED:runtimeDirect.toString()})) {
      const line=new RegExp('^'+key+'=.*$','m'); assert.ok(line.test(localText));
      localText=localText.replace(line,()=>key+'='+value);
    }
    fs.writeFileSync(localFile,localText);protect(localFile);
    console.log('PASS: .env.local uses runtime login only; provisioning and migration credentials isolated in ignored ACL-protected operator files');
    if (process.argv.includes('--prepare-only')) return;
    // Every repeat uses new databases on this same verified development branch.
    // Failed fixtures and recovery evidence are retained; nothing is reset or dropped.
    const resume=process.argv.find(arg=>arg.startsWith('--restore-run='))?.slice('--restore-run='.length);
    if(resume) assert.match(resume,/^r2_q_[a-f0-9]{8}$/);
    const prefix=resume || 'r2_q_'+randomBytes(4).toString('hex');
    const databases=Object.fromEntries(['test','source','upgrade','restore'].map(k=>[k,prefix+'_'+k]));
    if(!resume) {
      await admin.query('GRANT talgov_r2_migration TO neondb_owner WITH INHERIT FALSE, SET TRUE');
      try {
      for(const name of Object.values(databases)) {
        await admin.query(`CREATE DATABASE ${name} OWNER talgov_r2_migration`);
        await admin.query(`REVOKE ALL ON DATABASE ${name} FROM PUBLIC`);
        if(name===databases.test) await admin.query(`GRANT CONNECT ON DATABASE ${name} TO talgov_r2_app`);
      }
      } finally {await admin.query('REVOKE talgov_r2_migration FROM neondb_owner');}
    }
    console.log('Isolated hosted databases:',JSON.stringify(databases));
    for(const key of ['R2_MIGRATION_DATABASE_URL','DATABASE_URL']) {
      const u=new URL(env[key]);u.pathname='/'+databases.test;env[key]=u.toString();
    }
    await migration.end();migration=new Pool(neonConfig(env.R2_MIGRATION_DATABASE_URL,{databases:[databases.test]}));
    const scratch = fs.mkdtempSync(path.join(os.tmpdir(),'talgov-neon-')); protect(scratch);
    if(!resume) {
      const child = spawnSync(process.execPath,['--test','--test-timeout=120000',path.join(root,'backend/test/r2-database.integration.cjs')],{
      stdio:'inherit',env:{...process.env,R2_NEON_QUALIFICATION:'true',R2_TEST_DATABASE_URL:env.R2_MIGRATION_DATABASE_URL,
        R2_NEON_RUNTIME_URL:env.DATABASE_URL,R2_TEST_SCRATCH:scratch,
        R2_TEST_UPGRADE_DATABASE:databases.upgrade,R2_TEST_SOURCE_DATABASE:databases.source}});
      if (child.status!==0) throw new Error('Hosted integration suite failed');
    }
    const archive=path.join(scratch,'r2.dump');
    // Windows libpq's OpenSSL system store may lack the public roots Node trusts.
    // Supply Node's bundled trust anchors explicitly, never disable verification.
    const caFile=path.join(scratch,'trusted-roots.pem');
    fs.writeFileSync(caFile,require('node:tls').rootCertificates.join('\n'));
    pgTool('pg_dump.exe',env.R2_MIGRATION_DATABASE_URL,['-Fc','-f',archive],caFile);
    protect(archive);
    const restoredUrl=new URL(env.R2_MIGRATION_DATABASE_URL); restoredUrl.pathname='/'+databases.restore;
    restored=new Pool(neonConfig(restoredUrl.toString(),{databases:[databases.restore]}));
    if(!process.argv.includes('--verify-restored')) {
      assert.equal((await restored.query("SELECT 1 FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema')")).rowCount,0);
      pgTool('pg_restore.exe',restoredUrl.toString(),['--dbname='+databases.restore,'--exit-on-error','--single-transaction',archive],caFile);
    } else assert.ok(resume,'Verification requires an explicit previous run');
    const tables=(await migration.query("SELECT tablename FROM pg_tables WHERE schemaname='app' ORDER BY tablename")).rows;
    assert.equal(tables.length,9); let rows=0;
    for (const {tablename} of tables) {
      assert.match(tablename,/^[a-z_]+$/);
      const q=`SELECT to_jsonb(t)::text AS row FROM app.${tablename} t ORDER BY to_jsonb(t)::text`;
      const a=await migration.query(q),b=await restored.query(q); assert.equal(digest(a.rows),digest(b.rows)); rows+=a.rowCount;
    }
    for (const q of [
      "SELECT version,checksum FROM public.r2_schema_migrations ORDER BY version",
      "SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='app' ORDER BY indexname",
      "SELECT viewname,definition FROM pg_views WHERE schemaname='app' ORDER BY viewname",
      "SELECT conname,pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE connamespace='app'::regnamespace ORDER BY conname",
      // pg_dump can canonicalize explicit owner ACLs to NULL (the same defaults).
      // Compare effective entries, including grant options and column grants.
      `SELECT c.relname,c.reloptions,c.relowner::regrole::text AS owner,a.* FROM pg_class c
        CROSS JOIN LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a
        WHERE c.relnamespace='app'::regnamespace AND c.relkind IN ('r','v') ORDER BY c.relname,a.grantee,a.privilege_type`,
      `SELECT c.relname,att.attname,a.* FROM pg_class c JOIN pg_attribute att ON att.attrelid=c.oid
        CROSS JOIN LATERAL aclexplode(att.attacl) a WHERE c.relnamespace='app'::regnamespace ORDER BY c.relname,att.attname,a.grantee,a.privilege_type`,
      "SELECT tgname,pg_get_triggerdef(oid) AS definition FROM pg_trigger WHERE tgrelid IN (SELECT oid FROM pg_class WHERE relnamespace='app'::regnamespace) AND NOT tgisinternal ORDER BY tgname",
      "SELECT proname,prosecdef,proconfig,proacl::text,pg_get_functiondef(oid) AS definition FROM pg_proc WHERE pronamespace='app'::regnamespace ORDER BY proname"
    ]) assert.deepEqual((await migration.query(q)).rows,(await restored.query(q)).rows);
    assert.equal((await migrate(restored)).applied,0);
    console.log(`PASS: hosted direct logical backup/restore: ${tables.length} tables / ${rows} synthetic rows; exact digests, ledger, indexes, constraints, views/options, ACLs, triggers and functions`);
    console.log('Archive SHA256:',createHash('sha256').update(fs.readFileSync(archive)).digest('hex'));
    console.log('Protected recovery artifacts:',scratch);
  } finally {await Promise.all([admin.end(),migration?.end(),runtime?.end(),restored?.end()]);}
}
main().catch(e=>{ console.error('Neon qualification failed:',e instanceof assert.AssertionError ? e.message : 'sanitized failure; no provider details emitted', /^[A-Z0-9]{5}$/.test(e.code || '') ? e.code : ''); process.exitCode=1; });
