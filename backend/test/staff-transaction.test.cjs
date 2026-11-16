const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { BetterAuthAdapter } = require('../dist/authentication/better-auth.adapter');

function fixture({ fail, rollbackFails = false, replay = false, transportError = false } = {}) {
  const original = Object.assign(new Error('original synthetic database failure'), { code: '23514' });
  const queries = [], released = [], poolQueries = [];
  const client = new EventEmitter();
  client.query = async sql => {
    queries.push(sql);
    if (sql === 'ROLLBACK' && rollbackFails) throw new Error('secondary rollback failure');
    if (fail && sql.includes(fail)) throw original;
    if (transportError && sql.includes('staff_session_assurance')) client.emit('error', new Error('transport failed'));
    if (sql.includes('RETURNING digest')) return { rowCount: replay ? 0 : 1, rows: [] };
    if (sql.includes('SELECT subject,role,active,version')) return { rowCount: 1, rows: [{ subject:'synthetic-user',role:'editor',active:true,version:1 }] };
    return { rowCount: 1, rows: [{ attempts: 1 }] };
  };
  client.release = discard => released.push(discard);
  const adapter = Object.create(BetterAuthAdapter.prototype);
  adapter.options = { origin:'http://127.0.0.1:5177' };
  adapter.pool = { connect:async()=>client, query:async sql=>{ poolQueries.push(sql); return { rows:[{attempts:1}] }; } };
  adapter.authPromise = Promise.resolve({
    handler:async()=>new Response(JSON.stringify({success:true}),{headers:{'Set-Cookie':'synthetic-session=local; HttpOnly'}}),
    api:{getSession:async()=>({session:{id:'synthetic-session'},user:{id:'synthetic-user'}})},
  });
  const req = { path:'/api/staff-auth/two-factor/verify-totp',method:'POST',headers:{origin:adapter.options.origin},body:{code:'123456'},is:()=>true,ip:'127.0.0.1' };
  const res = { statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(v){this.statusCode=v;return this;},json(v){this.body=v;return this;} };
  return { adapter, client, original, queries, released, poolQueries, req, res };
}

for (const stage of ['BEGIN','SELECT pg_advisory','INSERT INTO app.audit_events','COMMIT']) {
  test(`staff management preserves the ${stage} error and discards on failed rollback`, async()=>{
    const f=fixture({fail:stage,rollbackFails:true});
    await assert.rejects(f.adapter.manageStaff({id:'synthetic-admin',sessionId:'synthetic-admin-session'},'synthetic-target','revoke',undefined,undefined,'synthetic-request'),e=>e===f.original);
    assert.equal(f.queries.at(-1),'ROLLBACK');
    assert.deepEqual(f.released,[true]);
    assert.equal(f.client.listenerCount('error'),0);
    assert.equal(f.queries.filter(sql=>sql==='BEGIN').length,1);
  });
}
test('confirmed management rollback permits reuse, but an ambiguous commit does not',async()=>{
  for (const [stage,discard] of [['INSERT INTO app.audit_events',false],['COMMIT',true]]) {
    const f=fixture({fail:stage});
    await assert.rejects(f.adapter.manageStaff({id:'synthetic-admin',sessionId:'s'},'t','revoke',undefined,undefined,'r'),e=>e===f.original);
    assert.deepEqual(f.released,[discard]);
  }
});
test('successful management commits exactly once and releases normally',async()=>{
  const f=fixture();
  await f.adapter.manageStaff({id:'synthetic-admin',sessionId:'s'},'t','revoke',undefined,undefined,'r');
  assert.equal(f.queries.at(-1),'COMMIT');assert.deepEqual(f.released,[false]);
});
for (const stage of ['BEGIN','INSERT INTO app.staff_session_assurance','INSERT INTO app.staff_auth_audit','COMMIT']) {
  test(`MFA ${stage} failure with failed rollback denies authentication and discards`,async()=>{
    const f=fixture({fail:stage,rollbackFails:true});
    const saved=console.error,logs=[];console.error=line=>logs.push(JSON.parse(line));
    try { await f.adapter.handle(f.req,f.res,()=>assert.fail('unexpected next')); } finally { console.error=saved; }
    assert.equal(f.res.statusCode,503);assert.deepEqual(f.released,[true]);
    assert.equal(logs[0].error_code,'23514'); // Original failure, not the rollback exception.
    assert.equal(f.res.headers['Set-Cookie'],undefined);
    assert.equal(f.poolQueries.some(sql=>sql.includes('staff_auth_audit')),false);
    assert.equal(f.client.listenerCount('error'),0);
  });
}
test('replayed TOTP denies and revokes the session after discarding a failed rollback',async()=>{
  const f=fixture({replay:true,rollbackFails:true});
  const order=[];f.client.release=discard=>{f.released.push(discard);order.push('release');};
  const poolQuery=f.adapter.pool.query;f.adapter.pool.query=async sql=>{if(sql.includes('DELETE FROM r2_auth_session'))order.push('revoke');return poolQuery(sql);};
  await f.adapter.handle(f.req,f.res,()=>assert.fail('unexpected next'));
  assert.equal(f.res.statusCode,401);assert.deepEqual(f.released,[true]);assert.deepEqual(order,['release','revoke']);
  assert.equal(f.queries.some(sql=>sql.includes('INSERT INTO app.staff_session_assurance')),false);
  assert.equal(f.res.headers['Set-Cookie'],undefined);
});
test('MFA commits assurance and audit together; client transport errors force discard',async()=>{
  for(const transportError of [false,true]) {
    const f=fixture({transportError});
    await f.adapter.handle(f.req,f.res,()=>assert.fail('unexpected next'));
    assert.equal(f.res.statusCode,200);assert.deepEqual(f.res.body,{success:true,mfaRequired:false});
    assert.equal(f.queries.at(-1),'COMMIT');assert.deepEqual(f.released,[transportError]);
    assert.ok(f.queries.findIndex(sql=>sql.includes('staff_auth_audit'))<f.queries.indexOf('COMMIT'));
  }
});
