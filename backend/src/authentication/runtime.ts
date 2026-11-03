import { BetterAuthAdapter } from './better-auth.adapter';
import type { AuthenticationAdapter } from './authentication.adapter';

let adapter: AuthenticationAdapter;
export function staffAuthentication(): AuthenticationAdapter | undefined {
  if (!process.env.STAFF_AUTH_DATABASE_URL) return undefined;
  adapter ??= new BetterAuthAdapter({
    databaseUrl: process.env.STAFF_AUTH_DATABASE_URL,
    origin: process.env.STAFF_AUTH_ORIGIN,
    secret: process.env.STAFF_AUTH_SECRET || '',
    sendResetPassword: async ({ email, url }) => {
      if (!process.env.STAFF_MAIL_API_KEY || !process.env.STAFF_MAIL_FROM) throw new Error('Recovery delivery is not configured');
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST', signal: AbortSignal.timeout(10000),
        headers: { Authorization: `Bearer ${process.env.STAFF_MAIL_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: process.env.STAFF_MAIL_FROM, to: [email], subject: 'TAL.GOV staff password recovery',
          text: `Use this link within 15 minutes to reset your password. MFA remains required.\n${url}` }),
      });
      if (!response.ok) throw new Error('Recovery delivery failed');
    },
  });
  return adapter;
}
