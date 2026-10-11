import { Logger } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

const logger = new Logger('RequestMetrics');

/** One structured event per response; no bodies, query strings, tokens or IPs. */
export function requestMetrics(req: Request & { requestId?: string }, res: Response, next: NextFunction) {
  const started = performance.now();
  let recorded = false;
  const record = () => {
    if (recorded) return;
    recorded = true;
    logger.log(JSON.stringify({
      event: 'http_request', requestId: req.requestId,
      method: req.method, route: req.route?.path || 'unmatched',
      status: res.writableFinished ? res.statusCode : 499,
      durationMs: Math.round((performance.now() - started) * 100) / 100,
    }));
  };
  res.once('finish', record);
  res.once('close', record);
  next();
}
