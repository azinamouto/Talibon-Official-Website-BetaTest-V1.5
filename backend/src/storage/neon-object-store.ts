import { S3Client, GetObjectCommand, PutObjectCommand, GetBucketAclCommand, GetBucketPolicyCommand } from '@aws-sdk/client-s3';
import { ServiceUnavailableException } from '@nestjs/common';
import { MAX_MEDIA_BYTES, checksum } from './file-validation';

export interface ObjectStore { verifyPrivate(): Promise<void>; put(key: string, bytes: Buffer, mime: string): Promise<void>; read(key: string): Promise<Buffer>; }
export class NeonObjectStore implements ObjectStore {
  private readonly client: S3Client;
  constructor(private readonly bucket = process.env.MEDIA_BUCKET) {
    const endpoint = new URL(process.env.AWS_ENDPOINT_URL_S3 || 'https://invalid');
    if (endpoint.protocol !== 'https:' || !/^br-[a-z0-9-]+\.storage\.c-\d+\.(us-east-1|us-east-2|eu-central-1|ap-southeast-1)\.aws\.neon\.tech$/.test(endpoint.hostname) || endpoint.username || endpoint.password || endpoint.search || endpoint.pathname !== '/' || !bucket || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) throw new ServiceUnavailableException('Media storage is not configured.');
    this.client = new S3Client({ endpoint: endpoint.origin, region: process.env.AWS_REGION, forcePathStyle: true,
      credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY }, maxAttempts: 2 });
  }
  async verifyPrivate() {
    // Reject public grants and any policy. Unknown/unsupported security state fails closed.
    const acl = await this.client.send(new GetBucketAclCommand({ Bucket: this.bucket }), { abortSignal: AbortSignal.timeout(10000) });
    if (!acl.Owner?.ID || !acl.Grants?.length || acl.Grants.some(g => g.Grantee?.Type !== 'CanonicalUser' || g.Grantee.ID !== acl.Owner.ID)) throw new Error('Bucket privacy unverified');
    try {
      const policy = await this.client.send(new GetBucketPolicyCommand({ Bucket: this.bucket }), { abortSignal: AbortSignal.timeout(10000) });
      if (policy.Policy && JSON.parse(policy.Policy).Statement?.length) throw new Error('Bucket policy unverified');
    } catch (error) { if ((error as { name?: string }).name !== 'NoSuchBucketPolicy') throw error; }
  }
  async put(key: string, bytes: Buffer, mime: string) {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: bytes, ContentType: mime,
      CacheControl: 'private, no-store', ContentDisposition: 'attachment', Metadata: { sha256: checksum(bytes) } }), { abortSignal: AbortSignal.timeout(15000) });
  }
  async read(key: string) {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }), { abortSignal: AbortSignal.timeout(15000) });
    if (!result.Body || !result.ContentLength || result.ContentLength > MAX_MEDIA_BYTES) { (result.Body as unknown as { destroy?: () => void })?.destroy?.(); throw new Error('Invalid stored file'); }
    const chunks: Buffer[] = []; let size = 0;
    for await (const chunk of result.Body as unknown as AsyncIterable<Uint8Array>) {
      size += chunk.length; if (size > MAX_MEDIA_BYTES) throw new Error('Invalid stored file'); chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
}
