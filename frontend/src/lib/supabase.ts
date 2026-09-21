import { createClient } from '@supabase/supabase-js';
import { validateEnvironment } from './envValidator';

const validation = validateEnvironment();
if (!validation.isValid) {
  throw new Error('Invalid frontend configuration: ' + validation.issues.join(' '));
}
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY.trim();
export const isSupabaseConfigured = true;
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
});

export function logSupabaseDiagnostics(_context: string, errorDetail?: unknown): void {
  console.info('[Supabase] Configuration status', {
    urlPresent: validation.supabaseUrlConfigured,
    publicKeyPresent: validation.supabaseAnonKeyConfigured,
    clientInitialized: !!supabase,
    errorPresent: !!errorDetail,
  });
}
