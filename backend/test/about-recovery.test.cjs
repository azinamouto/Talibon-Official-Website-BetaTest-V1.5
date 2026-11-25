const test = require('node:test');
const assert = require('node:assert/strict');
const {PublicContentService} = require('../dist/database/public-content.service');
test('missing database objects use the bounded fallback through the deployed public service', async () => {
  const content = new PublicContentService();
  content.configure({transaction: async () => { throw Object.assign(new Error('missing relation'), {code:'42P01'}); }});
  const service = new AboutService(content);
  for (const [method, slug] of Object.entries(methods)) assert.deepEqual(await service[method](), staticAboutPages[slug]);
  await assert.rejects(service.getMayors(), ServiceUnavailableException);
});
const {ServiceUnavailableException, ForbiddenException} = require('@nestjs/common');
const {AboutService} = require('../dist/api/about/about.service');
const {staticAboutPages} = require('../dist/api/about/static-pages');
const methods = {getProfile:'about-profile',getSeal:'about-seal',getHistory:'about-history',getVicinityMap:'about-vicinity-map',getHymn:'about-hymn',getDemographics:'about-demographics',getLocation:'about-location'};
test('historical static pages survive empty publications and database outages', async () => {
  for (const [method,slug] of Object.entries(methods)) {
    for (const list of [async()=>({data:[]}),async()=>{throw new ServiceUnavailableException();}]) {
      const result=await new AboutService({list})[method]();
      assert.deepEqual(result,staticAboutPages[slug]);
      assert.notEqual(result,staticAboutPages[slug]);
    }
  }
});
test('published pages take precedence and authorization failures are not hidden',async()=>{
  const published={title:'Fictional published location',description:'Fixture',lat:0,lng:0};
  assert.equal(await new AboutService({list:async()=>({data:[published]})}).getLocation(),published);
  await assert.rejects(new AboutService({list:async()=>{throw new ForbiddenException();}}).getLocation(),ForbiddenException);
});
test('static fallback never fabricates database-managed officials or services',async()=>{
 const service=new AboutService({list:async()=>({data:[]})});
 for(const method of ['getMayors','getDepartments','getServices'])assert.deepEqual(await service[method](),[]);
});
