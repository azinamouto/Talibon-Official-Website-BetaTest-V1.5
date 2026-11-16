const {test}=require('node:test');
const assert=require('node:assert/strict');
const {clientIp}=require('../dist/security/client-ip');
const {RateLimiterGuard}=require('../dist/security/rate-limiter.guard');
const {AuditMiddleware}=require('../dist/security/audit.middleware');
const {validateEnvironment}=require('../dist/config/environment');
const {Reflector}=require('@nestjs/core');
const {classifyFailure}=require('../dist/security/failure-diagnostics');
const {sanitized}=require('../dist/database/postgres');
const diagnosticId='12345678-1234-4123-8123-123456789abc';
const context=(req,headers={})=>({getHandler:()=>function(){},getClass:()=>class{},switchToHttp:()=>({getRequest:()=>req,getResponse:()=>({setHeader:(k,v)=>headers[k]=v})})});
test('untrusted forwarding and internal IP headers cannot override socket identity',()=>{
 const previous=process.env.VERCEL; delete process.env.VERCEL;
 try { assert.equal(clientIp({ip:'::ffff:127.0.0.1',headers:{'x-forwarded-for':'1.2.3.4','x-talgov-client-ip':'5.6.7.8'}}),'127.0.0.1'); }
 finally { if(previous===undefined)delete process.env.VERCEL;else process.env.VERCEL=previous; }
});

test('IP failures log once, deny before throttle work and never expose header values',async()=>{
 const previous=process.env.VERCEL;process.env.VERCEL='1';
 try {for(const [raw,reason]of [[undefined,'ip_missing'],['','ip_missing'],[['private'],'ip_non_string'],['203.0.113.1, 203.0.113.2','ip_ambiguous'],['private','ip_invalid']]){
  const records=[];let calls=0;const guard=new RateLimiterGuard(new Reflector());
  guard.logger={warn:s=>records.push(JSON.parse(s))};guard.configure({transaction:async()=>{calls++;}});
  await assert.rejects(guard.canActivate(context({path:'/api/news',method:'GET',headers:{'x-forwarded-for':raw},requestId:diagnosticId})),e=>e.getStatus()===503&&classifyFailure(e).reason===reason);
  assert.equal(calls,0);assert.equal(records.length,1);assert.equal(records[0].reason,reason);
  assert.equal(records[0].transaction_outcome,'not_started');assert.equal(records[0].request_id,diagnosticId);
  assert.ok(!JSON.stringify(records).includes('203.0.113'));assert.ok(!JSON.stringify(records).includes('private'));
 }}finally {if(previous===undefined)delete process.env.VERCEL;else process.env.VERCEL=previous;}
});

test('throttle SQL order, limit boundary, parameterization and silent 429/liveness are unchanged',async()=>{
 const previous=process.env.VERCEL;delete process.env.VERCEL;
 try {for(const attempts of [120,121]){
  const records=[],queries=[],headers={};const guard=new RateLimiterGuard(new Reflector());
  guard.logger={warn:s=>records.push(s)};guard.configure({transaction:async work=>work({query:async(sql,values)=>{queries.push({sql,values});return sql.startsWith('INSERT')?[{attempts,retry:17}]:[];}})});
  const req={path:'/api/news',method:'GET',headers:{},ip:'203.0.113.1',requestId:diagnosticId};
  if(attempts===121)await assert.rejects(guard.canActivate(context(req,headers)),e=>e.getStatus()===429);else assert.equal(await guard.canActivate(context(req,headers)),true);
  assert.equal(queries.length,2);assert.equal(queries[0].sql,"DELETE FROM app.staff_auth_throttle WHERE key LIKE 'http:%' AND started_at < now()-interval '1 day'");
  assert.ok(queries[1].sql.startsWith('INSERT INTO app.staff_auth_throttle(key,attempts) VALUES($1,1)'));
  assert.match(queries[1].values[0],/^http:[a-f0-9]{64}$/);assert.ok(!queries[1].sql.includes('203.0.113.1'));
  assert.equal(headers['X-RateLimit-Limit'],120);assert.equal(headers['X-RateLimit-Remaining'],0);
  assert.equal(headers['Retry-After'],attempts===121?17:undefined);assert.deepEqual(records,[]);
  assert.equal(await guard.canActivate(context({path:'/api/health'})),true);assert.equal(queries.length,2);
 }}finally {if(previous===undefined)delete process.env.VERCEL;else process.env.VERCEL=previous;}
});

