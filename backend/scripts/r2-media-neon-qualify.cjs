// Only synthetic objects on the isolated Increment 4 branch. Never prints credentials.
const fs=require('node:fs'); const path=require('node:path'); const {randomUUID}=require('node:crypto');
const {parse}=require('dotenv'); const sharp=require('sharp');
const {S3Client,DeleteObjectCommand}=require('@aws-sdk/client-s3');
const {NeonObjectStore}=require('../dist/storage/neon-object-store');
const {checksum}=require('../dist/storage/file-validation');
const assert=require('node:assert/strict');
async function main() {
  const env=parse(fs.readFileSync(path.resolve(__dirname,'../../.env.media-qualification')));
  if(new URL(env.AWS_ENDPOINT_URL_S3).hostname.split('.')[0]!=='br-bold-art-aolg7usz') throw new Error('Wrong qualification branch');
  for(const [key,value] of Object.entries(env)) process.env[key]=value;
  process.env.MEDIA_BUCKET='talgov-media-r2';
  const store=new NeonObjectStore(); const key=`qualification/${randomUUID()}`;
  const client=new S3Client({endpoint:env.AWS_ENDPOINT_URL_S3,region:env.AWS_REGION,forcePathStyle:true,credentials:{accessKeyId:env.AWS_ACCESS_KEY_ID,secretAccessKey:env.AWS_SECRET_ACCESS_KEY}});
  let wrote=false;
  try {
    await store.verifyPrivate(); console.log('PASS private bucket ACL/policy verification');
    const bytes=await sharp({create:{width:2,height:2,channels:3,background:'white'}}).png().toBuffer();
    await store.put(key,bytes,'image/png');wrote=true;
    assert.equal(checksum(await store.read(key)),checksum(bytes));console.log('PASS SDK put/get SHA-256 round trip');
    const anonymous=await fetch(`${env.AWS_ENDPOINT_URL_S3.replace(/\/$/,'')}/talgov-media-r2/${key}`,{redirect:'manual'});
    assert.ok([401,403,404].includes(anonymous.status));console.log(`PASS anonymous read denied (${anonymous.status})`);
  } finally {
    if(wrote) {
      await client.send(new DeleteObjectCommand({Bucket:'talgov-media-r2',Key:key}));
      await assert.rejects(store.read(key));console.log('PASS synthetic object deletion confirmed');
    }
    client.destroy();
  }
}
main().catch(error=>{console.error(`Storage qualification failed: ${error.name || 'Error'}. No secrets emitted.`);process.exitCode=1;});
