const {test}=require('node:test');
const assert=require('node:assert/strict');
const {AboutService}=require('../dist/api/about/about.service');
test('database-managed About endpoints stay empty while historical static pages remain available',async()=>{
 const service=new AboutService({list:async()=>({data:[]})});
 for(const method of Object.getOwnPropertyNames(AboutService.prototype).filter(x=>x.startsWith('get'))) {
   const value=await service[method]();
   if(['getMayors','getDepartments','getBarangays','getServices'].includes(method))assert.deepEqual(value,[]);
   else if(method==='getIndustry')assert.deepEqual(value,{});
   else assert.equal(typeof value.title,'string');
 }
 const failed=new AboutService({list:async()=>{throw new Error('unavailable');}});await assert.rejects(failed.getProfile(),/unavailable/);
});
