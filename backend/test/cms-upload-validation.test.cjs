require('reflect-metadata');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {plainToInstance}=require('class-transformer');
const {validateSync}=require('class-validator');
const sharp=require('sharp');
const {UploadDto}=require('../dist/api/media/media.dto');
const {MediaService,mediaView}=require('../dist/api/media/media.service');
const {validateFile,MAX_MEDIA_BYTES}=require('../dist/storage/file-validation');
const {CmsInputError,safeFieldErrors,dtoValidationException}=require('../dist/security/cms-validation');
const {CmsValidationError}=require('../dist/database/cms-validation');
const {sanitized}=require('../dist/database/postgres');
const {validateMunicipal}=require('../dist/api/content/municipal-schema');

test('upload DTO identifies missing/invalid UUIDs without echoing request values',()=>{
 const dto=plainToInstance(UploadDto,{title:'Fixture',description:'',altText:'',categoryId:'secret-invalid-category',sourceId:'invalid-source',uploadId:'invalid-upload',filename:'fixture.png',mime:'image/png',base64:'YQ=='});
 const response=dtoValidationException(validateSync(dto)).getResponse();
 assert.deepEqual(response.fieldErrors,{categoryId:'uuid',uploadId:'uuid',sourceId:'uuid'});
 assert.doesNotMatch(JSON.stringify(response),/secret-invalid-category|invalid-source|invalid-upload/);
 const extra=plainToInstance(UploadDto,{...dto,objectKey:'secret/path'});
 assert.equal(dtoValidationException(validateSync(extra,{whitelist:true,forbidNonWhitelisted:true})).getResponse().fieldErrors.request,'unsupported');
});
test('field error envelope is bounded and accepts only known codes and authoring fields',()=>{
 assert.deepEqual(safeFieldErrors({filename:'filename','attachments.3.altText':'photo_alt',password:'required',sourceId:'postgres password=secret',object_key:'invalid'}),{filename:'filename','attachments.3.altText':'photo_alt'});
 const error=new CmsValidationError({categoryId:'category_kind'});
 assert.equal(sanitized(error),error);
 assert.deepEqual(error.fields,{categoryId:'category_kind'});
});
test('file validation distinguishes filename, MIME, decoded size and parser failures',async()=>{
 const png=await sharp({create:{width:2,height:2,channels:3,background:'white'}}).png().toBuffer();
 const expected=(field,code)=>error=>error.getStatus()===400 && error.getResponse().fieldErrors[field]===code;
 await assert.rejects(validateFile('report (1).png','image/png',png),expected('filename','filename'));
 await assert.rejects(validateFile('report.png','application/pdf',png),expected('mime','file_type'));
 await assert.rejects(validateFile('report.png','image/png',Buffer.alloc(MAX_MEDIA_BYTES+1)),expected('file','file_size'));
 await assert.rejects(validateFile('report.png','image/png',png.subarray(0,15)),expected('file','file_content'));
 const jpg=await sharp(png).jpeg().toBuffer();
 assert.equal((await validateFile('report.jpg','image/jpeg',jpg)).kind,'photo');
});
test('canonical base64 and private-storage failures never reserve or publish a file',async()=>{
 const png=await sharp({create:{width:2,height:2,channels:3,background:'white'}}).png().toBuffer();
 let reserved=0,put=0;
 const service=new MediaService();service.configure({throttle:async()=>true,reserve:async()=>{reserved++;throw Error('unexpected reservation');}},
  {verifyPrivate:async()=>{throw Error('private storage verification failed');},put:async()=>{put++;},read:async()=>png});
 const input={title:'Fixture',description:'',altText:'Fixture image',categoryId:randomUUID(),sourceId:randomUUID(),uploadId:randomUUID(),filename:'fixture.png',mime:'image/png',base64:png.toString('base64')};
 await assert.rejects(service.upload({}, {...input,base64:input.base64+'\n'},'fixture'),error=>error.getStatus()===400 && error.getResponse().fieldErrors.base64==='base64');
 await assert.rejects(service.upload({},input,'fixture'),error=>error.getStatus()===503);
 assert.equal(reserved,0);assert.equal(put,0);
});
test('repository validation becomes a sanitized field-specific HTTP 400',async()=>{
 const service=new MediaService();service.configure({options:async()=>{throw new CmsValidationError({sourceId:'source_missing'});}},undefined);
 await assert.rejects(service.options({}),error=>error instanceof CmsInputError && error.getStatus()===400 && error.getResponse().fieldErrors.sourceId==='source_missing');
});

test('pending upload recovery is visible only to its creator and never reveals storage keys or staff IDs',()=>{
 const creator={id:randomUUID()},other={id:randomUUID()},uploadId=randomUUID();
 const row={id:randomUUID(),processing:'pending',publication:'draft',original_filename:'original.jpg',object_key:`assets/${creator.id}/${uploadId}`,created_by:creator.id,updated_by:creator.id};
 const own=mediaView(row,creator);assert.equal(own.can_resume,true);assert.equal(own.upload_id,uploadId);
 for(const key of ['object_key','created_by','updated_by'])assert.equal(own[key],undefined);
 const foreign=mediaView(row,other);assert.equal(foreign.can_resume,false);assert.equal(foreign.upload_id,undefined);
 assert.equal(mediaView({...row,processing:'ready'},creator).can_resume,false);
 assert.equal(mediaView({...row,original_filename:null},creator).can_resume,false);
});
test('content metadata and attachment errors identify the affected editable field',()=>{
 const input={title:'Fixture',slug:'fixture',sourceId:randomUUID(),body:{description:'Fixture',category:'official',year:'',attachments:[]}};
 assert.throws(()=>validateMunicipal('downloadables',input),error=>error.getResponse().fieldErrors.year==='invalid');
 input.body={description:'Fixture',category:'official',attachments:[{assetId:randomUUID(),caption:'',altText:''}]};
 assert.throws(()=>validateMunicipal('downloadables',input),error=>error.getResponse().fieldErrors['attachments.0.caption']==='required');
});
test('municipal metadata and chart errors preserve precise safe field paths',()=>{
 const input={title:'Fixture',slug:'fixture',sourceId:randomUUID(),body:{description:'Fixture',contact:'x'.repeat(501)}};
 assert.throws(()=>validateMunicipal('tourism_spots',input),error=>error.getResponse().fieldErrors.contact==='length');
 input.slug='executive-chart';input.body={mayor:{name:'',role:'Fixture role'},level2:[],departments:[]};
 assert.throws(()=>validateMunicipal('organizational_chart',input),error=>error.getResponse().fieldErrors['mayor.name']==='required');
 input.body.mayor.name='Fixture';input.body.departments=[{name:'Fixture department',role:''}];
 assert.throws(()=>validateMunicipal('organizational_chart',input),error=>error.getResponse().fieldErrors['departments.0.role']==='required');
 assert.deepEqual(safeFieldErrors({'mayor.password':'required','departments.100.role':'required','mayor.name':'required'}),{'mayor.name':'required'});
});
