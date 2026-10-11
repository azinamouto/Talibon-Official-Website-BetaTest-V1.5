import { Controller, Get, Header, Inject, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '../../security/auth.guard';
import { SupabaseService } from '../../supabase.service';

@Public()
@Controller('api/health')
export class HealthController {
  constructor(@Inject(SupabaseService) private readonly supabase: SupabaseService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  live() { return { status: 'ok', service: 'talibon-api' }; }

  @Get('ready')
  @Header('Cache-Control', 'no-store')
  async ready() {
    // Read a canonical table without fetching citizen data. Bound slow dependencies.
    try {
      const { error } = await this.supabase.getClient().from('roles')
        .select('id', { head: true }).limit(1).abortSignal(AbortSignal.timeout(3000));
      if (error) throw error;
      return { status: 'ok', service: 'talibon-api', database: 'reachable' };
    } catch {
      throw new ServiceUnavailableException('Readiness check failed.');
    }
  }
}