test('throttle failure and broken logging preserve 503; unexpected response exceptions remain unchanged',async()=>{
 const previous=process.env.VERCEL;delete process.env.VERCEL;
 try {
  const records=[];const guard=new RateLimiterGuard(new Reflector());guard.logger={warn:s=>records.push(JSON.parse(s))};
  const failure=sanitized(Object.assign(Error('private'),{code:'42501'}),'query','rollback_confirmed');
  guard.configure({transaction:async work=>work({query:async sql=>{if(sql.startsWith('INSERT'))throw failure;return [];}})});
  const req={path:'/api/news',method:'GET',headers:{},ip:'203.0.113.1',requestId:diagnosticId};
  await assert.rejects(guard.canActivate(context(req)),e=>e.getStatus()===503);
  assert.equal(records.length,1);assert.equal(records[0].operation,'throttle_upsert');assert.equal(records[0].phase,'query');
  assert.equal(records[0].error_code,'42501');assert.equal(records[0].transaction_outcome,'rollback_confirmed');
  guard.logger={warn(){throw Error('logger failed');}};await assert.rejects(guard.canActivate(context(req)),e=>e.getStatus()===503);
  records.length=0;guard.logger={warn:s=>records.push(JSON.parse(s))};guard.configure({transaction:async()=>undefined});
  await assert.rejects(guard.canActivate(context(req)),TypeError);
  assert.equal(records.length,1);assert.equal(records[0].reason,'unexpected_exception');assert.equal(records[0].phase,'response');
  assert.equal(records[0].transaction_outcome,'commit_confirmed');
 }finally {if(previous===undefined)delete process.env.VERCEL;else process.env.VERCEL=previous;}
});

