require('reflect-metadata');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {deferredRoutes}=require('../dist/security/deferred-routes.middleware');
const {ContentService}=require('../dist/api/content/content.service');
function route(path,method) {let next=0,status;deferredRoutes({path,method},{setHeader(){},getHeader(){},status(value){status=value;return this;},json(){}},()=>next++);return {next,status};}
test('municipal authoring reaches its staff guard while legacy and deferred workflows remain 410',()=>{
 for(const path of ['/api/admin/content/news','/API//ADMIN/CONTENT/pages/','/api/admin/%63ontent/galleries'])for(const method of ['GET','POST','OPTIONS'])assert.equal(route(path,method).next,1);
 for(const path of ['/api/news/manage','/api/pages/manage/id','/api/services/manage','/api/payments','/api/forms/submissions'])for(const method of ['GET','POST','OPTIONS'])assert.equal(route(path,method).status,410);
 for(const kind of ['news','pages','services']){assert.equal(route('/api/'+kind,'GET').next,1);assert.equal(route('/api/'+kind,'POST').status,410);}
});
test('direct service calls cannot restore retired municipal kinds',async()=>{
 const service=new ContentService({});service.configure({save:()=>{throw Error('Must not run');}});
 for(const kind of ['services_cms','citizens_charter_cms','navigation','payments'])assert.throws(()=>service.save(kind,{}, {},'test'),e=>e.getStatus?.()===410);
});
