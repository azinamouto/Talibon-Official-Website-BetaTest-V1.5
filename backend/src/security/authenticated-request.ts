import type { Request } from 'express';


export interface AuthenticatedRequest extends Request {
  user: { id: string; email?: string };
  accessToken: string;
  profile: { role: string; is_verified: boolean; deleted_at: string | null };
  requestId?: string;
}
