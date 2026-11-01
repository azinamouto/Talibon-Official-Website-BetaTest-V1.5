import type { Request, Response, NextFunction } from 'express';

export const DEFERRED_MESSAGE = 'Online services are not available. Please visit the appropriate municipal office.';
const publicForms = /^\/api\/forms\/(downloadable|business-permits|building-permits|zoning-clearance)$/;

/** Normalize exactly once; ambiguous encodings never reach a controller. No feature flag. */
export function deferredRoutes(req: Request, res: Response, next: NextFunction) {
  let path: string;
  try { path = decodeURIComponent(req.path).replace(/\/+/g, '/').replace(/\/$/, '').toLowerCase(); }
  catch { res.status(400).json({ success: false, statusCode: 400, message: 'Invalid request path.' }); return; }
  if (/[\\%\x00-\x1f]/.test(path)) {
    res.status(400).json({ success: false, statusCode: 400, message: 'Invalid request path.' }); return;
  }
  const read = ['GET', 'HEAD'].includes(req.method);
  const retired = /^\/api\/(payments|notifications|chat)(?:\/|$)/.test(path)
    || /^\/api\/auth\/signup(?:\/|$)/.test(path)
    || (/^\/api\/forms(?:\/|$)/.test(path) && !(read && publicForms.test(path)))
    || /^\/api\/admin\/reports\/(submissions|payments)(?:\/|$)/.test(path)
    || (!read && req.method !== 'OPTIONS' && /^\/api\/(pages|news|services)(?:\/|$)/.test(path));
  if (!retired) { next(); return; }
  res.setHeader('Cache-Control', 'no-store');
  res.status(410).json({ success: false, statusCode: 410, error: 'Gone', message: DEFERRED_MESSAGE,
    timestamp: new Date().toISOString(), requestId: res.getHeader('X-Request-Id') });
}
