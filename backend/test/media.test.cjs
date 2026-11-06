const { test } = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const { PDFDocument, PDFName, PDFString } = require('pdf-lib');
const { validateFile, MAX_MEDIA_BYTES, checksum } = require('../dist/storage/file-validation');
const { mediaMutation } = require('../dist/api/media/media.controller');
const { reconcile } = require('../scripts/r2-media-migrate.cjs');
const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path');
test('valid static photos and passive PDF pass full parsing', async () => {
  for (const [ext,mime] of [['png','image/png'],['jpeg','image/jpeg'],['webp','image/webp']]) {
    const bytes = await sharp({create:{width:2,height:2,channels:3,background:'white'}})[ext]().toBuffer();
    assert.equal((await validateFile(`test.${ext}`,mime,bytes)).sha256,checksum(bytes));
  }
  const pdf=await PDFDocument.create(); pdf.addPage();
  assert.equal((await validateFile('test.pdf','application/pdf',Buffer.from(await pdf.save()))).kind,'document');
});
test('reject unsafe filenames, MIME spoofing, oversized bytes, corrupt images and active PDF', async () => {
  const png=await sharp({create:{width:2,height:2,channels:3,background:'white'}}).png().toBuffer();
  for(const name of ['../test.png','a.svg','a.png.exe','a\r\n.png','a/b.png','a\\b.png','a..png']) await assert.rejects(validateFile(name,'image/png',png));
  await assert.rejects(validateFile('a.png','application/pdf',png));
  await assert.rejects(validateFile('a.png','image/png',png.subarray(0,20)));
  await assert.rejects(validateFile('a.pdf','application/pdf',Buffer.alloc(MAX_MEDIA_BYTES+1)));
  const pdf=await PDFDocument.create(); pdf.addPage(); pdf.catalog.set(PDFName.of('OpenAction'),pdf.context.obj({S:PDFName.of('JavaScript'),JS:PDFString.of('app.alert(1)')}));
  await assert.rejects(validateFile('a.pdf','application/pdf',Buffer.from(await pdf.save())));
});
test('media mutations require exact configured origin and JSON', () => {
  const old=process.env.STAFF_AUTH_ORIGIN; process.env.STAFF_AUTH_ORIGIN='https://staff.example.test';
  try {
    for(const origin of [undefined,'https://evil.test','null']) assert.throws(()=>mediaMutation({headers:{origin},is:()=>true}));
    assert.throws(()=>mediaMutation({headers:{origin:process.env.STAFF_AUTH_ORIGIN},is:()=>false}));
    mediaMutation({headers:{origin:process.env.STAFF_AUTH_ORIGIN},is:()=>true});
  } finally { if(old) process.env.STAFF_AUTH_ORIGIN=old; else delete process.env.STAFF_AUTH_ORIGIN; }
});
test('offline migration is repeatable, checksum reconciled and refuses overwrite/traversal', async () => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'r2-media-'));
  try {
    const bytes=await sharp({create:{width:2,height:2,channels:3,background:'white'}}).png().toBuffer(); fs.writeFileSync(path.join(root,'test.png'),bytes);
    const hash=checksum(bytes); const manifest=[{file:'test.png',key:`migration/${hash}`,sha256:hash,bytes:bytes.length,mime:'image/png'}];
    let value, writes=0; const store={verifyPrivate:async()=>{},read:async()=>{if(!value) throw Object.assign(new Error(),{name:'NoSuchKey'});return value;},put:async(_,b)=>{value=b;writes++;}};
    assert.equal((await reconcile(manifest,root))[0].status,'source-verified');
    assert.equal((await reconcile(manifest,root,store))[0].status,'missing'); assert.equal(writes,0);
    assert.equal((await reconcile(manifest,root,store,true))[0].status,'reconciled');
    await reconcile(manifest,root,store,true); assert.equal(writes,1);
    value=Buffer.from('conflict'); await assert.rejects(reconcile(manifest,root,store,true)); assert.equal(writes,1);
    await assert.rejects(reconcile([{...manifest[0],sha256:'a'.repeat(64)}],root));
    await assert.rejects(reconcile([{...manifest[0],file:'../missing.png'}],root));
  } finally { fs.rmSync(root,{recursive:true,force:true}); }
});
