// Read-only consistency report. No repairs, metadata mutations, deletes or URL output.
const {Pool}=require('pg');
const {connectionConfig}=require('../dist/database/postgres');
const {NeonObjectStore}=require('../dist/storage/neon-object-store');
const {checksum}=require('../dist/storage/file-validation');
async function reconcileDatabase(pool,store) {
  await store.verifyPrivate();
  const report={checked:0,ready:0,pending:0,retainedDeleted:0,missing:0,mismatch:0};
  const client=await pool.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await client.query('DECLARE media_inventory NO SCROLL CURSOR FOR SELECT object_key,sha256,bytes,processing,deleted_at FROM app.media_assets ORDER BY id');
    for(;;) {
      const {rows}=await client.query('FETCH 100 FROM media_inventory');if(!rows.length)break;
      for(const row of rows) {
        report.checked++;if(row.deleted_at)report.retainedDeleted++;else if(row.processing==='ready')report.ready++;else report.pending++;
        try { const bytes=await store.read(row.object_key);if(checksum(bytes)!==row.sha256||bytes.length!==Number(row.bytes))report.mismatch++; }
        catch(error){if(error.name==='NoSuchKey')report.missing++;else throw error;}
      }
    }
    await client.query('COMMIT');return report;
  } catch(error){await client.query('ROLLBACK');throw error;} finally{client.release();}
}
module.exports={reconcileDatabase};
if(require.main===module)(async()=>{
  const pool=new Pool(connectionConfig(process.env.MEDIA_DATABASE_URL));
  try {const report=await reconcileDatabase(pool,new NeonObjectStore());console.log(JSON.stringify(report));if(report.missing||report.mismatch)process.exitCode=1;}
  finally{await pool.end();}
})().catch(()=>{console.error('Read-only media reconciliation failed.');process.exitCode=1;});
