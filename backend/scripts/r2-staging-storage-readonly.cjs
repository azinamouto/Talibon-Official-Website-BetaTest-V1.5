// GET-only storage qualification; credentials are supplied in memory, never persisted or logged.
const { NeonObjectStore } = require('../dist/storage/neon-object-store');
async function main() {
  const credential = JSON.parse(process.env.R2_AUDIT_STORAGE_CREDENTIAL || '{}');
  delete process.env.R2_AUDIT_STORAGE_CREDENTIAL;
  // Reveal returns secret fields only on some CLI versions. The caller retrieves
  // this existing ID with explicit project and branch flags; never mint a replacement.
  if ((credential.branch_id && credential.branch_id !== 'br-steep-sea-ao0qw05a') ||
      (credential.token_id && credential.token_id !== 'nak_live_c4e6291f5a4f474b8f876fa2e325322e') ||
      !credential.s3_secret_access_key) throw new Error('credential');
  const endpoint = 'https://br-steep-sea-ao0qw05a.storage.c-2.ap-southeast-1.aws.neon.tech';
  process.env.AWS_ACCESS_KEY_ID = 'nak_live_c4e6291f5a4f474b8f876fa2e325322e';
  process.env.AWS_SECRET_ACCESS_KEY = credential.s3_secret_access_key;
  process.env.AWS_ENDPOINT_URL_S3 = endpoint;
  process.env.AWS_REGION = 'ap-southeast-1';
  process.env.MEDIA_BUCKET = 'talgov-staging-media';
  let privacy;
  try { await new NeonObjectStore().verifyPrivate(); privacy = { status: 'pass' }; }
  catch (error) { privacy = { status: 'failed', code: String(error.name || 'unknown').replace(/[^a-zA-Z0-9_]/g, '').slice(0,80),
    http: error.$metadata?.httpStatusCode || null }; }
  const anonymous = await fetch(`${endpoint}/talgov-staging-media?list-type=2&max-keys=1`, {
    redirect: 'manual', signal: AbortSignal.timeout(10000),
  });
  await anonymous.body?.cancel();
  console.log(JSON.stringify({ applicationPrivateBucketCheck: privacy,
    anonymousListStatus: anonymous.status, anonymousListingDenied: anonymous.status === 403,
    scope: 'ACL/policy and anonymous list GETs only; no object contents read or objects written' }, null, 2));
  if (privacy.status !== 'pass' || anonymous.status !== 403) process.exitCode = 1;
}
main().catch(() => { console.error('Read-only storage audit failed; details suppressed.'); process.exitCode = 1; });
