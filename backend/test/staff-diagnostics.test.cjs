const { test } = require('node:test');
const assert = require('node:assert/strict');
const { emitStaffAuthFailure } = require('../dist/security/failure-diagnostics');
const { BetterAuthAdapter } = require('../dist/authentication/better-auth.adapter');

test('staff logs allowlisted codes and fixed classifications only',()=>{
  const logs=[];
  for(const operation of ['pool','request','initialization']) {
    emitStaffAuthFailure({code:'42501',name:'synthetic-private-name',message:'synthetic-private-message',cause:{token:'synthetic-private-token'}},operation,{error:line=>logs.push(JSON.parse(line))});
  }
  assert.deepEqual(logs.map(l=>l.operation),['pool','request','initialization']);
  for(const log of logs) {
    assert.deepEqual(Object.keys(log),['event','component','operation','phase','reason','error_code']);
    assert.equal(log.event,'staff_auth_failure');assert.equal(log.reason,'permission_denied');assert.equal(log.error_code,'42501');
    assert.equal(JSON.stringify(log).includes('synthetic-private'),false);
  }
});
test('arbitrary codes, names, strings and poisoned getters never enter staff logs',()=>{
  let getters=0;
  const poisoned=Object.defineProperties({}, {code:{get(){getters++;throw Error('private');}},message:{get(){getters++;throw Error('private');}},name:{get(){getters++;throw Error('private');}}});
  const revoked=Proxy.revocable({},{});revoked.revoke();
  const inputs=[{code:'synthetic-private-token\nforged log',name:'private',message:'private'},{code:'x'.repeat(10000)},'private',null,poisoned,revoked.proxy,{code:{toString(){throw Error('coercion');}}},Object.create({code:'42501'})];
  for(const input of inputs) {
    const logs=[];assert.doesNotThrow(()=>emitStaffAuthFailure(input,'request',{error:line=>logs.push(JSON.parse(line))}));
    assert.deepEqual(logs,[{event:'staff_auth_failure',component:'staff_auth',operation:'request',phase:'work',reason:'unexpected_exception'}]);
  }
  assert.equal(getters,0);
});
test('throwing and rejecting loggers cannot disrupt denial',async()=>{
  assert.doesNotThrow(()=>emitStaffAuthFailure({},'request',{error(){throw Error('sink failed');}}));
  emitStaffAuthFailure({},'request',{error:()=>Promise.reject(Error('sink failed'))});
  await new Promise(resolve=>setImmediate(resolve));
});
test('pool errors and request failures use the sanitized logger; throwing sink retains 503',async()=>{
  const adapter=new BetterAuthAdapter({databaseUrl:'postgresql://synthetic@127.0.0.1/synthetic',origin:'http://127.0.0.1:5177',localTest:true,secret:'s'.repeat(43)});
  const saved=console.error,logs=[];
  try {
    console.error=line=>logs.push(JSON.parse(line));
    adapter.pool.emit('error',{code:'synthetic-private-code',name:'synthetic-private-name'});
    adapter.pool.query=async()=>{throw Object.assign(Error('synthetic-private-message'),{code:'28P01'});};
    const req={path:'/api/staff-auth/sign-in/email',method:'POST',headers:{origin:'http://127.0.0.1:5177'},is:()=>true};
    const res={setHeader(){},status(n){this.statusCode=n;return this;},json(body){this.body=body;}};
    await adapter.handle(req,res,()=>assert.fail('unexpected next'));
    assert.equal(res.statusCode,503);assert.equal(logs[0].operation,'pool');assert.equal(logs[0].error_code,undefined);
    assert.equal(logs[1].operation,'request');assert.equal(logs[1].error_code,'28P01');
    console.error=()=>{throw Error('sink failure');};
    await adapter.handle(req,res,()=>assert.fail('unexpected next'));
    assert.equal(res.statusCode,503);assert.deepEqual(res.body,{message:'Authentication request could not be completed.'});
  } finally { console.error=saved;await adapter.close(); }
});
test('initialization failure remains a sanitized 503 even when the logger throws',()=>{
  const runtime=require('../dist/authentication/runtime');
  const {configureApp}=require('../dist/configure-app');
  const savedAuth=runtime.staffAuthentication,savedLog=console.error,savedEnv=process.env.NODE_ENV;
  const middlewares=[],logs=[];
  try {
    process.env.NODE_ENV='production';
    runtime.staffAuthentication=()=>{throw {code:'synthetic-private-code',name:'synthetic-private-name'};};
    configureApp({getHttpAdapter:()=>({getInstance:()=>({disable(){},set(){}})}),use:(...args)=>middlewares.push(args.at(-1)),useGlobalPipes(){},enableVersioning(){},enableCors(){}});
    const res={headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(body){this.body=body;}};
    console.error=line=>logs.push(JSON.parse(line));
    const middleware=middlewares.at(-1);
    middleware({path:'/api/staff/me'},res,()=>assert.fail('unexpected next'));
    assert.equal(res.statusCode,503);assert.equal(res.headers['Cache-Control'],'no-store');
    assert.deepEqual(logs,[{event:'staff_auth_failure',component:'staff_auth',operation:'initialization',phase:'configuration',reason:'unexpected_exception'}]);
    console.error=()=>{throw Error('sink failure');};
    middleware({path:'/api/staff/me'},res,()=>assert.fail('unexpected next'));
    assert.equal(res.statusCode,503);assert.deepEqual(res.body,{message:'Staff authentication is unavailable.'});
  } finally {
    runtime.staffAuthentication=savedAuth;console.error=savedLog;
    if(savedEnv===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=savedEnv;
  }
});
