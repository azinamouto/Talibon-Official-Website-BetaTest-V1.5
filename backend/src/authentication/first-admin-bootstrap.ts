import { randomBytes, randomUUID } from 'node:crypto';
import { isEmail } from 'class-validator';
import type { Pool, PoolClient } from 'pg';
import { providerOptions } from './better-auth.adapter';

const { loadBetterAuth } = require('./better-auth-loader.cjs');
export const FIRST_ADMIN_AUTHORIZATION = 'CREATE_FIRST_ADMIN:misty-silence-69777617:br-steep-sea-ao0qw05a:neondb';
export const FIRST_ADMIN_MARKER = 'bootstrap.admin.created';
export class BootstrapError extends Error {
  constructor(readonly code: 'authorization_required' | 'invalid_input' | 'wrong_identity' | 'already_initialized' | 'provider_rejected') {
    super(code);
  }
}
export interface FirstAdminInput {
  authorization: string;
  emailOwnershipConfirmed: boolean;
  email: string;
  displayName: string;
  password: string;
}

export function validateFirstAdminInput(input: FirstAdminInput) {
  if (input?.authorization !== FIRST_ADMIN_AUTHORIZATION || input.emailOwnershipConfirmed !== true) {
    throw new BootstrapError('authorization_required');
  }
  if (typeof input.email !== 'string' || input.email !== input.email.trim() || input.email.length > 254 || !isEmail(input.email) ||
      typeof input.displayName !== 'string' || !input.displayName.trim() || input.displayName.length > 100 ||
      /[\x00-\x1f\x7f]/.test(input.displayName) || typeof input.password !== 'string' ||
      input.password.length < 14 || input.password.length > 128 || /[\x00-\x1f\x7f]/.test(input.password)) {
    throw new BootstrapError('invalid_input');
  }
}

/** Provider writes use one already-leased client; only the outer transaction owns COMMIT/release. */
export async function firstAdminProvider(client: PoolClient, markDiscard: () => void) {
  const query = (sql: string, values?: unknown[]) => {
    if (typeof sql !== 'string' || /^\s*(begin|start\s+transaction|commit|rollback|savepoint|release\s+savepoint)\b/i.test(sql)) {
      throw new BootstrapError('provider_rejected');
    }
    return client.query(sql, values);
  };
  const lease = { query, release: (discard?: boolean) => { if (discard) markDiscard(); } };
  const pinned = { query, connect: async () => lease, end: async () => undefined } as unknown as Pool;
  const { betterAuth } = await loadBetterAuth();
  const options = await providerOptions(pinned, {
    databaseUrl: '', origin: 'https://talgov-r2-staging.vercel.app',
    // No session, verification token or MFA material is minted here. Password hashing
    // uses the deployed provider configuration and does not depend on this ephemeral key.
    secret: randomBytes(48).toString('base64url'),
  });
  return (await betterAuth(options).$context);
}

/** Operator-only library: deliberately not registered with the HTTP application. */
export async function bootstrapFirstAdmin(pool: Pool, input: FirstAdminInput,
  identity = { database: 'neondb', role: 'talgov_staging_migrator' }, provide = firstAdminProvider) {
  validateFirstAdminInput(input);
  const client = await pool.connect();
  let discard = false, committing = false;
  let transportFailure: Error | undefined;
  const onError = (error: Error) => { discard = true; transportFailure = error; };
  client.on('error', onError);
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL statement_timeout = '5s'");
    await client.query("SET LOCAL lock_timeout = '2s'");
    await client.query("SET LOCAL idle_in_transaction_session_timeout = '15s'");
    await client.query('SET LOCAL transaction_timeout = 0');
    await client.query("SET LOCAL transaction_timeout = '30s'");
    await client.query('SET LOCAL search_path = public');
    const { rows: [actual] } = await client.query('SELECT current_database() AS database, current_user AS role, session_user AS session_role');
    if (actual?.database !== identity.database || actual.role !== identity.role || actual.session_role !== identity.role) {
      throw new BootstrapError('wrong_identity');
    }
    // Cooperate with staff management; also block non-cooperating INSERT/UPDATE races.
    await client.query('SELECT pg_advisory_xact_lock(72002)');
    await client.query('LOCK TABLE app.staff_accounts IN SHARE ROW EXCLUSIVE MODE');
    const { rows: [state] } = await client.query(`SELECT
      EXISTS(SELECT 1 FROM app.staff_accounts WHERE role='admin') AS admin_exists,
      EXISTS(SELECT 1 FROM app.staff_auth_audit WHERE action=$1) AS consumed,
      EXISTS(SELECT 1 FROM public.r2_auth_user WHERE lower(email)=lower($2)) AS email_exists`,
    [FIRST_ADMIN_MARKER, input.email]);
    if (state?.admin_exists !== false || state?.consumed !== false || state?.email_exists !== false) {
      throw new BootstrapError('already_initialized');
    }

    const provider = await provide(client, () => { discard = true; });
    if (provider.password.config.minPasswordLength !== 14 || provider.password.config.maxPasswordLength !== 128) {
      throw new BootstrapError('provider_rejected');
    }
    const hash = await provider.password.hash(input.password);
    input.password = '';
    const subject = randomUUID();
    // Verification here is an explicit operator attestation of already-confirmed
    // mailbox ownership, recorded below; bootstrap never sends mail or verification tokens.
    const user = await provider.internalAdapter.createUser({ id: subject, email: input.email.toLowerCase(),
      name: input.displayName.trim(), emailVerified: true, twoFactorEnabled: false });
    if (user?.id !== subject) throw new BootstrapError('provider_rejected');
    const credential = await provider.internalAdapter.createAccount({ id: randomUUID(),
      accountId: subject, providerId: 'credential', userId: subject, password: hash });
    if (!credential || credential.userId !== subject || credential.accountId !== subject || credential.providerId !== 'credential') {
      throw new BootstrapError('provider_rejected');
    }
    const { rows: [staff] } = await client.query(`INSERT INTO app.staff_accounts(provider,subject,role,active)
      VALUES('better-auth',$1,'admin',true) RETURNING id`, [subject]);
    if (!staff?.id) throw new BootstrapError('provider_rejected');
    await client.query(`INSERT INTO app.staff_auth_audit(action,subject) VALUES($1,$2),('bootstrap.email_owner.attested',$2)`,
      [FIRST_ADMIN_MARKER, subject]);
    await client.query(`INSERT INTO app.audit_events(actor_id,action,resource_id,request_id)
      VALUES($1,'staff.access',$1,$2)`, [staff.id, randomUUID()]);
    if (transportFailure) throw transportFailure;
    if (discard) throw new BootstrapError('provider_rejected');
    committing = true;
    const commit = await client.query('COMMIT');
    if (commit.command !== 'COMMIT') throw new BootstrapError('provider_rejected');
    return { success: true, role: 'admin', mfaEnrollmentRequired: true } as const;
  } catch (error) {
    if (committing) discard = true; // Ambiguous commit: no retry and no connection reuse.
    try { await client.query('ROLLBACK'); } catch { discard = true; }
    throw error; // A rollback failure must never replace the original exception.
  } finally {
    input.password = '';
    client.removeListener('error', onError);
    client.release(discard);
  }
}
