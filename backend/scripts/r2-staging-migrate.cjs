// Hosted-only entry point. No local/testing switch, dotenv loading or target overrides.
const { Pool } = require('pg');
const { target, config, verifyTarget } = require('./staging/target.cjs');
const { run, approval } = require('./staging/runner.cjs');
async function main() {
  let pool;
  try {
    const args=process.argv.slice(2);
    if (args.length>1 || (args.length && !['--preflight','--apply'].includes(args[0]))) throw new Error();
    const mode=args[0]==='--apply' ? 'apply' : 'preflight';
    if (mode==='apply' && process.env.R2_STAGING_APPROVAL!==approval(target)) throw new Error();
    const options=config(process.env.R2_STAGING_DATABASE_URL);
    const reverify=()=>verifyTarget(process.env.NEON_API_KEY);
    await reverify(); // Must succeed BEFORE any PostgreSQL connection.
    pool=new Pool(options);
    pool.on('error',()=>{});
    console.log(JSON.stringify(await run(pool,target,{mode,authorization:process.env.R2_STAGING_APPROVAL,reverify})));
  } catch { console.error('Staging migration refused or failed; no provider details emitted.'); process.exitCode=1; }
  finally { await pool?.end(); }
}
if (require.main===module) main();
