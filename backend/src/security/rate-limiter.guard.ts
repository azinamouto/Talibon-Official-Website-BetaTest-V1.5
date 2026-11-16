import { createHash } from 'node:crypto';
import { runtimeConnectionConfig, PostgresDatabase } from '../database/postgres';
import { clientIp } from './client-ip';
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  SetMetadata,
  Inject,
  Logger
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request, Response } from "express";
import { diagnosticRoute, emitFailure, FailureOperation, TransactionOutcome } from './failure-diagnostics';

export enum RateLimitCategory {
  PUBLIC_MEDIA = "PUBLIC_MEDIA",
  PUBLIC_READ = "PUBLIC_READ",
  AUTHENTICATION = "AUTHENTICATION",
  CITIZEN_SUBMISSION = "CITIZEN_SUBMISSION",
  TRACKING = "TRACKING",
  ADMIN_MUTATION = "ADMIN_MUTATION",
  FILE_UPLOAD = "FILE_UPLOAD",
  PAYMENT = "PAYMENT",
  AI_CHAT = "AI_CHAT"
}

interface RateLimitConfig {
  max: number;
  windowMs: number;
}

const CATEGORY_LIMITS: Record<RateLimitCategory, RateLimitConfig> = {
  [RateLimitCategory.PUBLIC_MEDIA]: { max: 60, windowMs: 60 * 1000 },
  [RateLimitCategory.PUBLIC_READ]: { max: 120, windowMs: 60 * 1000 },
  [RateLimitCategory.AUTHENTICATION]: { max: 10, windowMs: 60 * 1000 },
  [RateLimitCategory.CITIZEN_SUBMISSION]: { max: 15, windowMs: 60 * 1000 },
  [RateLimitCategory.TRACKING]: { max: 20, windowMs: 60 * 1000 },
  [RateLimitCategory.ADMIN_MUTATION]: { max: 30, windowMs: 60 * 1000 },
  [RateLimitCategory.FILE_UPLOAD]: { max: 10, windowMs: 60 * 1000 },
  [RateLimitCategory.PAYMENT]: { max: 10, windowMs: 60 * 1000 },
  [RateLimitCategory.AI_CHAT]: { max: 10, windowMs: 60 * 1000 }
};

export const RATE_LIMIT_KEY = "rate_limit_category";
export const RateLimit = (category: RateLimitCategory) => SetMetadata(RATE_LIMIT_KEY, category);

@Injectable()
export class RateLimiterGuard implements CanActivate {
  private database: PostgresDatabase;
  private readonly logger = new Logger('RateLimiterDiagnostics');
  constructor(@Inject(Reflector) private reflector: Reflector) {}
  configure(database: PostgresDatabase) { this.database = database; }
  async onModuleDestroy() { await this.database?.close(); }
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    if (!req.path?.startsWith('/api') || req.path === '/api/health') return true;
    const started = performance.now();
    let operation: FailureOperation = 'unexpected';
    let reported = false;
    let outcome: TransactionOutcome = 'not_started';
    const report = (error: unknown) => {
      reported = true;
      try {
        emitFailure(error, { component: 'rate_limiter', operation, route: diagnosticRoute(req.path),
          request_id: (req as Request & { requestId?: string }).requestId, elapsed_ms: performance.now() - started,
          phase: operation === 'configuration' ? 'configuration' : operation === 'throttle_result' ? 'response' : 'work',
          transaction_outcome: outcome }, this.logger);
      } catch { /* Even diagnostic context extraction cannot replace the original failure. */ }
    };
    try {
      const category = this.reflector.getAllAndOverride<RateLimitCategory>(RATE_LIMIT_KEY,
        [context.getHandler(), context.getClass()]) ||
        (['GET','HEAD','OPTIONS'].includes(req.method) ? RateLimitCategory.PUBLIC_READ : RateLimitCategory.ADMIN_MUTATION);
      const config = CATEGORY_LIMITS[category];
      operation = 'ip_validation';
      let ip: string;
      try { ip = clientIp(req); } catch (error) { report(error); throw error; }
      const key = 'http:' + createHash('sha256').update(category + ':' + ip).digest('hex');
      let record: { attempts: number; retry: number };
      try {
        operation = 'configuration';
        this.database ??= new PostgresDatabase(runtimeConnectionConfig(process.env.DATABASE_URL));
        outcome = 'unknown';
        record = await this.database.transaction(async tx => {
          operation = 'throttle_cleanup';
          // Existing shared throttle contract; separate namespace from authentication.
          await tx.query("DELETE FROM app.staff_auth_throttle WHERE key LIKE 'http:%' AND started_at < now()-interval '1 day'");
          operation = 'throttle_upsert';
          const [row] = await tx.query(`INSERT INTO app.staff_auth_throttle(key,attempts) VALUES($1,1)
          ON CONFLICT(key) DO UPDATE SET
          attempts=CASE WHEN staff_auth_throttle.started_at<=now()-interval '1 minute' THEN 1 ELSE LEAST(staff_auth_throttle.attempts+1,1000000) END,
          started_at=CASE WHEN staff_auth_throttle.started_at<=now()-interval '1 minute' THEN now() ELSE staff_auth_throttle.started_at END
          RETURNING attempts, GREATEST(1,ceil(extract(epoch FROM started_at+interval '1 minute'-now())))::int AS retry`, [key]);
          return row as { attempts: number; retry: number };
        });
      } catch (error) { report(error); throw new HttpException('Rate limiting is temporarily unavailable.', 503); }
      outcome = 'commit_confirmed';
      operation = 'throttle_result';
      res.setHeader('X-RateLimit-Limit', config.max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0,config.max-record.attempts));
      if (record.attempts > config.max) {
        res.setHeader('Retry-After',record.retry);
        throw new HttpException({ statusCode: HttpStatus.TOO_MANY_REQUESTS, message: 'Please retry later.', retryAfter: record.retry },429);
      }
      return true;
    } catch (error) {
      if (!reported && !(error instanceof HttpException)) report(error);
      throw error;
    }
  }
}
