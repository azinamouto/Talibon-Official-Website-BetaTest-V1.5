import { Inject, Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { Response, NextFunction } from 'express';
import { SupabaseService } from '../supabase.service';
import type { AuthenticatedRequest } from './authenticated-request';

@Injectable()
export class AuditMiddleware implements NestMiddleware {
  private readonly logger = new Logger('SecurityAudit');
  constructor(@Inject(SupabaseService) private readonly supabase: SupabaseService) {}

  use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    res.once('finish', () => {
      if (!req.path.startsWith('/api/auth') && ['GET', 'HEAD', 'OPTIONS'].includes(req.method) && res.statusCode < 400) return;
      const event = {
        request_id: req.requestId,
        actor_id: req.user?.id || null,
        method: req.method,
        // Route templates avoid persisting emails, tracking codes, tokens, or query strings.
        route: req.route?.path || 'unmatched',
        status_code: res.statusCode,
      };
      this.logger.log(JSON.stringify(event));
      void this.persist(event);
    });
    next();
  }

  private async persist(event: object) {
    try {
      const { error } = await this.supabase.getClient().from('security_audit_events').insert(event);
      if (error) this.logger.error('Audit persistence failed; retain structured platform logs.');
    } catch {
      this.logger.error('Audit persistence unavailable; retain structured platform logs.');
    }
  }
}
