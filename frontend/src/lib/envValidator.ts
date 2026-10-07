/** Validate public configuration without including values in errors. */
export interface EnvValidationResult {
  isValid: boolean;
  supabaseUrlConfigured: boolean;
  supabaseAnonKeyConfigured: boolean;
  issues: string[];
}

export function validateEnvironment(env: Record<string, unknown> = import.meta.env): EnvValidationResult {
  const issues: string[] = [];
  const url = typeof env.VITE_SUPABASE_URL === 'string' ? env.VITE_SUPABASE_URL.trim() : '';
  const selectedKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;
  const key = typeof selectedKey === 'string' ? selectedKey.trim() : '';
  let urlValid = false;
  let keyValid = /^sb_publishable_[A-Za-z0-9_-]+$/.test(key);
  try {
    const parsed = new URL(url);
    urlValid = ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password && !parsed.search && !parsed.hash && !/your-project|placeholder/i.test(url);
  } catch { /* Report only the variable name below. */ }
  if (!urlValid) issues.push('VITE_SUPABASE_URL must be a configured HTTP(S) project URL.');
  // Inspect the role to reject privileged keys accidentally placed in the public variable.
  // This is a configuration check, not JWT signature verification or authorization.
  try {
    const parts = key.split('.');
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    keyValid = keyValid || (parts.length === 3 && payload.role === 'anon');
  } catch { /* Invalid keys fail closed. */ }
  if (!keyValid) issues.push('VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY must contain a public key.');
  for (const name of Object.keys(env)) {
    if (/^VITE_.*(SECRET|SERVICE_ROLE|PRIVATE|PASSWORD|ADMIN)/i.test(name)) {
      issues.push('Private environment variables must not use the VITE_ prefix.');
    }
  }
  return { isValid: issues.length === 0, supabaseUrlConfigured: urlValid, supabaseAnonKeyConfigured: keyValid, issues };
}
