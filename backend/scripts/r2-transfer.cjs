// Offline operator tooling. No SDK, auth export, citizen data export, or production write path.
const fs = require('node:fs');
const crypto = require('node:crypto');
const { Pool } = require('pg');
const { connectionConfig } = require('../dist/database/postgres.js');
const { isolatedConfig } = require('./r2-migrate.cjs');
const retained = ['barangays','departments','officials','news','pages','tourism_spots','events','navigation','downloadables','ordinances','resolutions','citizens_charter_cms','services_cms'];
const fields = {
  content_sources: ['id','reference','owner','sha256','approved','reviewed_at'],
  media_categories: ['id','kind','slug','title','approved'],
  public_content: ['id','kind','legacy_id','slug','title','body','source_id','publication','published_at','deleted_at'],
  media_assets: ['id','kind','category_id','source_id','title','description','alt_text','object_key','mime','bytes','sha256','processing','publication','version','created_by','updated_by','published_at','deleted_at'],
};
const canonical = value => JSON.stringify(normalize(value));
function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value==='object') return Object.fromEntries(Object.keys(value).sort().map(k => [k,normalize(value[k])]));
  return value;
}
const digest = value => crypto.createHash('sha256').update(canonical(value)).digest('hex');
const digestText = value => crypto.createHash('sha256').update(value).digest('hex');
const ident = value => '"'+value.replaceAll('"','""')+'"';
function requireValue(ok) { if (!ok) throw new Error('Reconciliation or manifest validation failed'); }
function validateTarget(target) {
  requireValue(target && Object.hasOwn(fields,target.table) && target.row && typeof target.row.id==='string');
  requireValue(Object.keys(target.row).every(key => fields[target.table].includes(key)));
  const checkNumbers = value => {
    if (typeof value==='number') requireValue(Number.isFinite(value) && (!Number.isInteger(value) || Number.isSafeInteger(value)));
    else if (value && typeof value==='object') Object.values(value).forEach(checkNumbers);
  };
  checkNumbers(target.row);
}

