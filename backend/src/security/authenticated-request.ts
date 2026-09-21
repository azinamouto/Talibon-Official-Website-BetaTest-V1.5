import type { Request } from 'express';
import type { User } from '@supabase/supabase-js';

export interface AuthenticatedRequest extends Request {
  user: User;
  accessToken: string;
  profile: { role: string; is_verified: boolean; deleted_at: string | null };
  requestId?: string;
}
