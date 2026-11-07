import type { Request } from 'express';
import { isIP } from 'node:net';
import { ServiceUnavailableException } from '@nestjs/common';

// Vercel overwrites this header at its edge. Never trust it on other hosts.
// https://vercel.com/docs/headers/request-headers
export function clientIp(req: Request): string {
  const raw = process.env.VERCEL === '1' ? req.headers['x-forwarded-for'] : (req.ip || req.socket?.remoteAddress);
  if (typeof raw !== 'string' || !isIP(raw.trim())) throw new ServiceUnavailableException('Client address unavailable.');
  const ip = raw.trim().toLowerCase();
  return ip.startsWith('::ffff:') && isIP(ip.slice(7)) === 4 ? ip.slice(7) : ip;
}
