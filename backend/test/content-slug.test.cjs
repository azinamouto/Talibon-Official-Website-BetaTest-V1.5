const {test}=require('node:test');
const assert=require('node:assert/strict');
const {contentSlug}=require('../dist/api/content/content-slug');
test('generated slugs normalize titles, reserve existing addresses and stay bounded',async()=>{
 const calls=[];
 const tx={query:async(sql,values)=>{calls.push({sql,values});return sql.startsWith('SELECT slug')?[{slug:'fictional-news'},{slug:'fictional-news-2'}]:[];}};
 assert.equal(await contentSlug(tx,'news','Fictional News!'),'fictional-news-3');
 assert.match(calls[0].sql,/advisory_xact_lock/);
 assert.equal(calls[1].values[0],'news');
 assert.equal(await contentSlug(tx,'news','!!!'),'content');
 assert.ok((await contentSlug(tx,'news','a'.repeat(200))).length<=160);
});
