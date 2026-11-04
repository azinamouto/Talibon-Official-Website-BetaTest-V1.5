import type { Request, Response, NextFunction } from 'express';

export interface StaffPrincipal {
  id: string;
  subject: string;
  role: 'admin' | 'editor';
  sessionId: string;
  provider: 'better-auth';
  sessionVerified: true;
  assurance: 'mfa';
}

/** Provider secrets and tokens never cross this boundary. */
export interface AuthenticationAdapter {
  verify(headers: Headers): Promise<StaffPrincipal | null>;
  handle(req: Request, res: Response, next: NextFunction): Promise<void>;
  close(): Promise<void>;
}
