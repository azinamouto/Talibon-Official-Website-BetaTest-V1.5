import { Pool } from 'pg';
import { createHash, randomUUID } from 'node:crypto';
import { connectionConfig } from '../database/postgres';
import type { AuthenticationAdapter, StaffPrincipal } from './authentication.adapter';
import type { Request, Response, NextFunction } from 'express';

// Node 22.16 supports this ESM package through require; pin and integration-test upgrades.
const { betterAuth } = require('better-auth');
const { twoFactor } = require('better-auth/plugins');

export interface StaffAuthOptions {
  databaseUrl: string;
  origin: string;
  secret: string;
  localTest?: boolean;
  sendResetPassword: (input: { email: string; url: string }) => Promise<void>;
}

export function providerOptions(pool: Pool, options: StaffAuthOptions) {
  return {
    appName: 'TAL.GOV Staff', baseURL: options.origin, basePath: '/api/staff-auth',
    secret: options.secret, database: pool, trustedOrigins: [options.origin],
    telemetry: { enabled: false }, logger: { disabled: true },
    emailAndPassword: {
      enabled: true, disableSignUp: true, requireEmailVerification: true,
      minPasswordLength: 14, maxPasswordLength: 128,
      resetPasswordTokenExpiresIn: 900, revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, token }) => options.sendResetPassword({ email: user.email,
        url: `${options.origin}/staff/login#token=${encodeURIComponent(token)}` }),
    },
    user: { modelName: 'r2_auth_user', changeEmail: { enabled: false }, deleteUser: { enabled: false } },
    account: { modelName: 'r2_auth_account', accountLinking: { enabled: false } },
    verification: { modelName: 'r2_auth_verification' },
    session: { modelName: 'r2_auth_session', expiresIn: 28800, disableSessionRefresh: true,
      cookieCache: { enabled: false } },
    rateLimit: { enabled: true, storage: 'database', modelName: 'r2_auth_rate_limit', window: 60, max: 30 },
    advanced: { useSecureCookies: !options.localTest, cookiePrefix: 'talgov-staff',
      defaultCookieAttributes: { httpOnly: true, sameSite: 'strict', path: '/' },
      ipAddress: { ipAddressHeaders: ['x-talgov-client-ip'] } },
    databaseHooks: { session: { create: { before: async (session) => {
      const account = await pool.query("SELECT id FROM app.staff_accounts WHERE provider='better-auth' AND subject=$1 AND active AND role IN ('admin','editor')",[session.userId]);
      return account.rowCount ? { data: session } : false;
    } } } },
    plugins: [twoFactor({ issuer: 'TAL.GOV Staff', schema: { twoFactor: { modelName: 'r2_auth_two_factor' } } })],
  };
}

const postPaths = new Set(['/sign-in/email', '/sign-out', '/request-password-reset', '/reset-password',
  '/two-factor/enable', '/two-factor/verify-totp', '/two-factor/verify-backup-code']);
const bodyFields = {
  '/sign-in/email': ['email','password'], '/sign-out': [], '/request-password-reset': ['email'],
  '/reset-password': ['token','newPassword'], '/two-factor/enable': ['password'],
  '/two-factor/verify-totp': ['code'], '/two-factor/verify-backup-code': ['code'],
};
class AccessError extends Error { constructor(readonly status: number) { super('Access denied.'); } }
class ReplayError extends Error {}

function staffPage(query: Request['query']) {
  const parse = (value: unknown, fallback: number, maximum: number) => {
    if (value === undefined) return fallback;
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed <= maximum ? parsed : null;
  };
  const limit = parse(query.limit, 50, 100);
  const page = parse(query.page, 1, 1000);
  return limit === null || page === null ? null : { limit, page, offset: (page - 1) * limit };
}

