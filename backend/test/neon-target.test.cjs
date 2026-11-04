const { test } = require('node:test');
const assert = require('node:assert/strict');
const { target, validateMetadata, neonConfig } = require('../scripts/r2-neon-target.cjs');
test('hosted writes reject parent, another project, default branch and endpoint substitution', () => {
  const p={id:target.project,org_id:'org-patient-mud-50407342',region_id:target.region,pg_version:18};
  const b={id:target.branch,project_id:target.project,name:target.name,parent_id:target.parent,default:false,primary:false};
  const e={id:target.endpoint,branch_id:target.branch,project_id:target.project,host:target.host,type:'read_write'};
  validateMetadata(p,b,e);
  for (const patch of [{id:'wrong'},{org_id:'wrong'},{region_id:'wrong'},{pg_version:16}]) assert.throws(()=>validateMetadata({...p,...patch},b,e));
  for (const patch of [{id:target.parent},{project_id:'wrong'},{name:'main'},{default:true},{primary:true},{parent_id:'wrong'}]) assert.throws(()=>validateMetadata(p,{...b,...patch},e));
  for (const patch of [{id:'wrong'},{branch_id:target.parent},{host:'wrong'},{project_id:'wrong'},{type:'read_only'}]) assert.throws(()=>validateMetadata(p,b,{...e,...patch}));
});
test('hosted URL guard rejects arbitrary hosts, pooler migrations, database names and missing security requirements', () => {
  const base=`postgresql://synthetic:synthetic@${target.host}/neondb?sslmode=require&channel_binding=require`;
  assert.equal(neonConfig(base).ssl.rejectUnauthorized,true);
  for (const url of [base.replace(target.host,'localhost'),base.replace(target.host,'ep-rapid-lake-aoff43mq.c-2.ap-southeast-1.aws.neon.tech'),
    base.replace('.c-2.','-pooler.c-2.'),base.replace('/neondb','/production'),base.replace('&channel_binding=require',''),
    base.replace('sslmode=require','sslmode=disable'),base.replace('synthetic:synthetic','synthetic'),base.replace('/neondb',':5433/neondb')]) assert.throws(()=>neonConfig(url));
});
