// Explicit local-only catalog generation; never invoked by normal tests or hosted runner.
const fs=require('node:fs');
const {Pool}=require('pg');
const {fixtureConfig,verifyFixture}=require('./local-staging-fixture.cjs');
const {catalog}=require('../scripts/staging/catalog.cjs');
const {migrations}=require('../scripts/staging/runner.cjs');
(async()=>{
 const fixture=fixtureConfig(process.env.R2_STAGING_TEST_FIXTURE);
 const pool=new Pool({connectionString:fixture.url.toString()});
 const c=await pool.connect();
 try {
  await verifyFixture(c,fixture);
  await c.query('BEGIN; ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC');
  for(const m of migrations()) await c.query(m.sql);
  fs.writeFileSync(require('node:path').join(__dirname,'../scripts/staging/catalog.json'),JSON.stringify(await catalog(c),null,2)+'\n');
  await c.query('ROLLBACK');
 } finally {c.release();await pool.end();}
})().catch(()=>{console.error('Local catalog generation failed');process.exitCode=1;});