export class BetterAuthAdapter implements AuthenticationAdapter {
  readonly pool: Pool;
  readonly auth;
  constructor(private readonly options: StaffAuthOptions) {
    const origin = new URL(options.origin);
    if (origin.origin !== options.origin || (origin.protocol !== 'https:' &&
      !(options.localTest && origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname))) ||
      options.secret.length < 43) throw new Error('Invalid staff authentication configuration');
    const loopback = ['127.0.0.1','localhost'].includes(new URL(options.databaseUrl).hostname);
    this.pool = new Pool(connectionConfig(options.databaseUrl, options.localTest && loopback));
    this.pool.on('error', (error: Error & { code?: string }) => {
      console.error(`[staff-auth] database pool error code=${error.code || error.name}`);
    });
    this.auth = betterAuth(providerOptions(this.pool, options));
  }

  async verify(headers: Headers): Promise<StaffPrincipal | null> {
    const session = await this.auth.api.getSession({ headers, query: { disableCookieCache: true } });
    if (!session) return null;
    const result = await this.pool.query(`SELECT a.id,a.subject,a.role,s.id AS "sessionId"
      FROM app.staff_accounts a JOIN r2_auth_user u ON u.id=a.subject
      JOIN r2_auth_session s ON s."userId"=u.id JOIN app.staff_session_assurance m ON m.session_id=s.id
      WHERE a.provider='better-auth' AND a.active AND a.role IN ('admin','editor')
      AND u."emailVerified" AND u."twoFactorEnabled" AND s.id=$1 AND s."expiresAt">now()
      AND m.verified_at>now()-interval '8 hours'`, [session.session.id]);
    const row = result.rows[0];
    return row ? { ...row, provider: 'better-auth', sessionVerified: true, assurance: 'mfa' } : null;
  }

  async handle(req: Request, res: Response, next: NextFunction) {
    if (!req.path.startsWith('/api/staff-auth') && req.path !== '/api/staff' && !req.path.startsWith('/api/staff/')) { next(); return; }
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    try {
      const headers = new Headers({ cookie: req.headers.cookie || '' });
      if (req.method !== 'GET' && (req.headers.origin !== this.options.origin ||
        !req.is('application/json'))) { res.status(403).json({ message: 'Access denied.' }); return; }
      if (req.method === 'POST') {
        await this.pool.query("DELETE FROM app.staff_auth_throttle WHERE started_at<now()-interval '1 day'");
        const identities = [`ip:${req.ip || req.socket.remoteAddress || 'unknown'}`];
        if (typeof req.body?.email === 'string') identities.push(`account:${req.body.email.trim().toLowerCase()}`);
        for (const identity of identities) {
          const key = createHash('sha256').update(identity).digest('hex');
          const count = await this.pool.query(`INSERT INTO app.staff_auth_throttle(key,attempts) VALUES($1,1)
            ON CONFLICT(key) DO UPDATE SET
              attempts=CASE WHEN staff_auth_throttle.started_at<now()-interval '1 minute' THEN 1 ELSE staff_auth_throttle.attempts+1 END,
              started_at=CASE WHEN staff_auth_throttle.started_at<now()-interval '1 minute' THEN now() ELSE staff_auth_throttle.started_at END
            RETURNING attempts`, [key]);
          if (count.rows[0].attempts > (identity.startsWith('account:') ? 10 : 30)) {
            res.setHeader('Retry-After','60'); res.status(429).json({ message:'Please retry later.' }); return;
          }
        }
      }
      if (req.path === '/api/staff' || req.path.startsWith('/api/staff/')) {
        const actor = await this.verify(headers);
        if (!actor) { res.status(401).json({ message: 'Staff authentication and MFA required.' }); return; }
        if (req.method === 'GET' && req.path === '/api/staff/me') {
          res.json({ id: actor.id, role: actor.role }); return;
        }
        if (req.method === 'GET' && ['/api/staff', '/api/staff/audit'].includes(req.path)) {
          if (actor.role !== 'admin') { res.status(403).json({ message: 'Access denied.' }); return; }
          const page = staffPage(req.query);
          if (!page) { res.status(400).json({ message: 'Invalid pagination.' }); return; }
          const result = req.path === '/api/staff'
            ? await this.pool.query(`SELECT a.id, u.email, a.role, a.active, a.version, a.created_at AS "createdAt"
                FROM app.staff_accounts a JOIN r2_auth_user u ON u.id=a.subject WHERE a.provider='better-auth'
                ORDER BY a.created_at DESC,a.id DESC LIMIT $1 OFFSET $2`, [page.limit + 1, page.offset])
            : await this.pool.query(`SELECT id, source, action, actor_id AS "actorId", subject_id AS "subjectId",
                request_id AS "requestId", occurred_at AS "occurredAt" FROM (
                  SELECT id, 'authentication'::text AS source, action, NULL::text AS actor_id,
                    subject AS subject_id, NULL::text AS request_id, occurred_at
                  FROM app.staff_auth_audit
                  UNION ALL
                  SELECT id, 'mutation'::text AS source, action, actor_id::text AS actor_id,
                    resource_id::text AS subject_id, request_id, occurred_at
                  FROM app.audit_events
                ) staff_audit ORDER BY occurred_at DESC,id DESC LIMIT $1 OFFSET $2`,
              [page.limit + 1, page.offset]);
          const hasMore = result.rows.length > page.limit;
          res.json({ data: result.rows.slice(0, page.limit), pagination: { page: page.page, limit: page.limit, hasMore } });
          return;
        }
        const match = req.path.match(/^\/api\/staff\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/(activate|deactivate|revoke|role)$/i);
        if (req.method !== 'POST' || !match || actor.role !== 'admin') {
          res.status(403).json({ message: 'Access denied.' }); return;
        }
        const action = match[2] as 'activate' | 'deactivate' | 'revoke' | 'role';
        const body = req.body ?? {};
        const fields = action === 'role' ? ['version', 'role'] : action === 'revoke' ? [] : ['version'];
        if (typeof body !== 'object' || Array.isArray(body) ||
            Object.keys(body).some(key => !fields.includes(key)) ||
            fields.some(key => !Object.prototype.hasOwnProperty.call(body, key)) ||
            (action !== 'revoke' && (!Number.isSafeInteger(body.version) || body.version < 1)) ||
            (action === 'role' && body.role !== 'admin' && body.role !== 'editor')) {
          res.status(400).json({ message: 'Invalid request.' }); return;
        }
        await this.manageStaff(actor, match[1], action, body.version, body.role,
          String(res.getHeader('X-Request-Id') || randomUUID()));
        res.json({ success: true }); return;
      }
      const path = req.path.slice('/api/staff-auth'.length);
      if (req.method !== 'POST' || !postPaths.has(path)) { res.status(403).json({ message: 'Access denied.' }); return; }
      const body = req.body ?? {};
      if (typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !bodyFields[path].includes(key))) {
        res.status(400).json({ message: 'Invalid request.' }); return;
      }
      if (body.trustDevice || body.disableSession || body.method && body.method !== 'totp' ||
          body.callbackURL || body.redirectTo && body.redirectTo !== `${this.options.origin}/staff/login`) {
        res.status(400).json({ message: 'Invalid request.' }); return;
      }
      if (path === '/request-password-reset') body.redirectTo = `${this.options.origin}/staff/login`;
      if (path === '/two-factor/enable') {
        const session = await this.auth.api.getSession({ headers });
        if (!session || session.user.twoFactorEnabled) { res.status(403).json({ message: 'Access denied.' }); return; }
      }
      // The caller cannot supply the provider's IP header. Express resolves only configured trusted proxies.
      headers.set('x-talgov-client-ip', req.ip || req.socket.remoteAddress || 'unknown');
      headers.set('origin', this.options.origin);
      headers.set('content-type', 'application/json');
      const response = await this.auth.handler(new globalThis.Request(`${this.options.origin}${req.path}`, {
        method: 'POST', headers, body: JSON.stringify(body),
      }));
      const payload = await response.json();
      const cookies = response.headers.getSetCookie();
      let outcome = response.ok;
      if (outcome && ['/two-factor/verify-totp', '/two-factor/verify-backup-code'].includes(path)) {
        const combined = new Map((req.headers.cookie || '').split(';').filter(Boolean).map(v => {
          const index = v.indexOf('='); return [v.slice(0,index).trim(),v.slice(index+1)];
        }));
        for (const cookie of cookies) { const pair=cookie.split(';')[0]; const i=pair.indexOf('='); combined.set(pair.slice(0,i),pair.slice(i+1)); }
        const current = await this.auth.api.getSession({ headers: new Headers({ cookie: [...combined].map(([k,v])=>`${k}=${v}`).join('; ') }) });
        if (!current) throw new Error('No verified session');
        const client = await this.pool.connect();
        try {
          await client.query('BEGIN');
          // Reject reuse across independent challenges, including concurrent requests.
          if (path.endsWith('verify-totp')) {
            const digest = createHash('sha256').update(`${current.user.id}:${body.code}`).digest('hex');
            await client.query('DELETE FROM app.staff_totp_replay WHERE expires_at<now()');
            const replay = await client.query(`INSERT INTO app.staff_totp_replay (digest,expires_at) VALUES ($1,now()+interval '2 minutes')
              ON CONFLICT (digest) DO UPDATE SET expires_at=excluded.expires_at WHERE staff_totp_replay.expires_at<now() RETURNING digest`,[digest]);
            if (!replay.rowCount) throw new ReplayError('Replayed factor');
          }
          await client.query(`INSERT INTO app.staff_session_assurance(session_id) VALUES($1)
            ON CONFLICT (session_id) DO UPDATE SET verified_at=now()`,[current.session.id]);
          await client.query("INSERT INTO app.staff_auth_audit(action,subject) VALUES('mfa.success',$1)",[current.user.id]);
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          if (!(error instanceof ReplayError)) throw error;
          await this.pool.query('DELETE FROM r2_auth_session WHERE id=$1',[current.session.id]);
          outcome=false;
        } finally { client.release(); }
      }
      await this.pool.query('INSERT INTO app.staff_auth_audit(action) VALUES($1)',[`${path.slice(1).replaceAll('/','.')}.${outcome ? 'success' : 'failure'}`]);
      if (!outcome) { res.status(response.ok ? 401 : response.status).json({ message: 'Authentication request failed.' }); return; }
      if (cookies.length) res.setHeader('Set-Cookie', cookies);
      // Never return provider user records, session tokens, or reset tokens to browser JS.
      res.json(path === '/two-factor/enable' ? { totpURI: payload.totpURI, backupCodes: payload.backupCodes }
        : { success: true, mfaRequired: payload.twoFactorRedirect === true });
    } catch (error) {
      if (!(error instanceof AccessError)) {
        const code=typeof error==='object' && error!==null && 'code' in error ? String(error.code) : error instanceof Error ? error.name : 'unknown';
        console.error(`[staff-auth] request failed code=${code}`);
      }
      res.status(error instanceof AccessError ? error.status : 503).json({ message: 'Authentication request could not be completed.' });
    }
  }

  private async manageStaff(actor: StaffPrincipal, target: string, action: 'activate' | 'deactivate' | 'revoke' | 'role',
    version: number | undefined, role: 'admin' | 'editor' | undefined, requestId: string) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(72002)');
      const current = await client.query(`SELECT a.id FROM app.staff_accounts a JOIN r2_auth_session s ON s."userId"=a.subject
        JOIN app.staff_session_assurance m ON m.session_id=s.id WHERE a.id=$1 AND a.active AND a.role='admin'
        AND a.provider='better-auth' AND s.id=$2 AND s."expiresAt">now() AND m.verified_at>now()-interval '5 minutes' FOR SHARE OF a`,[actor.id,actor.sessionId]);
      if (!current.rowCount) throw new AccessError(403);
      const result = await client.query(`SELECT subject,role,active,version FROM app.staff_accounts
        WHERE id=$1 AND provider='better-auth' FOR UPDATE`,[target]);
      const account=result.rows[0]; if (!account) throw new AccessError(404);
      if (version !== undefined && account.version !== version) throw new AccessError(409);
      if ((action === 'deactivate' || action === 'role' && role !== 'admin') &&
          account.active && account.role === 'admin') {
        const count=await client.query("SELECT count(*)::int n FROM app.staff_accounts WHERE active AND role='admin' AND provider='better-auth'");
        if (count.rows[0].n<=1) throw new AccessError(409);
      }
      if (action === 'deactivate' || action === 'activate' || action === 'role') {
        const updated = action === 'role'
          ? await client.query(`UPDATE app.staff_accounts SET role=$2,version=version+1,updated_at=now()
              WHERE id=$1 AND version=$3`, [target, role, version])
          : await client.query(`UPDATE app.staff_accounts SET active=$2,version=version+1,updated_at=now()
              WHERE id=$1 AND version=$3`, [target, action === 'activate', version]);
        if (!updated.rowCount) throw new AccessError(409);
      }
      await client.query('DELETE FROM r2_auth_session WHERE "userId"=$1',[account.subject]);
      await client.query("INSERT INTO app.audit_events(actor_id,action,resource_id,request_id) VALUES($1,'staff.access',$2,$3)",[actor.id,target,requestId]);
      const auditAction = action === 'role' ? `account.role.${account.role}_to_${role}` : `account.${action}`;
      await client.query('INSERT INTO app.staff_auth_audit(action,subject) VALUES($1,$2)',[auditAction,account.subject]);
      await client.query('COMMIT');
    } catch(error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }
  async close() { await this.pool.end(); }
}
