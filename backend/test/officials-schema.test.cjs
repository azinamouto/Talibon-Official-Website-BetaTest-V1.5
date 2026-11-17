const {test}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {validateOfficials}=require('../dist/api/content/officials-schema');
const {validateMunicipal}=require('../dist/api/content/municipal-schema');
const official=(patch={})=>({id:randomUUID(),name:'Fictional official',role:'Test position',office:'Fictional office',reportsTo:null,...patch});
test('chart relationships reject cycles, missing parents, duplicate identifiers and self references',()=>{
 const leader=official(),child=official({reportsTo:leader.id});
 assert.deepEqual(validateOfficials([leader,child],'nodes'),[]);
 for(const rows of [[{...leader,reportsTo:child.id},child],[official({reportsTo:randomUUID()})],[leader,leader],[{...leader,reportsTo:leader.id}]])assert.throws(()=>validateOfficials(rows,'nodes'));
});
test('new official photos must be linked attachments and new arbitrary image URLs are refused',()=>{
 const photo=randomUUID(),node=official({photoAssetId:photo});
 const input={title:'Fictional chart',slug:'executive-chart',sourceId:randomUUID(),body:{nodes:[node],attachments:[]}};
 assert.throws(()=>validateMunicipal('organizational_chart',input));
 input.body.attachments=[{assetId:photo,caption:'Fixture photo',altText:'Fictional portrait'}];
 assert.deepEqual(validateMunicipal('organizational_chart',input).assetIds,[photo]);
 assert.throws(()=>validateOfficials([official({image_url:'https://example.invalid/new.jpg'})],'nodes'));
});
test('imported portraits can only retain previously verified URLs',()=>{
 const image='https://example.invalid/verified-fixture.jpg';
 assert.deepEqual(validateOfficials([official({image_url:image})],'nodes',{mayor:{image_url:image}}),[]);
 assert.throws(()=>validateOfficials([official({image_url:image+'?changed'})],'nodes',{mayor:{image_url:image}}));
});
test('official arrays and event times remain bounded and strictly validated',()=>{
 assert.throws(()=>validateOfficials(Array.from({length:101},()=>official()),'nodes'));
 const input={title:'Fictional event',slug:'fictional-event',sourceId:randomUUID(),body:{description:'Test event',category:'event',date:'2026-11-17',start_time:'09:00',end_time:'08:00'}};
 assert.throws(()=>validateMunicipal('events',input));
 input.body.end_time='10:00';assert.doesNotThrow(()=>validateMunicipal('events',input));
});
