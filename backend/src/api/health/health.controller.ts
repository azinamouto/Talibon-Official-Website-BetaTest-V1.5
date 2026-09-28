import { Controller, Get, Header, Inject, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '../../security/auth.guard';
import { SupabaseService } from '../../supabase.service';

@Public()
@Controller('api/health')
export class HealthController {
  constructor(@Inject(SupabaseService) private readonly supabase: SupabaseService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  @Header('Cache-Control', 'no-store')
  async ready() {
    try {
      // Probe a small canonical table without returning its contents or provider errors.
      const { error } = await this.supabase.getClient().from('roles').select('id')
        .limit(1).abortSignal(AbortSignal.timeout(3000));
      if (error) throw new Error('Dependency unavailable');
      return { status: 'ok', checks: { database: 'ok' } };
    } catch {
      throw new ServiceUnavailableException('Database readiness check failed.');
    }
  }
}
