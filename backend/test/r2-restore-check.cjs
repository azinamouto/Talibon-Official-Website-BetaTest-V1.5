const assert=require('node:assert/strict');
const {Pool}=require('pg');
const {isolatedConfig,migrate}=require('../scripts/r2-migrate.cjs');
const {digest}=require('../scripts/r2-transfer.cjs');
(async()=>{
  const source=new Pool(isolatedConfig(process.env.R2_TEST_DATABASE_URL));
  const url=new URL(process.env.R2_TEST_DATABASE_URL);url.pathname='/r2_restore';
  const restored=new Pool(isolatedConfig(url.toString()));
  try {
    const tables=(await source.query("SELECT tablename FROM pg_tables WHERE schemaname='app' ORDER BY tablename")).rows;
    let rows=0;
    for(const {tablename:table} of tables) {
      assert.match(table,/^[a-z_]+$/);
      const sql=`SELECT to_jsonb(t) AS row FROM app.${table} t ORDER BY to_jsonb(t)::text`;
      const [a,b]=await Promise.all([source.query(sql),restored.query(sql)]);
      assert.equal(digest(a.rows),digest(b.rows));rows+=a.rowCount;
    }
    assert.equal((await migrate(restored)).applied,0);
    await restored.query('SET ROLE talgov_runtime');
    await assert.rejects(restored.query('DELETE FROM app.audit_events'),e=>e.code==='42501');
    await assert.rejects(restored.query('UPDATE app.staff_accounts SET role=\'citizen\''),e=>e.code==='23514');
    console.log(`PASS: logical backup/restore: ${tables.length} tables, ${rows} rows, exact digests, migration checksums, grants and constraints`);
  } finally {await source.end();await restored.end();}
})().catch(()=>{console.error('Restore verification failed');process.exitCode=1;});
