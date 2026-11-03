// Isolated synthetic database only, on the exact previously authorized development branch.
const fs=require('node:fs');
const path=require('node:path');
const {randomBytes}=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {Pool}=require('pg');
const {parse}=require('dotenv');
const {verifyTarget,neonConfig,target}=require('./r2-neon-target.cjs');
async function main() {
  verifyTarget();
  const root=path.resolve(__dirname,'../..');
  const provision=parse(fs.readFileSync(path.join(root,'.env.neon-provisioning')));
  const env=parse(fs.readFileSync(path.join(root,'.env.neon-qualification')));
  const admin=new Pool(neonConfig(provision.DATABASE_URL_UNPOOLED));
  const database=`r2_auth_${randomBytes(6).toString('hex')}`;
  let created=false;
  try {
    await admin.query('GRANT talgov_r2_migration TO neondb_owner WITH INHERIT FALSE, SET TRUE');
    try { await admin.query(`CREATE DATABASE "${database}" OWNER talgov_r2_migration`); created=true; }
    finally { await admin.query('REVOKE talgov_r2_migration FROM neondb_owner'); }
    await admin.query(`REVOKE ALL ON DATABASE ${database} FROM PUBLIC`);
    await admin.query(`GRANT CONNECT ON DATABASE ${database} TO talgov_r2_app`);
    const migration=new URL(env.R2_MIGRATION_DATABASE_URL);migration.pathname='/'+database;
    const runtime=new URL(env.DATABASE_URL);runtime.pathname='/'+database;
    neonConfig(migration.toString(),{databases:[database]});
    neonConfig(runtime.toString(),{pooled:true,databases:[database]});
    console.log(`Verified development branch; new synthetic database ${database}; existing credentials and roles preserved.`);
    const result=spawnSync(process.execPath,['--test','--test-timeout=240000',path.join(root,'backend/test/staff-auth.integration.cjs')],{
      stdio:'inherit',env:{...process.env,R2_AUTH_HOSTED:'1',R2_AUTH_TEST_URL:migration.toString(),R2_AUTH_RUNTIME_URL:runtime.toString()},
    });
    const cleanupUrl=new URL(runtime);cleanupUrl.hostname=target.host;
    const cleanup=new Pool(neonConfig(cleanupUrl.toString(),{databases:[database]}));
    try {
      await cleanup.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity
        WHERE datname=$1 AND usename=current_user AND pid<>pg_backend_pid()`,[database]);
    } finally { await cleanup.end(); }
    if(result.status!==0) throw new Error('Hosted authentication suite failed');
    console.log('PASS: real Better Auth HTTP flows against isolated Neon PostgreSQL, direct migration and pooled least-privilege runtime; TLS/channel binding required. No mail sent.');
  } finally {
    try {
      if(created) {
        await admin.query('GRANT talgov_r2_migration TO neondb_owner WITH INHERIT FALSE, SET TRUE');
        try {
          const owner=await admin.connect();
          try {
            await owner.query('SET ROLE talgov_r2_migration');
            await owner.query(`DROP DATABASE "${database}"`);
          } finally {
            try { await owner.query('RESET ROLE'); }
            finally { owner.release(); }
          }
        } finally { await admin.query('REVOKE talgov_r2_migration FROM neondb_owner'); }
      }
      const databaseExists=await admin.query('SELECT 1 FROM pg_database WHERE datname=$1',[database]);
      const membershipExists=await admin.query(`SELECT 1 FROM pg_auth_members m
        JOIN pg_roles grantee ON grantee.oid=m.member JOIN pg_roles granted ON granted.oid=m.roleid
        WHERE grantee.rolname='neondb_owner' AND granted.rolname='talgov_r2_migration' AND m.set_option`);
      if(databaseExists.rowCount || membershipExists.rowCount) throw new Error('Temporary Neon resources were not removed');
      console.log('PASS: synthetic database and temporary migration-role membership removed.');
    } finally { await admin.end(); }
  }
}
main().catch(()=>{console.error('Neon authentication qualification failed; provider details and credentials suppressed.');process.exitCode=1;});
