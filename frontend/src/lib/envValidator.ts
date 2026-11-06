/** The browser uses same-origin APIs and needs no provider credentials. */
export interface EnvValidationResult { isValid: boolean; issues: string[]; }
export function validateEnvironment(env: Record<string, unknown> = import.meta.env): EnvValidationResult {
  const issues: string[] = [];
  for (const name of Object.keys(env)) {
    if (/^VITE_.*(SECRET|SERVICE_ROLE|PRIVATE|PASSWORD|ADMIN|DATABASE)/i.test(name)) issues.push('Private environment variables must not use the VITE_ prefix.');
  }
  return { isValid: issues.length === 0, issues };
}
