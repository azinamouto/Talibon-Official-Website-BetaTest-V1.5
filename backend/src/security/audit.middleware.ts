import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { Response, NextFunction } from 'express';
import { runtimeConnectionConfig, PostgresDatabase } from '../database/postgres';
import type { AuthenticatedRequest } from './authenticated-request';
import { diagnosticRoute, emitFailure, FailureContext, FailureOperation } from './failure-diagnostics';

@Injectable()
export class AuditMiddleware implements NestMiddleware {
  private readonly logger = new Logger('SecurityAudit');
  private database: PostgresDatabase;

  use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const end = res.end.bind(res);
    let ending = false;
    res.end = ((...args: Parameters<Response['end']>) => {
      if (ending) return res;
      ending = true;
      if (!req.path.startsWith('/api/auth') && ['GET', 'HEAD', 'OPTIONS'].includes(req.method) && res.statusCode < 400) return end(...args);
      const event = {
        request_id: req.requestId,
        actor_id: (req as AuthenticatedRequest & { staff?: { id: string } }).staff?.id || null,
        method: req.method,
        // Route templates avoid persisting emails, tracking codes, tokens, or query strings.
        route: req.route?.path || 'unmatched',
        status_code: res.statusCode,
      };
      this.logger.log(JSON.stringify(event));
      // Complete the durable write before ending the response on serverless hosts.
      void this.persist(event, { component: 'audit', operation: 'audit_insert', route: diagnosticRoute(req.path), request_id: req.requestId }).finally(() => end(...args));
      return res;
    }) as Response['end'];
    next();
  }

  async onModuleDestroy() { await this.database?.close(); }

  private async persist(event: object, context?: FailureContext) {
    const started = performance.now();
    let operation: FailureOperation = 'configuration';
    try {
      this.database ??= new PostgresDatabase(runtimeConnectionConfig(process.env.DATABASE_URL));
      operation = 'audit_insert';
      await this.database.transaction(tx => tx.query('INSERT INTO app.staff_auth_audit(action,subject) VALUES($1,$2)', ['http.request', JSON.stringify(event)]));
    } catch (error) {
      emitFailure(error, { component: 'audit', operation, route: context?.route, request_id: context?.request_id,
        elapsed_ms: performance.now() - started, phase: operation === 'configuration' ? 'configuration' : 'work',
        transaction_outcome: operation === 'configuration' ? 'not_started' : 'unknown' }, this.logger);
      this.logger.error('Audit persistence unavailable; retain structured platform logs.');
    }
  }
}
