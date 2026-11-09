import { BadRequestException, ConflictException, ForbiddenException, HttpException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { StaffPrincipal } from '../../authentication/authentication.adapter';
import { runtimeConnectionConfig, DatabaseError, PostgresDatabase } from '../../database/postgres';
import { MediaRepository } from '../../database/media.repository';
import { NeonObjectStore, ObjectStore } from '../../storage/neon-object-store';
import { checksum, validateFile } from '../../storage/file-validation';
import { EditDto, UploadDto } from './media.dto';

export const mediaView = (row: Record<string, unknown>) => {
  const { object_key: _key, created_by: _creator, updated_by: _editor, ...safe } = row;
  return { ...safe, upload_id: typeof _key === 'string' && _key.startsWith('assets/') ? _key.split('/')[2] : undefined };
};
@Injectable()
export class MediaService {
  private database: PostgresDatabase;
  private repository: MediaRepository;
  private storage: ObjectStore;
  // Explicit injection seam for isolated integration tests; no public route can set dependencies.
  configure(repository: MediaRepository, storage: ObjectStore) { this.repository = repository; this.storage = storage; }
  private init() {
    if (!this.repository) {
      if (!process.env.MEDIA_DATABASE_URL) throw new ServiceUnavailableException('Media is not configured.');
      this.database = new PostgresDatabase(runtimeConnectionConfig(process.env.MEDIA_DATABASE_URL));
      this.repository = new MediaRepository(this.database);
    }
    this.storage ??= new NeonObjectStore();
  }
  async run<T>(fn: (repo: MediaRepository, store: ObjectStore) => Promise<T>): Promise<T> {
    try { this.init(); return await fn(this.repository,this.storage); }
    catch (error) {
      if (error instanceof HttpException) throw error;
      if (error instanceof DatabaseError) {
        if (error.code === 'conflict') throw new ConflictException('Media changed; refresh before retrying.');
        if (error.code === 'forbidden') throw new ForbiddenException('Staff access or fresh administrator MFA required.');
        if (error.code === 'invalid') throw new BadRequestException('Check metadata, category, source approval and publication requirements.');
      }
      throw new ServiceUnavailableException('Media operation could not be confirmed. Retry safely.');
    }
  }
  list(actor: StaffPrincipal, page: number) { return this.run(async repo => {
    const rows = await repo.listStaff(actor,page); return { data: rows.slice(0,50).map(mediaView), hasMore: rows.length > 50 };
  }); }
  listPublic(kind: string, page: number) { return this.run(async repo => {
    const rows = await repo.listPublic(kind,page);
    return { data: rows.slice(0,50).map(row => ({ ...row, download_url: `/api/media/${row.id}/download` })), hasMore: rows.length > 50 };
  }); }
  options(actor: StaffPrincipal) { return this.run(repo => repo.options(actor)); }
  upload(actor: StaffPrincipal, input: UploadDto, request: string) { return this.run(async (repo,store) => {
    if (!await repo.throttle(actor)) throw new HttpException('Upload limit reached. Retry in one minute.', 429);
    const bytes = Buffer.from(input.base64,'base64');
    if (bytes.toString('base64') !== input.base64) throw new BadRequestException('Invalid base64.');
    const file = await validateFile(input.filename,input.mime,bytes);
    await store.verifyPrivate();
    const row = await repo.reserve(actor,{ ...input,...file,objectKey: `assets/${actor.id}/${input.uploadId}` }, input.filename,request);
    if (row.processing === 'ready') return mediaView(row);
    // A pending row is a durable recovery record. Retries may only write the same bytes.
    await store.put(row.object_key,bytes,file.mime);
    if (checksum(await store.read(row.object_key)) !== file.sha256) throw new Error('Checksum mismatch');
    return mediaView(await repo.ready(actor,row.id,request));
  }); }
  change(actor: StaffPrincipal, id: string, version: number, action: string, input: EditDto | Record<string, never>, request: string) {
    return this.run(async (repo,store) => {
      if (action === 'publish') {
        await store.verifyPrivate();
        const row = await repo.get(id,actor); if (!row) throw new NotFoundException();
        if (checksum(await store.read(row.object_key)) !== row.sha256) throw new Error('Checksum mismatch');
      }
      return mediaView(await repo.change(actor,id,version,action,input,request));
    });
  }
  download(id: string, actor?: StaffPrincipal) { return this.run(async (repo,store) => {
    const row = await repo.get(id,actor); if (!row) throw new NotFoundException();
    await store.verifyPrivate();
    const bytes = await store.read(row.object_key);
    if (bytes.length !== Number(row.bytes) || checksum(bytes) !== row.sha256) throw new Error('Checksum mismatch');
    // Recheck after storage I/O: no new response after a completed unpublish/revocation.
    const current = await repo.get(id,actor); if (!current || current.version !== row.version) throw new NotFoundException();
    return { bytes, mime: row.mime as string, filename: row.original_filename as string || `download.${row.kind === 'document' ? 'pdf' : 'jpg'}` };
  }); }
  async onModuleDestroy() { await this.database?.close(); }
}
