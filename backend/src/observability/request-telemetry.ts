import type { NextFunction, Request, Response } from 'express';

type TelemetryLogger = Pick<Console, 'log' | 'error'>;

/** One bounded, privacy-safe event per response, including parser/guard failures. */
export function requestTelemetry(logger: TelemetryLogger = console) {
  return (req: Request & { requestId?: string }, res: Response, next: NextFunction) => {
    const start = performance.now();
    let recorded = false;
    const record = (aborted: boolean) => {
      if (recorded) return;
      recorded = true;
      const event = JSON.stringify({
        event: 'http_request',
        requestId: req.requestId,
        method: req.method,
        // Never log URLs, query parameters, tokens, bodies, IPs or user identities.
        route: typeof req.route?.path === 'string' ? req.route.path : 'unmatched',
        status: aborted ? 499 : res.statusCode,
        durationMs: Math.round((performance.now() - start) * 100) / 100,
        aborted,
      });
      if (!aborted && res.statusCode >= 500) logger.error(event);
      else logger.log(event);
    };
    res.once('finish', () => record(false));
    res.once('close', () => record(!res.writableFinished));
    next();
  };
}
