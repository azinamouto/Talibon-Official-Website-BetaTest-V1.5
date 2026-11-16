require('reflect-metadata');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {deferredRoutes}=require('../dist/security/deferred-routes.middleware');
const {ContentService}=require('../dist/api/content/content.service');
function route(path,method) {
 let next=0,status,body;const headers={};
 deferredRoutes({path,method},{setHeader:(k,v)=>headers[k]=v,getHeader:k=>headers[k],status(value){status=value;return this;},json(value){body=value;}},()=>next++);
 return {next,status,body,headers};
}
test('normalized text CMS paths remain closed for every HTTP method',()=>{
 for(const path of ['/api/admin/content','/API//ADMIN/CONTENT/news/','/api/admin/%63ontent/pages','/api/news/manage','/api/pages/manage/id','/api/services/manage'])
  for(const method of ['GET','HEAD','POST','PATCH','PUT','DELETE','OPTIONS']) assert.equal(route(path,method).status,410);
});
test('public content GET and HEAD remain available while all writes are deferred',()=>{
 for(const kind of ['news','pages','services']) for(const tail of ['', '/00000000-0000-4000-8000-000000000000']) {
  for(const method of ['GET','HEAD']) assert.equal(route('/api/'+kind+tail,method).next,1);
  assert.equal(route('/api/'+kind+tail,'OPTIONS').next,1);
  for(const method of ['POST','PUT','PATCH','DELETE']) assert.equal(route('/api/'+kind+tail,method).status,410);
 }
});
test('media, staff authentication and public catalog keep their existing guards',()=>{
 for(const path of ['/api/admin/media/uploads','/api/admin/media/id/publish','/api/staff-auth/sign-in/email','/api/public-content/news']) assert.equal(route(path,'POST').next,1);
});
test('direct content service calls reject before repository or database work',async()=>{
 const service=new ContentService({list:()=>{throw Error('Not a public read');}});let calls=0;
 service.configure(new Proxy({}, {get(){calls++;throw Error('Repository must not be used');}}));
 const actor={role:'admin'};
 for(const work of [()=>service.manage('news',{page:1,limit:10},actor),()=>service.save('news',{},actor,'test'),()=>service.remove('news','id',1,actor,'test'),()=>service.create('news',{},actor,'test'),()=>service.update('news','id',{},actor,'test')])
  await assert.rejects(work(),error=>error.getStatus?.()===410);
 assert.equal(calls,0);
});
test('deferral returns a bounded no-store error without supplied data',()=>{
 const result=route('/api/admin/content/news','POST');
 assert.equal(result.next,0);assert.equal(result.headers['Cache-Control'],'no-store');
 assert.equal(result.body.message,'CMS authoring is limited to photos and documents.');assert.equal(result.body.error,'Gone');
});