async function exportSnapshot(pool, plan) {
  requireValue(plan?.version===1 && typeof plan.approvalReference==='string' && plan.approvalReference.trim().length>0 && Array.isArray(plan.rows));
  requireValue(plan.rows.every(r => retained.includes(r.table) && typeof r.id==='string' && /^[a-f0-9]{64}$/.test(r.sourceDigest)
    && ['approved','archived','deferred','quarantined'].includes(r.disposition) && typeof r.reason==='string' && r.reason.trim()));
  const decisions = new Map(plan.rows.map(r => [r.table+':'+r.id,r]));
  requireValue(decisions.size===plan.rows.length);
  const client = await pool.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await client.query("SET LOCAL TIME ZONE 'UTC'");
    await client.query("SET LOCAL statement_timeout='30s'");
    const tables = (await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;
    const inventory = [], targets = new Map(), seen = new Set();
    for (const {tablename:table} of tables) {
      const [{count}] = (await client.query(`SELECT count(*)::text AS count FROM public.${ident(table)}`)).rows;
      if (!retained.includes(table)) { inventory.push({table,total:count,disposition:'excluded',reason:'Outside approved public-content allowlist; no rows exported'}); continue; }
      requireValue(Number(count)<=10000); // Explicit bounded rehearsal; larger sources require a reviewed streaming implementation.
      // Hash PostgreSQL's exact JSONB text, avoiding JS rounding of bigint/numeric source values.
      const rows = (await client.query(`SELECT id::text AS id,to_jsonb(t)::text AS snapshot FROM public.${ident(table)} t ORDER BY id::text`)).rows;
      const counts = {approved:0,archived:0,deferred:0,quarantined:0};
      for (const {id,snapshot} of rows) {
        const key = table+':'+id, decision = decisions.get(key);
        requireValue(decision && digestText(snapshot)===decision.sourceDigest);
        seen.add(key); counts[decision.disposition]++;
        if (decision.disposition==='approved') {
          requireValue(Array.isArray(decision.targets) && decision.targets.length>0);
          for (const target of decision.targets) {
            validateTarget(target);
            const key = target.table+':'+target.row.id, prior = targets.get(key);
            requireValue(!prior || digest(prior)===digest(target));
            targets.set(key,target);
          }
        } else requireValue(!decision.targets?.length);
      }
      requireValue(Object.values(counts).reduce((a,b) => a+b,0)===Number(count));
      inventory.push({table,total:count,...counts});
    }
    requireValue(seen.size===decisions.size);
    await client.query('COMMIT');
    const payload = {version:1,approvalReference:plan.approvalReference,inventory,
      decisions:plan.rows.map(({table,id,sourceDigest,disposition,reason})=>({table,id,sourceDigest,disposition,reason})),
      targets:[...targets.values()].sort((a,b)=>(a.table+':'+a.row.id).localeCompare(b.table+':'+b.row.id))};
    return {payload,digest:digest(payload)};
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

async function snapshotTarget(client, table, id) {
  const [result] = (await client.query(`SELECT to_jsonb(t)::text AS row FROM app.${ident(table)} t WHERE id=$1`,[id])).rows;
  return result?.row;
}
async function checkReceipt(client, receipt) {
  const counts = {};
  for (const target of receipt.targets) {
    const current = await snapshotTarget(client,target.table,target.id);
    requireValue(current && digestText(current)===target.digest);
    counts[target.table]=(counts[target.table] || 0)+1;
  }
  return {matched:receipt.targets.length,counts};
}
async function transaction(pool, work, dryRun = false) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL TIME ZONE 'UTC'");
    await client.query("SET LOCAL statement_timeout='30s'");
    await client.query("SET LOCAL lock_timeout='5s'");
    await client.query('SELECT pg_advisory_xact_lock(72003)');
    // Prevent repository edits between reconciliation and rollback/commit.
    await client.query('LOCK TABLE app.content_sources,app.media_categories,app.public_content,app.media_assets IN SHARE ROW EXCLUSIVE MODE');
    const result = await work(client);
    await client.query(dryRun ? 'ROLLBACK' : 'COMMIT'); return result;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
async function importBundle(pool, bundle, batchId, dryRun = false) {
  requireValue(bundle?.payload?.version===1 && bundle.digest===digest(bundle.payload) && Array.isArray(bundle.payload.targets));
  bundle.payload.targets.forEach(validateTarget);
  requireValue(new Set(bundle.payload.targets.map(t=>t.table+':'+t.row.id)).size===bundle.payload.targets.length);
  return transaction(pool,async client => {
    const [prior] = (await client.query('SELECT * FROM app.import_batches WHERE id=$1 FOR UPDATE',[batchId])).rows;
    if (prior) {
      requireValue(prior.digest===bundle.digest && !prior.rolled_back_at);
      return {...await checkReceipt(client,prior.manifest),replayed:true};
    }
    const receipt = {inventory:bundle.payload.inventory,targets:[]};
    for (const table of Object.keys(fields)) {
      for (const target of bundle.payload.targets.filter(t=>t.table===table)) {
        const keys = Object.keys(target.row);
        await client.query(`INSERT INTO app.${ident(table)} (${keys.map(ident).join(',')}) VALUES (${keys.map((_,i)=>'$'+(i+1)).join(',')})`,keys.map(k=>target.row[k]));
        receipt.targets.push({table,id:target.row.id,digest:digestText(await snapshotTarget(client,table,target.row.id))});
      }
    }
    await client.query('INSERT INTO app.import_batches(id,digest,manifest) VALUES($1,$2,$3)',[batchId,bundle.digest,receipt]);
    await client.query("INSERT INTO app.audit_events(action,resource_id,request_id) VALUES('migration.import',$1,$2)",[batchId,batchId]);
    return {...await checkReceipt(client,receipt),replayed:false};
  },dryRun);
}
async function reconcile(pool,batchId) {
  return transaction(pool,async client => {
    const [receipt] = (await client.query('SELECT manifest,rolled_back_at FROM app.import_batches WHERE id=$1',[batchId])).rows;
    requireValue(receipt && !receipt.rolled_back_at);
    return checkReceipt(client,receipt.manifest);
  });
}
async function rollback(pool,batchId) {
  return transaction(pool,async client => {
    const [receipt] = (await client.query('SELECT manifest,rolled_back_at FROM app.import_batches WHERE id=$1 FOR UPDATE',[batchId])).rows;
    requireValue(receipt);
    if (receipt.rolled_back_at) return {replayed:true};
    await checkReceipt(client,receipt.manifest);
    for (const table of Object.keys(fields).reverse()) {
      for (const target of receipt.manifest.targets.filter(t=>t.table===table)) {
        await client.query(`DELETE FROM app.${ident(table)} WHERE id=$1`,[target.id]);
      }
    }
    await client.query('UPDATE app.import_batches SET rolled_back_at=now() WHERE id=$1',[batchId]);
    await client.query("INSERT INTO app.audit_events(action,resource_id,request_id) VALUES('migration.rollback',$1,$2)",[batchId,batchId]);
    return {replayed:false};
  });
}
module.exports={canonical,digest,digestText,exportSnapshot,importBundle,reconcile,rollback};
if (require.main===module) {
  (async()=>{
    let pool;
    try {
      const [command,file,batchId]=process.argv.slice(2);
      if (command==='export') {
        // Source may be a real direct PostgreSQL endpoint: read-only transaction, verified TLS.
        pool=new Pool(process.env.R2_SOURCE_LOCAL_TEST==='true' ? isolatedConfig(process.env.R2_SOURCE_DATABASE_URL) : connectionConfig(process.env.R2_SOURCE_DATABASE_URL));
        const bundle=await exportSnapshot(pool,JSON.parse(fs.readFileSync(file,'utf8')));
        fs.writeFileSync(file+'.bundle.json',JSON.stringify(bundle,null,2),{flag:'wx',mode:0o600});
        console.log(JSON.stringify({digest:bundle.digest,inventory:bundle.payload.inventory}));
      } else {
        pool=new Pool(isolatedConfig(process.env.R2_MIGRATION_DATABASE_URL));
        const result=command==='import' ? {...await importBundle(pool,JSON.parse(fs.readFileSync(file,'utf8')),batchId,!process.argv.includes('--apply')),dryRun:!process.argv.includes('--apply')}
          : command==='reconcile' ? await reconcile(pool,file) : command==='rollback' ? await rollback(pool,file) : null;
        requireValue(result); console.log(JSON.stringify(result));
      }
    } catch { console.error('R2 transfer failed; no credentials, source rows or provider errors emitted'); process.exitCode=1; }
    finally { await pool?.end(); }
  })();
}
