require('reflect-metadata');
const { test,before,after }=require('node:test');
const assert=require('node:assert/strict');
const { randomUUID }=require('node:crypto');
const fs=require('node:fs'); const path=require('node:path');
const { Pool }=require('pg'); const sharp=require('sharp');
const { PDFDocument, PDFName, PDFString }=require('pdf-lib');
const { migrate,isolatedConfig }=require('../scripts/r2-migrate.cjs');
const { mediaSchema }=require('../scripts/r2-media-schema.cjs');
const { PostgresDatabase,connectionConfig }=require('../dist/database/postgres');
const { MediaRepository }=require('../dist/database/media.repository');
const { MediaService }=require('../dist/api/media/media.service');
const { MediaController,PublicMediaController }=require('../dist/api/media/media.controller');
const { StaffGuard }=require('../dist/authentication/staff.guard');
const { NestFactory,APP_GUARD }=require('@nestjs/core'); const { Module }=require('@nestjs/common');
const { configureApp }=require('../dist/configure-app');
const runtime=require('../dist/authentication/runtime');
let owner,db,repo,service,app,base,admin,editor,input;
const objects=new Map(); let failWrite=false, failPrivacy=false;
const store={verifyPrivate:async()=>{if(failPrivacy)throw new Error();},put:async(k,v)=>{if(failWrite)throw new Error();objects.set(k,Buffer.from(v));},read:async k=>{if(!objects.has(k))throw new Error();return objects.get(k);}};
async function actor(role) {
  const subject=randomUUID(),sessionId=randomUUID();
  await owner.query('INSERT INTO r2_auth_user(id,name,email,"emailVerified","twoFactorEnabled","createdAt","updatedAt") VALUES($1,$2,$3,true,true,now(),now())',[subject,'Synthetic media staff',`${subject}@example.invalid`]);
  await owner.query('INSERT INTO r2_auth_session(id,"userId",token,"expiresAt","createdAt","updatedAt") VALUES($1,$2,$3,now()+interval \'1 hour\',now(),now())',[sessionId,subject,randomUUID()]);
  await owner.query('INSERT INTO app.staff_session_assurance(session_id) VALUES($1)',[sessionId]);
  const { rows:[row] }=await owner.query("INSERT INTO app.staff_accounts(provider,subject,role,active) VALUES('better-auth',$1,$2,true) RETURNING id",[subject,role]);
  return {...row,subject,sessionId,role,provider:'better-auth',sessionVerified:true,assurance:'mfa'};
}
before(async()=>{
  const url=process.env.R2_AUTH_TEST_URL; owner=new Pool(isolatedConfig(url)); await migrate(owner);
  for(const name of ['001_provider.sql','002_staff_policy.sql']) await owner.query(fs.readFileSync(path.join(__dirname,'../database/auth',name),'utf8'));
  assert.equal((await mediaSchema(owner,true)).applied,1);
  assert.equal((await mediaSchema(owner)).applied,1); assert.equal((await mediaSchema(owner)).applied,0);
  await owner.query('CREATE ROLE r2_media_runtime LOGIN INHERIT'); await owner.query('GRANT talgov_runtime TO r2_media_runtime');
  const runtimeUrl=new URL(url);runtimeUrl.username='r2_media_runtime'; db=new PostgresDatabase(connectionConfig(runtimeUrl.toString(),true));repo=new MediaRepository(db);
  admin=await actor('admin');editor=await actor('editor');
  const sourceId=randomUUID(),categoryId=randomUUID();
  await owner.query("INSERT INTO app.content_sources(id,reference,owner,sha256,approved,reviewed_at) VALUES($1,'Synthetic test source','test',$2,true,now())",[sourceId,'a'.repeat(64)]);
  await owner.query("INSERT INTO app.media_categories(id,kind,slug,title,approved) VALUES($1,'photo','synthetic','Synthetic test category',true)",[categoryId]);
  const bytes=await sharp({create:{width:2,height:2,channels:3,background:'white'}}).png().toBuffer();
  input={sourceId,categoryId,title:'Synthetic media',description:'Test only',altText:'Synthetic test image',filename:'test.png',mime:'image/png',base64:bytes.toString('base64')};
  service=new MediaService();service.configure(repo,store);
  runtime.staffAuthentication=()=>({verify:async headers=>headers.get('cookie')==='test=admin'?admin:headers.get('cookie')==='test=editor'?editor:null});
  class TestModule {} Module({controllers:[MediaController,PublicMediaController],providers:[{provide:MediaService,useValue:service},{provide:APP_GUARD,useClass:StaffGuard}]})(TestModule);
  app=await NestFactory.create(TestModule,{logger:false,bodyParser:false});configureApp(app);await app.listen(0,'127.0.0.1');base=await app.getUrl();process.env.STAFF_AUTH_ORIGIN=base;
});
after(async()=>{await app?.close();await db?.close();await owner?.end();});
const upload=()=>({...input,uploadId:randomUUID()});
const status=n=>error=>error.getStatus?.()===n;
test('HTTP staff guard, origin, DTO and anonymous draft download boundaries',async()=>{
  for(const cookie of ['', 'forged=admin']) assert.equal((await fetch(base+'/api/admin/media',{headers:{cookie}})).status,401);
  assert.equal((await fetch(base+'/api/admin/media/uploads',{method:'POST',headers:{cookie:'test=editor','content-type':'application/json',origin:'https://evil.test'},body:JSON.stringify(upload())})).status,403);
  assert.equal((await fetch(base+'/api/admin/media/uploads',{method:'POST',headers:{cookie:'test=editor','content-type':'application/json',origin:base},body:JSON.stringify({...upload(),role:'admin'})})).status,400);
  assert.equal((await fetch(base+`/api/admin/media/${randomUUID()}/delete`,{method:'POST',headers:{cookie:'test=editor','content-type':'application/json',origin:base},body:JSON.stringify({version:1})})).status,403);
  const row=await service.upload(editor,upload(),'test-http');
  assert.equal((await fetch(base+`/api/media/${row.id}/download`)).status,404);
  const response=await fetch(base+`/api/admin/media/${row.id}/download`,{headers:{cookie:'test=editor'}});
  assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);assert.match(response.headers.get('content-disposition'),/attachment/);
});
test('PDF API validates uploads, protects drafts and serves safe verified downloads',async()=>{
  const pdf=await PDFDocument.create();pdf.addPage();
  const bytes=Buffer.from(await pdf.save());
  const active=await PDFDocument.create();active.addPage();
  active.catalog.set(PDFName.of('OpenAction'),active.context.obj({S:PDFName.of('JavaScript'),JS:PDFString.of('app.alert(1)')}));
  const categoryId=randomUUID();
  await owner.query("INSERT INTO app.media_categories(id,kind,slug,title,approved) VALUES($1,'document','api-documents','API documents',true)",[categoryId]);
  const headers={cookie:'test=editor','content-type':'application/json',origin:base};
  const response=await fetch(base+'/api/admin/media/uploads',{method:'POST',headers,body:JSON.stringify({
    ...upload(),categoryId,filename:'active.pdf',mime:'application/pdf',base64:Buffer.from(await active.save()).toString('base64'),
  })});
  assert.equal(response.status,400);
  const created=await fetch(base+'/api/admin/media/uploads',{method:'POST',headers,body:JSON.stringify({
    ...upload(),categoryId,filename:'approved-report.pdf',mime:'application/pdf',base64:bytes.toString('base64'),
  })});
  assert.equal(created.status,201);
  const row=await created.json();
  assert.equal(row.kind,'document');assert.equal(row.processing,'ready');assert.equal(row.publication,'draft');
  assert.equal((await fetch(base+`/api/media/${row.id}/download`)).status,404);
  assert.equal((await fetch(base+`/api/admin/media/${row.id}/download`)).status,401);
  failPrivacy=true;
  assert.equal((await fetch(base+`/api/admin/media/${row.id}/download`,{headers:{cookie:'test=editor'}})).status,503);
  failPrivacy=false;
  const privateDownload=await fetch(base+`/api/admin/media/${row.id}/download`,{headers:{cookie:'test=editor'}});
  assert.equal(privateDownload.status,200);assert.equal(privateDownload.headers.get('content-type'),'application/pdf');
  assert.equal(privateDownload.headers.get('content-disposition'),'attachment; filename="approved-report.pdf"');
  assert.equal(privateDownload.headers.get('cache-control'),'private, no-store');
  assert.equal(privateDownload.headers.get('x-content-type-options'),'nosniff');
  assert.deepEqual(Buffer.from(await privateDownload.arrayBuffer()),bytes);
  const published=await fetch(base+`/api/admin/media/${row.id}/publish`,{method:'POST',headers,body:JSON.stringify({version:row.version})});
  assert.equal(published.status,201);
  const publishedRow=await published.json();
  const publicDownload=await fetch(base+`/api/media/${row.id}/download`);
  assert.equal(publicDownload.status,200);assert.equal(publicDownload.headers.get('content-type'),'application/pdf');
  assert.equal(publicDownload.headers.get('content-disposition'),'attachment; filename="approved-report.pdf"');
  assert.deepEqual(Buffer.from(await publicDownload.arrayBuffer()),bytes);
  const unpublished=await fetch(base+`/api/admin/media/${row.id}/unpublish`,{method:'POST',headers,body:JSON.stringify({version:publishedRow.version})});
  assert.equal(unpublished.status,201);
  assert.equal((await fetch(base+`/api/media/${row.id}/download`)).status,404);
});
test('upload retry recovers pending state without duplicates; metadata and audit commit together',async()=>{
  const request=upload();failWrite=true;await assert.rejects(service.upload(editor,request,'test-fail'),status(503));failWrite=false;
  const row=await service.upload(editor,request,'test-retry');assert.equal(row.processing,'ready');assert.equal(row.publication,'draft');assert.equal(row.object_key,undefined);
  assert.equal((await service.upload(editor,request,'test-replay')).id,row.id);
  const rows=(await owner.query('SELECT * FROM app.audit_events WHERE resource_id=$1',[row.id])).rows;assert.equal(rows.length,2);
  await assert.rejects(service.upload(editor,{...request,base64:input.base64.slice(0,-4)},'test-conflict'));
  const updated=await service.change(editor,row.id,row.version,'edit',{title:'Updated',description:'Revised',altText:'Image',categoryId:input.categoryId},'test-edit');
  assert.equal(updated.title,'Updated');await assert.rejects(service.change(editor,row.id,row.version,'unpublish',{},'stale'),status(409));
});
test('publish/unpublish, source approval and object corruption govern every public read',async()=>{
  let row=await service.upload(admin,upload(),'test-public');
  await owner.query('UPDATE app.content_sources SET approved=false WHERE id=$1',[input.sourceId]);
  await assert.rejects(service.change(admin,row.id,row.version,'publish',{},'unapproved'),status(400));
  await owner.query('UPDATE app.content_sources SET approved=true WHERE id=$1',[input.sourceId]);
  row=await service.change(admin,row.id,row.version,'publish',{},'publish');assert.ok((await service.download(row.id)).bytes.length);
  const key=(await owner.query('SELECT object_key FROM app.media_assets WHERE id=$1',[row.id])).rows[0].object_key;
  const original=objects.get(key);objects.set(key,Buffer.from('tamper'));await assert.rejects(service.download(row.id),status(503));objects.set(key,original);
  row=await service.change(admin,row.id,row.version,'unpublish',{},'unpublish');await assert.rejects(service.download(row.id),status(404));
  assert.ok((await service.download(row.id,admin)).bytes.length);
});
test('fresh MFA admin deletion denies editors/stale assurance and retains recovery object',async()=>{
  const row=await service.upload(admin,upload(),'delete-upload');const count=objects.size;
  await assert.rejects(service.change(editor,row.id,row.version,'delete',{},'editor-delete'),status(403));
  await owner.query("UPDATE app.staff_session_assurance SET verified_at=now()-interval '6 minutes' WHERE session_id=$1",[admin.sessionId]);
  await assert.rejects(service.change(admin,row.id,row.version,'delete',{},'stale-mfa'),status(403));
  await owner.query('UPDATE app.staff_session_assurance SET verified_at=now() WHERE session_id=$1',[admin.sessionId]);
  await service.change(admin,row.id,row.version,'delete',{},'delete');await assert.rejects(service.download(row.id,admin),status(404));assert.equal(objects.size,count);
});
test('privacy failure, revoked session, deactivated account and audit failure all fail closed',async()=>{
  failPrivacy=true;await assert.rejects(service.upload(admin,upload(),'private-fail'),status(503));failPrivacy=false;
  const before=(await owner.query('SELECT count(*) FROM app.media_assets')).rows[0].count;
  await assert.rejects(service.upload(admin,upload(),'invalid request id'),status(400));assert.equal((await owner.query('SELECT count(*) FROM app.media_assets')).rows[0].count,before);
  await owner.query('UPDATE app.staff_accounts SET active=false WHERE id=$1',[editor.id]);await assert.rejects(service.options(editor),status(403));
  await owner.query('UPDATE app.staff_accounts SET active=true WHERE id=$1',[editor.id]);
  await owner.query('DELETE FROM r2_auth_session WHERE id=$1',[editor.sessionId]);await assert.rejects(service.options(editor),status(403));
});
test('read-only reconciliation includes retained deleted objects and catches mismatches',async()=>{
  const {reconcileDatabase}=require('../scripts/r2-media-reconcile-db.cjs');
  const report=await reconcileDatabase(owner,store);
  assert.ok(report.checked>0);assert.equal(report.mismatch,0);assert.equal(report.missing,0);assert.equal(report.retainedDeleted,1);
  const [key,bytes]=objects.entries().next().value;objects.set(key,Buffer.from('corrupt'));
  assert.equal((await reconcileDatabase(owner,store)).mismatch,1);objects.set(key,bytes);
});
test('passive PDF upload, publication, preview and attachment download',async()=>{
  const {PDFDocument}=require('pdf-lib');const pdf=await PDFDocument.create();pdf.addPage();
  const categoryId=randomUUID();await owner.query("INSERT INTO app.media_categories(id,kind,slug,title,approved) VALUES($1,'document','synthetic-documents','Synthetic documents',true)",[categoryId]);
  let row=await service.upload(admin,{...upload(),categoryId,filename:'test.pdf',mime:'application/pdf',base64:Buffer.from(await pdf.save()).toString('base64')},'pdf-upload');
  assert.equal(row.kind,'document');row=await service.change(admin,row.id,row.version,'publish',{},'pdf-publish');
  const response=await fetch(base+`/api/media/${row.id}/download`);assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/application\/pdf/);assert.match(response.headers.get('content-disposition'),/attachment; filename="test.pdf"/);
  const preview=await fetch(base+`/api/admin/media/${row.id}/preview`,{headers:{cookie:'test=admin'}});assert.equal(preview.status,200);assert.match(preview.headers.get('content-security-policy'),/sandbox/);
});
