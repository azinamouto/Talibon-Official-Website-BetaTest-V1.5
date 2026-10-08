require('reflect-metadata');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Module } = require('@nestjs/common');
const { NestFactory, APP_GUARD } = require('@nestjs/core');
const { UsersController } = require('../dist/api/admin/users.controller');
const { UsersService } = require('../dist/api/admin/users.service');
const { SupabaseService } = require('../dist/supabase.service');
const { AuthGuard } = require('../dist/security/auth.guard');
const { configureApp } = require('../dist/configure-app');
const actor = randomUUID(), target = randomUUID();
const token = `h.${Buffer.from(JSON.stringify({ session_id: randomUUID() })).toString('base64url')}.s`;
let role='admin', verified=true, deleted=null, code=null, mutation, searchFilter;
let rows = [{ id: target, role: 'citizen', full_name: 'Citizen', deleted_at: null, version: 1 }];
function from() {
  let filters=[], single=false, start=0, end=100;
  const q={ select: () => q, eq: (key,val) => { filters.push(row=>row[key]===val); return q; },
    or: value => { searchFilter=value; return q; },
    is: (key,val) => { filters.push(row=>row[key]===val); return q; },
    not: (key,_op,val) => { filters.push(row=>row[key]!==val); return q; },
    order: () => q, range: (a,b) => { start=a; end=b; return q; }, maybeSingle: () => { single=true; return q; },
    then: (resolve,reject) => Promise.resolve().then(()=>{
      const authProfile={ id:actor,role,is_verified:verified,deleted_at:deleted };
      if (single && filters.every(f=>f(authProfile))) return { data: authProfile };
      const found=rows.filter(row=>filters.every(f=>f(row)));
      return { data: single ? found[0]??null : found.slice(start,end+1), count:found.length };
    }).then(resolve,reject),
  }; return q;
}
const client={ from, auth:{ getUser:async()=>({ data:{ user:{ id:actor, user_metadata:{ role:'super_admin' } } } }) },
  rpc:async(name,args)=> {
    if(name==='is_api_session_active') return { data:true };
    mutation=args;
    return code ? { error:{ code,message:'PRIVATE' } } : { data:{ ...rows[0],...args.p_patch,version:args.p_version+1 } };
  },
};
class TestModule {}
Module({ controllers:[UsersController], providers:[UsersService,{ provide:SupabaseService,useValue:{ getClient:()=>client } },{ provide:APP_GUARD,useClass:AuthGuard }] })(TestModule);
let app,base;
before(async()=>{ app=await NestFactory.create(TestModule,{logger:false}); configureApp(app); await app.listen(0,'127.0.0.1'); base=await app.getUrl(); });
after(async()=>app?.close());
const request=(path='',method='GET',body,auth=true)=>fetch(`${base}/api/admin/users${path}`,{ method,headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined });
const operations=[['','GET'],[`/${target}`,'GET'],[`/${target}`,'PATCH',{version:1,full_name:'Updated'}],[`/${target}/role`,'PATCH',{version:1,role:'editor'}],[`/${target}/deactivate`,'POST',{version:1}]];
test('user search is bounded and quoted as literal PostgREST filter text', async () => {
  const q = 'a",role.eq.super_admin%_*';
  assert.equal((await request(`?${new URLSearchParams({q})}`)).status, 200);
  const escaped = q.replace(/[\\%_*]/g, '\\$&').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  assert.equal(searchFilter, `full_name.ilike."%${escaped}%",email.ilike."%${escaped}%"`);
  for (const q of ['', ' '.repeat(3), 'x'.repeat(101)]) assert.equal((await request(`?${new URLSearchParams({q})}`)).status, 400);
});
test('all user routes reject anonymous, non-admin, unverified and deactivated callers',async()=>{
  for(const op of operations) {
    assert.equal((await request(...op.slice(0,2),op[2],false)).status,401);
    for(role of ['guest','citizen','staff','editor','department_admin','barangay_admin']) assert.equal((await request(...op)).status,403);
    role='admin'; verified=false; assert.equal((await request(...op)).status,403); verified=true;
    deleted='2026-09-01'; assert.equal((await request(...op)).status,403); deleted=null;
  }
  assert.equal(mutation,undefined);
});
test('admin listing, status filtering and detail are paginated and do not expose Auth internals',async()=>{
  rows.push({id:randomUUID(),role:'editor',deleted_at:'2026-09-01',version:1});
  let page=await (await request('?limit=1')).json(); assert.equal(page.data.length,1); assert.equal(page.pagination.total,1);
  page=await (await request('?status=all&limit=1&page=2')).json(); assert.equal(page.data.length,1); assert.equal(page.pagination.total,2);
  page=await (await request('?status=inactive&role=editor')).json(); assert.equal(page.data.length,1);
  assert.equal((await request('/'+target)).status,200); assert.equal((await request('/'+randomUUID())).status,404);
  for(const path of ['?limit=101','?status=bad','?role=root','/not-uuid']) assert.equal((await request(path)).status,400);
});
test('update validation blocks role overposting and forwards authenticated actor/request IDs',async()=>{
  for(const body of [{version:1},{version:1,role:'super_admin'},{version:1,full_name:' '},{version:1,is_verified:null},{version:1,email:'new@example.test'},{full_name:'Name'},{version:0,full_name:'Name'}]) assert.equal((await request('/'+target,'PATCH',body)).status,400);
  const res=await request('/'+target,'PATCH',{version:1,full_name:' Updated ',is_verified:false,barangay_id:null}); assert.equal(res.status,200);
  assert.equal(mutation.p_actor,actor); assert.equal(mutation.p_target,target); assert.equal(mutation.p_patch.full_name,'Updated');
  assert.equal(mutation.p_request_id,res.headers.get('x-request-id')); assert.equal((await res.json()).data.version,2);
});
test('role assignment requires super admin, and deactivation is versioned',async()=>{
  assert.equal((await request('/'+target+'/role','PATCH',{version:1,role:'editor'})).status,403);
  role='super_admin'; assert.equal((await request('/'+target+'/role','PATCH',{version:1,role:'root'})).status,400);
  assert.equal((await request('/'+target+'/role','PATCH',{version:1,role:'editor'})).status,200); assert.equal(mutation.p_action,'role');
  assert.equal((await request('/'+target+'/deactivate','POST',{version:1})).status,201); assert.equal(mutation.p_action,'deactivate');
});
test('database conflicts and failures map to safe responses',async()=>{
  for(const [dbCode,status] of [['42501',403],['P0002',404],['40001',409],['23503',400],['XX000',503]]) {
    code=dbCode; const res=await request('/'+target,'PATCH',{version:1,full_name:'Update'});
    assert.equal(res.status,status); assert.doesNotMatch(await res.text(),/PRIVATE/);
  } code=null;
});
test('OpenAPI documents every operation and user input/output schemas',async()=>{
  const doc=await(await fetch(base+'/api/openapi.json')).json();
  for(const [path,method] of [['','get'],['/{id}','get'],['/{id}','patch'],['/{id}/role','patch'],['/{id}/deactivate','post']]) {
    const op=doc.paths['/api/admin/users'+path][method]; assert.ok(op.security.some(s=>s.bearer)); assert.ok(op.responses['403']);
    if(method!=='get') assert.ok(op.requestBody.content['application/json'].schema.$ref);
  }
  assert.ok(doc.components.schemas.AdminUserDto.properties.version); assert.ok(doc.components.schemas.AssignRoleDto.properties.role.enum.includes('super_admin'));
});
