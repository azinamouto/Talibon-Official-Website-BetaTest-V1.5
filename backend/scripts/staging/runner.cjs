const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { catalog } = require('./catalog.cjs');
const manifest = require('./manifest.json');
const LOCK = 72001; // Cooperates with existing foundation runner as well.
const digest = text => crypto.createHash('sha256').update(text).digest('hex');
function migrations(root = path.join(__dirname, '../../database')) {
  return manifest.map(m => {
    const sql = fs.readFileSync(path.join(root,m.file),'utf8').replace(/\r\n/g,'\n');
    if (digest(sql) !== m.sha256) throw new Error();
    return { ...m, sql };
  });
}
const approval = t => `APPLY:${t.project}:${t.branch}:${t.database}:${digest(JSON.stringify(manifest))}`;
async function prerequisites(c,t) {
  const { rows: [r] } = await c.query(`SELECT current_database() AS db,current_user AS login,session_user AS session_login,
    current_setting('server_version_num')::int AS version,
    has_database_privilege(current_user,current_database(),'CREATE') AS dbcreate,
    has_schema_privilege(current_user,'public','CREATE') AS pubcreate,
    has_schema_privilege(current_user,'public','USAGE') AS pubusage`);
  if (r.db !== t.database || t.databaseOwner !== 'neondb_owner' || t.migrationLogin === t.databaseOwner || r.login !== t.migrationLogin || r.session_login !== t.migrationLogin || r.version < 180000 || r.version >= 190000 || !r.dbcreate || !r.pubcreate || !r.pubusage) throw new Error();
  if (!(await c.query(`SELECT datdba=$1::regrole AS owned FROM pg_database WHERE datname=current_database()`,[t.databaseOwner])).rows[0].owned) throw new Error();
  if ((await c.query('SHOW search_path')).rows[0].search_path !== 'public') throw new Error();
  if ((await c.query(`SELECT 1 FROM pg_namespace WHERE nspname='public' AND nspowner<>'pg_database_owner'::regrole`)).rowCount) throw new Error();
  const roles = (await c.query(`SELECT rolname,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls,rolcanlogin
    FROM pg_roles WHERE rolname IN (current_user,'talgov_runtime')`)).rows;
  if (roles.length !== 2 || roles.some(x => x.rolsuper || x.rolcreatedb || x.rolcreaterole || x.rolreplication || x.rolbypassrls || (x.rolname==='talgov_runtime' ? x.rolcanlogin : !x.rolcanlogin))) throw new Error();
  if ((await c.query(`SELECT has_database_privilege('talgov_runtime',current_database(),'CREATE') OR
    has_database_privilege('talgov_runtime',current_database(),'TEMP') AS unsafe`)).rows[0].unsafe) throw new Error();
  // Inspect PUBLIC explicitly; effective runtime checks also catch inherited privileges.
  // Only Neon's NOLOGIN managed role may retain non-grantable CREATE/TEMP.
  // MEMBER covers indirect membership and NOINHERIT/SET ROLE paths too.
  if ((await c.query(`SELECT 1 FROM pg_database d,
    LATERAL aclexplode(COALESCE(d.datacl,acldefault('d',d.datdba))) a
    WHERE d.datname=current_database() AND
      ((a.grantee=0 AND a.privilege_type IN ('CREATE','TEMPORARY')) OR
       (a.grantee=current_user::regrole AND a.is_grantable) OR
       (a.grantee NOT IN (d.datdba,current_user::regrole) AND a.privilege_type IN ('CREATE','TEMPORARY')
        AND NOT EXISTS (SELECT 1 FROM pg_roles managed WHERE managed.oid=a.grantee
          AND managed.rolname='neon_superuser' AND NOT managed.rolcanlogin AND NOT a.is_grantable
          AND NOT pg_has_role(current_user,managed.oid,'MEMBER')
          AND NOT pg_has_role('talgov_runtime',managed.oid,'MEMBER'))))`)).rowCount) throw new Error();
  if ((await c.query(`SELECT has_database_privilege(current_user,current_database(),'TEMP') AS unsafe`)).rows[0].unsafe) throw new Error();
  // No inherited administrative authority; provision the NOLOGIN group separately.
  if ((await c.query(`SELECT 1 FROM pg_auth_members WHERE member IN (current_user::regrole,'talgov_runtime'::regrole)`)).rowCount) throw new Error();
  if ((await c.query(`SELECT 1 FROM pg_namespace WHERE nspname IN ('app','r2_staging') AND nspowner<>current_user::regrole`)).rowCount) throw new Error();
  if ((await c.query(`SELECT 1 FROM pg_namespace n,LATERAL aclexplode(COALESCE(n.nspacl,acldefault('n',n.nspowner))) a
    WHERE n.nspname IN ('public','app','r2_staging') AND
      ((a.privilege_type='CREATE' AND a.grantee NOT IN (current_user::regrole,n.nspowner)) OR
       (a.grantee=current_user::regrole AND n.nspname='public' AND a.is_grantable))`)).rowCount) throw new Error();
  // A missing global row means PostgreSQL's built-in PUBLIC EXECUTE default.
  // Schema-local revocations cannot subtract from that global default.
  if ((await c.query(`SELECT 1 FROM pg_roles r
    LEFT JOIN pg_default_acl d ON d.defaclrole=r.oid AND d.defaclnamespace=0 AND d.defaclobjtype='f',
    LATERAL aclexplode(COALESCE(d.defaclacl,acldefault('f',r.oid))) a
    WHERE r.rolname=current_user AND a.grantee<>r.oid`)).rowCount) throw new Error();
  if ((await c.query(`SELECT 1 FROM pg_default_acl d,LATERAL aclexplode(d.defaclacl) a
    WHERE d.defaclrole=current_user::regrole AND a.grantee<>current_user::regrole`)).rowCount) throw new Error();
}
async function verify(c, count = manifest.length) {
  const expected = count === 5 ? require('./catalog-v5.json') : require('./catalog.json');
  if (JSON.stringify(await catalog(c)) !== JSON.stringify(expected)) throw new Error();
  if (!(await c.query(`SELECT has_schema_privilege('talgov_runtime','app','USAGE') AS ok`)).rows[0].ok) throw new Error();
  if ((await c.query(`SELECT 1 FROM pg_namespace n,LATERAL aclexplode(n.nspacl) a
    WHERE n.nspname IN ('app','r2_staging') AND a.grantee<>current_user::regrole
    AND NOT (n.nspname='app' AND a.grantee='talgov_runtime'::regrole AND a.privilege_type='USAGE' AND NOT a.is_grantable)`)).rowCount) throw new Error();
  if ((await c.query(`SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace,
    LATERAL aclexplode(COALESCE(c.relacl,acldefault('r',c.relowner))) a
    WHERE n.nspname='r2_staging' AND (c.relowner<>current_user::regrole OR a.grantee<>current_user::regrole)`)).rowCount) throw new Error();
}
async function run(pool,t,{ mode='preflight', authorization, root, reverify=async()=>{} }={}) {
  let c;
  try {
    if (!['preflight','apply'].includes(mode) || (mode==='apply' && authorization!==approval(t))) throw new Error();
    const files=migrations(root);
    c=await pool.connect();
    await c.query(mode==='preflight' ? 'BEGIN READ ONLY' : 'BEGIN');
    await c.query("SET LOCAL search_path=public");
    await c.query("SET LOCAL statement_timeout='30s'; SET LOCAL lock_timeout='3s'; SET LOCAL transaction_timeout='120s'");
    if (!(await c.query('SELECT pg_try_advisory_xact_lock($1) AS locked',[LOCK])).rows[0].locked) throw new Error();
    await prerequisites(c,t);
    await reverify();
    const exists=(await c.query("SELECT to_regclass('r2_staging.history') IS NOT NULL AS present")).rows[0].present;
    const rows=exists ? (await c.query('SELECT position,file,sha256 FROM r2_staging.history ORDER BY position')).rows : [];
    if (rows.length && (![5,files.length].includes(rows.length) || rows.some((r,i)=>r.position!==i+1 || r.file!==files[i].file || r.sha256!==files[i].sha256))) throw new Error();
    if (rows.length) await verify(c,rows.length);
    else if ((await c.query("SELECT 1 FROM pg_namespace WHERE nspname IN ('app','r2_staging') UNION ALL SELECT 1 FROM pg_class WHERE relnamespace='public'::regnamespace AND relname LIKE 'r2_auth_%'")).rowCount) throw new Error();
    if (mode==='apply' && rows.length < files.length) {
      if (!rows.length) {
        await c.query('CREATE SCHEMA r2_staging; REVOKE ALL ON SCHEMA r2_staging FROM PUBLIC');
        await c.query('CREATE TABLE r2_staging.history(position integer PRIMARY KEY,file text UNIQUE NOT NULL,sha256 text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now()); REVOKE ALL ON r2_staging.history FROM PUBLIC,talgov_runtime');
      }
      for (const [i,m] of files.entries()) {
        if (i < rows.length) continue;
        await c.query(m.sql);
        await c.query('INSERT INTO r2_staging.history(position,file,sha256) VALUES($1,$2,$3)',[i+1,m.file,m.sha256]);
      }
      await verify(c);
      await prerequisites(c,t);
      await reverify();
    }
    await c.query('COMMIT');
    return { mode, applied: mode==='apply' ? files.length-rows.length : 0, pending: mode==='apply' ? 0 : files.length-rows.length };
  } catch {
    if (c) { try { await c.query('ROLLBACK'); } catch {} }
    throw new Error('Staging migration refused or failed; no provider details emitted.');
  } finally { c?.release(true); }
}
module.exports={ run,migrations,approval,LOCK };
