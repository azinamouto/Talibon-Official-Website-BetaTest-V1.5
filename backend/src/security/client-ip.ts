import type { Request } from 'express';
import { isIP } from 'node:net';
import { ServiceUnavailableException } from '@nestjs/common';
import { attachFailure, FailureMetadata } from './failure-diagnostics';

// Vercel overwrites this header at its edge. Never trust it on other hosts.
// https://vercel.com/docs/headers/request-headers
export function clientIp(req: Request): string {
  const raw = process.env.VERCEL === '1' ? req.headers['x-forwarded-for'] : (req.ip || req.socket?.remoteAddress);
  if (typeof raw !== 'string' || !isIP(raw.trim())) {
    const reason: FailureMetadata['reason'] = raw == null || raw === '' ? 'ip_missing'
      : typeof raw !== 'string' ? 'ip_non_string' : raw.includes(',') ? 'ip_ambiguous' : 'ip_invalid';
    throw attachFailure(new ServiceUnavailableException('Client address unavailable.'), {
      phase: 'ip_validation', reason, transaction_outcome: 'not_started',
    });
  }
  const ip = raw.trim().toLowerCase();
  return ip.startsWith('::ffff:') && isIP(ip.slice(7)) === 4 ? ip.slice(7) : ip;
}
