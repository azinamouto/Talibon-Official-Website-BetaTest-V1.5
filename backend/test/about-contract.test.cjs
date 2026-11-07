const {test}=require('node:test');
const assert=require('node:assert/strict');
const {AboutService}=require('../dist/api/about/about.service');
test('About endpoints return honest empty states and propagate publication failures',async()=>{
 const service=new AboutService({list:async()=>({data:[]})});
 for(const method of Object.getOwnPropertyNames(AboutService.prototype).filter(x=>x.startsWith('get'))) {
   const value=await service[method]();assert.deepEqual(value,['getMayors','getDepartments','getBarangays','getServices'].includes(method)?[]:{});
 }
 const failed=new AboutService({list:async()=>{throw new Error('unavailable');}});await assert.rejects(failed.getProfile(),/unavailable/);
});