test('audit failures correlate without subject leakage and still finish exactly once after persistence',async()=>{
 const audit=new AuditMiddleware();const diagnostics=[],legacy=[];let rejectWrite,ended=0,writes=0;
 audit.logger={log:s=>legacy.push(JSON.parse(s)),warn:s=>diagnostics.push(JSON.parse(s)),error:()=>{}};
 audit.database={transaction:async()=>{writes++;return new Promise((resolve,reject)=>{rejectWrite=reject;});}};
 const req={path:'/api/news',method:'GET',staff:{id:'synthetic-person'},requestId:diagnosticId,route:{path:'/api/news'},body:{password:'private'},query:{token:'private'}};
 const res={statusCode:503,end(){ended++;return this;}};audit.use(req,res,()=>{});res.end('private');res.end('private');
 assert.equal(ended,0);assert.equal(writes,1);
 rejectWrite(sanitized(Object.assign(Error('private'),{code:'42501'}),'query','rollback_confirmed'));
 await new Promise(r=>setImmediate(r));
 assert.equal(ended,1);assert.equal(diagnostics.length,1);assert.equal(diagnostics[0].component,'audit');
 assert.equal(diagnostics[0].request_id,diagnosticId);assert.equal(diagnostics[0].phase,'query');
 assert.equal(diagnostics[0].error_code,'42501');assert.equal(diagnostics[0].transaction_outcome,'rollback_confirmed');
 assert.ok(!JSON.stringify(diagnostics).includes('synthetic-person'));assert.ok(!JSON.stringify(diagnostics).includes('private'));
 assert.equal(legacy[0].actor_id,'synthetic-person');
 const success=new AuditMiddleware();success.database={transaction:async()=>{throw Error('successful GET must not audit');}};
 const ok={statusCode:200,end(){return this;}};success.use(req,ok,()=>{});ok.end();
});
test('Vercel edge IP must be one valid address; missing or ambiguous headers fail closed',()=>{
 const previous=process.env.VERCEL;process.env.VERCEL='1';
 try { assert.equal(clientIp({headers:{'x-forwarded-for':'203.0.113.1'},ip:'127.0.0.1'}),'203.0.113.1');
 for(const value of [undefined,'bad','1.2.3.4, 5.6.7.8',['1.2.3.4']])assert.throws(()=>clientIp({headers:{'x-forwarded-for':value}})); }
 finally { if(previous===undefined)delete process.env.VERCEL;else process.env.VERCEL=previous; }
});
test('rate limiter fails closed on shared-store outage and keeps liveness independent',async()=>{
 const guard=new RateLimiterGuard(new Reflector());guard.configure({transaction:async()=>{throw Error('secret');}});
 await assert.rejects(guard.canActivate(context({path:'/api/news',method:'GET',ip:'127.0.0.1',headers:{}})),e=>e.getStatus()===503 && !e.message.includes('secret'));
 assert.equal(await guard.canActivate(context({path:'/api/health'})),true);
});
test('audit waits before response completion and records live staff identity without query/body',async()=>{
 const audit=new AuditMiddleware();let release,event,ended=false;
 audit.persist=async value=>{event=value;await new Promise(r=>release=r);};
 const res={statusCode:403,end(){ended=true;return this;}};
 audit.use({path:'/api/admin/media',method:'POST',staff:{id:'staff-id'},requestId:'request-id',route:{path:'/api/admin/media'},body:{password:'secret'},query:{token:'secret'}},res,()=>{});
 res.end('denied');assert.equal(ended,false);assert.equal(event.actor_id,'staff-id');assert.ok(!JSON.stringify(event).includes('secret'));
 release();await new Promise(r=>setImmediate(r));assert.equal(ended,true);
});
test('production rejects missing storage and short signing secrets',()=>{
 const env={NODE_ENV:'production',DATABASE_URL:'postgresql://test@db.example/test',STAFF_AUTH_DATABASE_URL:'postgresql://test@db.example/test',MEDIA_DATABASE_URL:'postgresql://test@db.example/test',STAFF_AUTH_SECRET:'short',STAFF_AUTH_ORIGIN:'https://staff.example',ALLOWED_ORIGINS:'https://staff.example'};
 assert.throws(()=>validateEnvironment(env),/MEDIA_BUCKET/);
 for(const key of ['MEDIA_BUCKET','AWS_REGION','AWS_ACCESS_KEY_ID','AWS_SECRET_ACCESS_KEY','STAFF_MAIL_API_KEY','STAFF_MAIL_FROM'])env[key]='test';env.AWS_ENDPOINT_URL_S3='https://br-test.storage.c-1.ap-southeast-1.aws.neon.tech';
 assert.throws(()=>validateEnvironment(env),/STAFF_AUTH_SECRET/);
});

test('readiness rejects failures in each required dependency',async()=>{
 const {HealthController}=require('../dist/api/health/health.controller');
 const {NeonObjectStore}=require('../dist/storage/neon-object-store');
 const previous=NeonObjectStore.prototype.verifyPrivate;
 const saved={};for(const key of ['MEDIA_BUCKET','AWS_ENDPOINT_URL_S3','AWS_ACCESS_KEY_ID','AWS_SECRET_ACCESS_KEY','AWS_REGION'])saved[key]=process.env[key];
 Object.assign(process.env,{MEDIA_BUCKET:'test',AWS_ENDPOINT_URL_S3:'https://br-test.storage.c-1.ap-southeast-1.aws.neon.tech',AWS_ACCESS_KEY_ID:'test',AWS_SECRET_ACCESS_KEY:'test',AWS_REGION:'ap-southeast-1'});
 try {for(const failure of ['none','content','auth','media','storage']){
   const work=name=>async fn=>{if(failure===name)throw Error('unavailable');return fn({query:async()=>[]});};
   const health=new HealthController({query:work('content')});health.dependencies=[{transaction:work('auth')},{transaction:work('media')}];
   NeonObjectStore.prototype.verifyPrivate=async()=>{if(failure==='storage')throw Error('unavailable');};
   if(failure==='none')assert.equal((await health.ready()).status,'ok');else await assert.rejects(health.ready(),e=>e.getStatus()===503);
 }}finally {NeonObjectStore.prototype.verifyPrivate=previous;for(const [key,value]of Object.entries(saved)){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
});
