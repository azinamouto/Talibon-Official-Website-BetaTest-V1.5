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
  Inject
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request, Response } from "express";

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
  constructor(@Inject(Reflector) private reflector: Reflector) {}
  configure(database: PostgresDatabase) { this.database = database; }
  async onModuleDestroy() { await this.database?.close(); }
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    if (!req.path?.startsWith('/api') || req.path === '/api/health') return true;
    const category = this.reflector.getAllAndOverride<RateLimitCategory>(RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()]) ||
      (['GET','HEAD','OPTIONS'].includes(req.method) ? RateLimitCategory.PUBLIC_READ : RateLimitCategory.ADMIN_MUTATION);
    const config = CATEGORY_LIMITS[category];
    const key = 'http:' + createHash('sha256').update(category + ':' + clientIp(req)).digest('hex');
    let record: { attempts: number; retry: number };
    try {
      this.database ??= new PostgresDatabase(runtimeConnectionConfig(process.env.DATABASE_URL));
      record = await this.database.transaction(async tx => {
        // Existing shared throttle contract; separate namespace from authentication.
        await tx.query("DELETE FROM app.staff_auth_throttle WHERE key LIKE 'http:%' AND started_at < now()-interval '1 day'");
        const [row] = await tx.query(`INSERT INTO app.staff_auth_throttle(key,attempts) VALUES($1,1)
          ON CONFLICT(key) DO UPDATE SET
          attempts=CASE WHEN staff_auth_throttle.started_at<=now()-interval '1 minute' THEN 1 ELSE LEAST(staff_auth_throttle.attempts+1,1000000) END,
          started_at=CASE WHEN staff_auth_throttle.started_at<=now()-interval '1 minute' THEN now() ELSE staff_auth_throttle.started_at END
          RETURNING attempts, GREATEST(1,ceil(extract(epoch FROM started_at+interval '1 minute'-now())))::int AS retry`, [key]);
        return row as { attempts: number; retry: number };
      });
    } catch { throw new HttpException('Rate limiting is temporarily unavailable.', 503); }
    res.setHeader('X-RateLimit-Limit', config.max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0,config.max-record.attempts));
    if (record.attempts > config.max) {
      res.setHeader('Retry-After',record.retry);
      throw new HttpException({ statusCode: HttpStatus.TOO_MANY_REQUESTS, message: 'Please retry later.', retryAfter: record.retry },429);
    }
    return true;
  }
}
