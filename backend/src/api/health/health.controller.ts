import { Controller, Get, Header, Inject, ServiceUnavailableException } from '@nestjs/common';
import { runtimeConnectionConfig, PostgresDatabase } from '../../database/postgres';
import { NeonObjectStore } from '../../storage/neon-object-store';
import { Public } from '../../security/auth.guard';
import { PublicContentService } from '../../database/public-content.service';

@Public()
@Controller('api/health')
export class HealthController {
  constructor(@Inject(PublicContentService) private readonly content: PublicContentService) {}

  private dependencies: PostgresDatabase[] = [];
  async onModuleDestroy() { await Promise.all(this.dependencies.map(db => db.close())); }

  @Get()
  @Header('Cache-Control', 'no-store')
  live() { return { status: 'ok', service: 'talibon-api' }; }

  @Get('ready')
  @Header('Cache-Control', 'no-store')
  async ready() {
    // Read a canonical table without fetching citizen data. Bound slow dependencies.
    try {
      if (!this.dependencies.length) this.dependencies = [process.env.STAFF_AUTH_DATABASE_URL, process.env.MEDIA_DATABASE_URL].map(url => new PostgresDatabase(runtimeConnectionConfig(url)));
      await Promise.all([
        this.content.query(async tx => { await tx.query('SELECT 1 FROM app.published_content LIMIT 1'); await tx.query('SELECT 1 FROM app.staff_auth_throttle LIMIT 1'); await tx.query('SELECT 1 FROM app.staff_auth_audit LIMIT 1'); }),
        this.dependencies[0].transaction(async tx => { await tx.query('SELECT 1 FROM public.r2_auth_session LIMIT 1'); await tx.query('SELECT 1 FROM app.staff_session_assurance LIMIT 1'); }, true),
        this.dependencies[1].transaction(async tx => { await tx.query('SELECT 1 FROM app.published_media LIMIT 1'); await tx.query('SELECT original_filename FROM app.media_assets LIMIT 1'); }, true),
        new NeonObjectStore().verifyPrivate(),
      ]);
      return { status: 'ok', service: 'talibon-api', database: 'reachable' };
    } catch {
      throw new ServiceUnavailableException('Readiness check failed.');
    }
  }
}
