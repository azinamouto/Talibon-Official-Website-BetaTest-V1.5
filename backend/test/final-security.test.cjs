const {test}=require('node:test');
const assert=require('node:assert/strict');
const {clientIp}=require('../dist/security/client-ip');
const {RateLimiterGuard}=require('../dist/security/rate-limiter.guard');
const {AuditMiddleware}=require('../dist/security/audit.middleware');
const {validateEnvironment}=require('../dist/config/environment');
const {Reflector}=require('@nestjs/core');
const context=(req,headers={})=>({getHandler:()=>function(){},getClass:()=>class{},switchToHttp:()=>({getRequest:()=>req,getResponse:()=>({setHeader:(k,v)=>headers[k]=v})})});
test('untrusted forwarding and internal IP headers cannot override socket identity',()=>{
 const previous=process.env.VERCEL; delete process.env.VERCEL;
 try { assert.equal(clientIp({ip:'::ffff:127.0.0.1',headers:{'x-forwarded-for':'1.2.3.4','x-talgov-client-ip':'5.6.7.8'}}),'127.0.0.1'); }
 finally { if(previous===undefined)delete process.env.VERCEL;else process.env.VERCEL=previous; }
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
