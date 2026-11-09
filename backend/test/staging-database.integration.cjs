const { test }=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const { spawnSync }=require('node:child_process');
const { Pool }=require('pg');
const { connectionConfig }=require('../dist/database/postgres.js');
const { run,migrations,approval,LOCK }=require('../scripts/staging/runner.cjs');
const { catalog }=require('../scripts/staging/catalog.cjs');
const { target,validateTarget,validateMetadata }=require('../scripts/staging/target.cjs');
const { fixtureConfig,verifyFixture }=require('./local-staging-fixture.cjs');
test('staging migration safety on disposable PostgreSQL',async t=>{
  const fixture=fixtureConfig(process.env.R2_STAGING_TEST_FIXTURE);
  const url=fixture.url;
  const admin=new Pool(connectionConfig(url.toString(),true));
  const pools=[];
  try {
    await verifyFixture(admin,fixture);
    await t.test('disposable identity mismatches rejected before test DDL',async()=>{
      for (const patch of [{cluster:'not-this-cluster'},{port:fixture.port+1},{data:path.dirname(fixture.data)}]) {
        await assert.rejects(verifyFixture(admin,{...fixture,...patch}));
      }
      assert.equal((await admin.query("SELECT 1 FROM pg_roles WHERE rolname IN ('neondb_owner','staging_owner','talgov_runtime')")).rowCount,0);
    });
    await t.test('inherited database and Node configuration excluded',()=>{
      for (const key of ['PGHOST','PGPORT','PGDATABASE','PGUSER','PGPASSWORD','PGOPTIONS','PGSERVICE',
        'R2_STAGING_TEST_URL','R2_STAGING_DATABASE_URL','NEON_API_KEY','NODE_OPTIONS']) {
        assert.equal(Object.hasOwn(process.env,key),false,key);
      }
    });
    await admin.query('CREATE ROLE neondb_owner NOLOGIN; CREATE ROLE staging_owner LOGIN; CREATE ROLE talgov_runtime NOLOGIN');
    async function database(name) {
      assert.match(name,/^r2_staging_[a-z]+$/);
      await admin.query(`CREATE DATABASE ${name} OWNER neondb_owner`);
      await admin.query(`REVOKE CREATE,TEMP ON DATABASE ${name} FROM PUBLIC; GRANT CONNECT,CREATE ON DATABASE ${name} TO staging_owner`);
      const u=new URL(url);u.pathname='/'+name;u.username='staging_owner';
      const setupUrl=new URL(url);setupUrl.pathname='/'+name;
      const setup=new Pool(connectionConfig(setupUrl.toString(),true));
      try {await setup.query(`GRANT USAGE,CREATE ON SCHEMA public TO staging_owner;
        ALTER DEFAULT PRIVILEGES FOR ROLE staging_owner REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC`);}
      finally {await setup.end();}
      const pool=new Pool(connectionConfig(u.toString(),true));pools.push(pool);
      return {pool,target:{project:'local',branch:'disposable',database:name,databaseOwner:'neondb_owner',migrationLogin:'staging_owner'}};
    }
    const ref=await database('r2_staging_reference');
    const c=await ref.pool.connect();
    try {
      await c.query('BEGIN; SET LOCAL search_path=public');
      for(const m of migrations()) await c.query(m.sql);
      const baseline=await catalog(c);
      assert.deepEqual(baseline,require('../scripts/staging/catalog.json'));
      await c.query('ROLLBACK');
    } finally {c.release();}
    const a=await database('r2_staging_success');
    const apply=(x,extra={})=>run(x.pool,x.target,{mode:'apply',authorization:approval(x.target),...extra});
    await t.test('preflight is default and leaves no objects',async()=>{
      assert.equal((await run(a.pool,a.target)).pending,6);
      assert.equal((await a.pool.query("SELECT to_regnamespace('app') AS n")).rows[0].n,null);
    });
    await t.test('missing authorization and wrong database/owner rejected',async()=>{
      await assert.rejects(run(a.pool,a.target,{mode:'apply'}));
      await assert.rejects(run(a.pool,{...a.target,database:'neondb'}));
      await assert.rejects(run(a.pool,{...a.target,migrationLogin:'postgres'}));
    });
    await t.test('ordered atomic application and idempotent repeat',async()=>{
      assert.equal((await apply(a)).applied,6);
      assert.deepEqual((await a.pool.query('SELECT file FROM r2_staging.history ORDER BY position')).rows.map(r=>r.file),migrations().map(m=>m.file));
      assert.equal((await apply(a)).applied,0);
      assert.equal((await run(a.pool,a.target)).pending,0);
    });
    await t.test('five-migration upgrade preserves history and rejects baseline drift',async()=>{
      const old=await database('r2_staging_upgrade');
      await old.pool.query('CREATE SCHEMA r2_staging; REVOKE ALL ON SCHEMA r2_staging FROM PUBLIC');
      await old.pool.query('CREATE TABLE r2_staging.history(position integer PRIMARY KEY,file text UNIQUE NOT NULL,sha256 text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now()); REVOKE ALL ON r2_staging.history FROM PUBLIC,talgov_runtime');
      for(const [i,m] of migrations().slice(0,5).entries()) {
        await old.pool.query(m.sql);
        await old.pool.query('INSERT INTO r2_staging.history(position,file,sha256) VALUES($1,$2,$3)',[i+1,m.file,m.sha256]);
      }
      const history=(await old.pool.query('SELECT * FROM r2_staging.history ORDER BY position')).rows;
      assert.equal((await run(old.pool,old.target)).pending,1);
      await old.pool.query('GRANT DELETE ON app.audit_events TO talgov_runtime');
      await assert.rejects(apply(old));
      await old.pool.query('REVOKE DELETE ON app.audit_events FROM talgov_runtime');
      assert.equal((await apply(old)).applied,1);
      assert.deepEqual((await old.pool.query('SELECT * FROM r2_staging.history WHERE position<=5 ORDER BY position')).rows,history);
      assert.equal((await apply(old)).applied,0);
    });
    await t.test('separate managed database and public owners preserved',async()=>{
      const r=(await a.pool.query(`SELECT pg_get_userbyid(datdba) AS owner,
        (SELECT pg_get_userbyid(nspowner) FROM pg_namespace WHERE nspname='public') AS schema_owner
        FROM pg_database WHERE datname=current_database()`)).rows[0];
      assert.deepEqual(r,{owner:'neondb_owner',schema_owner:'pg_database_owner'});
      await assert.rejects(run(a.pool,{...a.target,databaseOwner:'staging_owner'}));
    });
    const guard=await database('r2_staging_guards');
    const guardUrl=new URL(url);guardUrl.pathname='/'+guard.target.database;
    const guardAdmin=new Pool(connectionConfig(guardUrl.toString(),true));pools.push(guardAdmin);
    await guardAdmin.query('CREATE ROLE neon_superuser NOLOGIN; CREATE ROLE neon_superuser_extra NOLOGIN; CREATE ROLE neon_bridge NOLOGIN');
    await t.test('exact Neon-managed non-grantable CREATE/TEMP accepted without writes',async()=>{
      await guardAdmin.query('GRANT CREATE,TEMP ON DATABASE r2_staging_guards TO neon_superuser');
      assert.equal((await run(guard.pool,guard.target)).pending,6);
      assert.equal((await guard.pool.query("SELECT to_regnamespace('app') AS n,to_regnamespace('r2_staging') AS h")).rows[0].n,null);
      assert.equal((await guard.pool.query("SELECT to_regnamespace('r2_staging') AS h")).rows[0].h,null);
    });
    const badCases=[
      ['managed role LOGIN',`ALTER ROLE neon_superuser LOGIN`,`ALTER ROLE neon_superuser NOLOGIN`],
      ...['CREATE','TEMP'].map(privilege=>[
        'managed '+privilege+' grant option',`GRANT ${privilege} ON DATABASE r2_staging_guards TO neon_superuser WITH GRANT OPTION`,
        `REVOKE GRANT OPTION FOR ${privilege} ON DATABASE r2_staging_guards FROM neon_superuser`]),
      ...['CREATE','TEMP'].map(privilege=>[
        'lookalike '+privilege,`GRANT ${privilege} ON DATABASE r2_staging_guards TO neon_superuser_extra`,
        `REVOKE ${privilege} ON DATABASE r2_staging_guards FROM neon_superuser_extra`]),
      ...['staging_owner','talgov_runtime'].flatMap(role=>[
        [role+' managed membership',`GRANT neon_superuser TO ${role}`,`REVOKE neon_superuser FROM ${role}`],
        [role+' managed NOINHERIT membership',`GRANT neon_superuser TO ${role} WITH INHERIT FALSE`, `REVOKE neon_superuser FROM ${role}`],
        [role+' indirect managed membership',`GRANT neon_superuser TO neon_bridge; GRANT neon_bridge TO ${role}`,
          `REVOKE neon_bridge FROM ${role}; REVOKE neon_superuser FROM neon_bridge`]
      ]),
      ...['SUPERUSER','CREATEDB','CREATEROLE','REPLICATION','BYPASSRLS','LOGIN'].map(flag=>[
        'runtime '+flag,`ALTER ROLE talgov_runtime ${flag}`,`ALTER ROLE talgov_runtime NO${flag}`]),
      ['database ownership',`ALTER DATABASE r2_staging_guards OWNER TO staging_owner`,`ALTER DATABASE r2_staging_guards OWNER TO neondb_owner; GRANT CONNECT,CREATE ON DATABASE r2_staging_guards TO staging_owner`],
      ['public ownership',`ALTER SCHEMA public OWNER TO staging_owner`,`ALTER SCHEMA public OWNER TO pg_database_owner; GRANT USAGE,CREATE ON SCHEMA public TO staging_owner`],
      ['migrator membership',`GRANT neondb_owner TO staging_owner`,`REVOKE neondb_owner FROM staging_owner`],
      ['runtime membership',`GRANT staging_owner TO talgov_runtime`,`REVOKE staging_owner FROM talgov_runtime`],
      ...['SUPERUSER','CREATEDB','CREATEROLE','REPLICATION','BYPASSRLS'].map(flag=>[
        'migrator '+flag,`ALTER ROLE staging_owner ${flag}`,`ALTER ROLE staging_owner NO${flag}`]),
      ['PUBLIC database CREATE',`GRANT CREATE ON DATABASE r2_staging_guards TO PUBLIC`,`REVOKE CREATE ON DATABASE r2_staging_guards FROM PUBLIC`],
      ['PUBLIC database TEMP',`GRANT TEMP ON DATABASE r2_staging_guards TO PUBLIC`,`REVOKE TEMP ON DATABASE r2_staging_guards FROM PUBLIC`],
      ['runtime database CREATE',`GRANT CREATE ON DATABASE r2_staging_guards TO talgov_runtime`,`REVOKE CREATE ON DATABASE r2_staging_guards FROM talgov_runtime`],
      ['runtime database TEMP',`GRANT TEMP ON DATABASE r2_staging_guards TO talgov_runtime`,`REVOKE TEMP ON DATABASE r2_staging_guards FROM talgov_runtime`],
      ['migrator database TEMP',`GRANT TEMP ON DATABASE r2_staging_guards TO staging_owner`,`REVOKE TEMP ON DATABASE r2_staging_guards FROM staging_owner`],
      ['database grant option',`GRANT CREATE ON DATABASE r2_staging_guards TO staging_owner WITH GRANT OPTION`,`REVOKE GRANT OPTION FOR CREATE ON DATABASE r2_staging_guards FROM staging_owner`],
      ['schema grant option',`GRANT CREATE ON SCHEMA public TO staging_owner WITH GRANT OPTION`,`REVOKE GRANT OPTION FOR CREATE ON SCHEMA public FROM staging_owner`],
      ['PUBLIC schema CREATE',`GRANT CREATE ON SCHEMA public TO PUBLIC`,`REVOKE CREATE ON SCHEMA public FROM PUBLIC`],
      ['runtime schema CREATE',`GRANT CREATE ON SCHEMA public TO talgov_runtime`,`REVOKE CREATE ON SCHEMA public FROM talgov_runtime`],
      ['missing database CREATE',`REVOKE CREATE ON DATABASE r2_staging_guards FROM staging_owner`,`GRANT CREATE ON DATABASE r2_staging_guards TO staging_owner`],
      ['missing schema CREATE',`REVOKE CREATE ON SCHEMA public FROM staging_owner`,`GRANT CREATE ON SCHEMA public TO staging_owner`],
      ['missing global function default',`ALTER DEFAULT PRIVILEGES FOR ROLE staging_owner GRANT EXECUTE ON FUNCTIONS TO PUBLIC`, `ALTER DEFAULT PRIVILEGES FOR ROLE staging_owner REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC`],
      ['unsafe stored default',`ALTER DEFAULT PRIVILEGES FOR ROLE staging_owner GRANT SELECT ON TABLES TO talgov_runtime`, `ALTER DEFAULT PRIVILEGES FOR ROLE staging_owner REVOKE SELECT ON TABLES FROM talgov_runtime`]
    ];
    for(const [name,change,restore] of badCases) await t.test(name+' rejected',async()=>{
      await guardAdmin.query(change);
      try {await assert.rejects(run(guard.pool,guard.target));}
      finally {await guardAdmin.query(restore);}
      assert.equal((await run(guard.pool,guard.target)).pending,6);
    });
    await t.test('schema-local function revoke cannot replace global revoke',async()=>{
      await guardAdmin.query(`ALTER DEFAULT PRIVILEGES FOR ROLE staging_owner GRANT EXECUTE ON FUNCTIONS TO PUBLIC;
        ALTER DEFAULT PRIVILEGES FOR ROLE staging_owner IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC`);
      try {await assert.rejects(run(guard.pool,guard.target));}
      finally {await guardAdmin.query('ALTER DEFAULT PRIVILEGES FOR ROLE staging_owner REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC');}
    });
    await t.test('URL username must match pinned migration login',()=>{
      // Isolate a configured target in a child process; config performs no network IO.
      const script=`
        const assert=require('node:assert/strict');
        const id=require.resolve('./backend/scripts/staging/target.json');
        const t={...require(id),branch:'br-test-stage',endpoint:'ep-test-stage',
          host:'ep-test-stage.c-2.ap-southeast-1.aws.neon.tech',migrationLogin:'staging_owner'};
        require.cache[id].exports=t;
        const {config}=require('./backend/scripts/staging/target.cjs');
        const u=new URL('postgresql://staging_owner:synthetic@'+t.host+'/neondb?sslmode=verify-full&channel_binding=require');
        config(u.toString());
        for(const username of ['neondb_owner','talgov_runtime','other']) {
          u.username=username;assert.throws(()=>config(u.toString()));
        }`;
      const result=spawnSync(process.execPath,['-e',script],{cwd:path.join(__dirname,'../..'),encoding:'utf8'});
      assert.equal(result.status,0);
    });
    await t.test('session identity cannot be hidden by SET ROLE',async()=>{
      const c=await guardAdmin.connect();
      try {
        await c.query('SET ROLE staging_owner');
        await assert.rejects(run({connect:async()=>({query:(...args)=>c.query(...args),release:()=>{}})},guard.target));
      } finally {await c.query('RESET ROLE');c.release();}
    });
    await t.test('runtime SQL permission denials remain effective',async()=>{
      const u=new URL(url);u.pathname='/'+a.target.database;
      const p=new Pool(connectionConfig(u.toString(),true));
      const c=await p.connect();
      try {
        await c.query('SET ROLE talgov_runtime');
        for(const sql of ['CREATE SCHEMA forbidden','CREATE TEMP TABLE forbidden(id int)',
          'CREATE TABLE public.forbidden(id int)','CREATE TABLE app.forbidden(id int)',
          'SELECT * FROM r2_staging.history','DELETE FROM app.audit_events',
          'ALTER TABLE app.media_assets ADD COLUMN forbidden int']) {
          await assert.rejects(c.query(sql),{code:'42501'});
        }
      } finally {c.release();await p.end();}
    });
    await t.test('changed file and changed history rejected',async()=>{
      const root=fs.mkdtempSync(path.join(path.dirname(fixture.data),'r2-checksum-'));
      fs.cpSync(path.join(__dirname,'../database'),root,{recursive:true});
      fs.appendFileSync(path.join(root,migrations()[0].file),'\n-- altered');
      await assert.rejects(apply(a,{root}));
      await a.pool.query("UPDATE r2_staging.history SET sha256='changed' WHERE position=1");
      await assert.rejects(apply(a));
      await a.pool.query('UPDATE r2_staging.history SET sha256=$1 WHERE position=1',[migrations()[0].sha256]);
    });
    await t.test('concurrent runner fails immediately under advisory lock',async()=>{
      const lock=await a.pool.connect();
      try {await lock.query('BEGIN');await lock.query('SELECT pg_advisory_xact_lock($1)',[LOCK]);await assert.rejects(apply(a));}
      finally {await lock.query('ROLLBACK');lock.release();}
    });
    await t.test('late failure rolls back all DDL and history',async()=>{
      const b=await database('r2_staging_rollback');let checks=0;
      await assert.rejects(apply(b,{reverify:async()=>{if(++checks===2) throw new Error('secret-provider-detail');}}));
      assert.equal(checks,2);
      assert.equal((await b.pool.query("SELECT to_regnamespace('app') AS n,to_regnamespace('r2_staging') AS h")).rows[0].n,null);
      assert.equal((await b.pool.query("SELECT to_regnamespace('r2_staging') AS h")).rows[0].h,null);
      assert.equal((await apply(b)).applied,6);
    });
    await t.test('catalog and privilege drift rejected',async()=>{
      await a.pool.query('ALTER TABLE app.media_assets DROP CONSTRAINT media_filename');
      await assert.rejects(apply(a));
      const b=await database('r2_staging_privileges');
      await apply(b);
      await b.pool.query('GRANT DELETE ON app.audit_events TO talgov_runtime');
      await assert.rejects(run(b.pool,b.target));
    });
    await t.test('SQL failure in fifth migration rolls back earlier migrations',async()=>{
      const b=await database('r2_staging_sqlfailure');
      const u=new URL(url);u.pathname='/'+b.target.database;
      const privileged=new Pool(connectionConfig(u.toString(),true));
      try {
        await privileged.query(`CREATE FUNCTION public.reject_media() RETURNS event_trigger LANGUAGE plpgsql AS $$
          BEGIN IF TG_TAG='ALTER TABLE' THEN RAISE EXCEPTION 'synthetic SQL failure'; END IF; END $$;
          CREATE EVENT TRIGGER reject_media ON ddl_command_start EXECUTE FUNCTION public.reject_media()`);
        await assert.rejects(apply(b));
        assert.equal((await b.pool.query("SELECT to_regnamespace('app') AS n")).rows[0].n,null);
        assert.equal((await b.pool.query("SELECT to_regclass('public.r2_auth_user') AS n")).rows[0].n,null);
        assert.equal((await b.pool.query("SELECT to_regnamespace('r2_staging') AS n")).rows[0].n,null);
      } finally {await privileged.end();}
    });
    await t.test('unsafe runtime role rejected',async()=>{
      await admin.query('ALTER ROLE talgov_runtime CREATEDB');
      await assert.rejects(run(ref.pool,ref.target));
      await admin.query('ALTER ROLE talgov_runtime NOCREATEDB');
    });
    await t.test('unconfigured/main/development/forged metadata rejected',()=>{
      assert.throws(()=>validateTarget({...target,branch:null,endpoint:null,host:null,migrationLogin:null}));
      const good={...target,branch:'br-test-stage',endpoint:'ep-test-stage',host:'ep-test-stage.c-2.ap-southeast-1.aws.neon.tech',databaseOwner:'neondb_owner',migrationLogin:'staging_owner'};
      for(const key of ['branch','endpoint','host','migrationLogin']) assert.throws(()=>validateTarget({...good,[key]:null}));
      const p={id:good.project,org_id:good.organization,region_id:good.region,pg_version:18};
      const b={id:good.branch,project_id:good.project,name:good.name,default:false};
      const e={id:good.endpoint,project_id:good.project,branch_id:good.branch,host:good.host,type:'read_write'};
      validateMetadata(good,p,b,e);
      for(const branch of ['br-flat-shape-aoyf83yq','br-bitter-fire-aouffr8u']) assert.throws(()=>validateTarget({...good,branch}));
      for(const bad of [{...e,branch_id:'br-forged'},{...e,host:'attacker.example'},{...e,type:'read_only'}]) assert.throws(()=>validateMetadata(good,p,b,bad));
      assert.throws(()=>validateMetadata(good,p,{...b,default:true},e));
      assert.throws(()=>validateMetadata(good,p,{...b,default:undefined},e));
    });
    await t.test('CLI emits only fixed sanitized error, never secrets',()=>{
      const result=spawnSync(process.execPath,[path.join(__dirname,'../scripts/r2-staging-migrate.cjs')],{
        encoding:'utf8',env:{...process.env,R2_STAGING_DATABASE_URL:'postgresql://secret-user:secret-password@secret-host/neondb',NEON_API_KEY:'secret-token',R2_STAGING_APPROVAL:''}
      });
      assert.equal(result.status,1);assert.equal(result.stdout,'');
      assert.equal(result.stderr.trim(),'Staging migration refused or failed; no provider details emitted.');
    });
  } finally {await Promise.all(pools.map(p=>p.end()));await admin.end();}
});
