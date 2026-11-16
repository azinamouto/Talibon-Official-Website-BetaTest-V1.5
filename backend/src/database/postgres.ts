import { Client, Pool, PoolClient, PoolConfig, QueryResultRow } from 'pg';
import { TLSSocket } from 'node:tls';
import { attachFailure, classifyFailure, createRuntimeRoleAcceptanceEmitter, failureCode, FailureMetadata, FailurePhase, runtimeRoleSnapshot, RuntimeRoleSnapshot, TransactionOutcome } from '../security/failure-diagnostics';

// pg's supported enableChannelBinding option prefers PLUS but permits fallback.
// Keep require fail-closed through the Pool Client extension point. These three
// protocol hooks are version-sensitive: pg is pinned and downgrade tests gate upgrades.
type SaslMessage = { mechanisms: string[] };
type PgProtocol = {
  connection: { stream: TLSSocket; emit(event: string, error: Error): void };
  saslSession?: { mechanism: string };
  _handleAuthSASL(message: SaslMessage): void;
  _handleAuthSASLFinal(message: { data: string }): void;
};
const boundClients = new WeakSet<Client>();
export class ChannelBoundClient extends Client {
  _handleAuthSASL(message: SaslMessage) {
    const protocol = this as unknown as PgProtocol;
    if (!protocol.connection.stream.authorized) {
      this.rejectAuthentication('tls', 'tls_failure');
      return;
    }
    if (!message.mechanisms.includes('SCRAM-SHA-256-PLUS')) {
      this.rejectAuthentication('channel_binding', 'channel_binding_rejected');
      return;
    }
    (Client.prototype as unknown as PgProtocol)._handleAuthSASL.call(this, { mechanisms: ['SCRAM-SHA-256-PLUS'] });
  }
  _handleAuthCleartextPassword() {
    this.rejectAuthentication('channel_binding', 'channel_binding_rejected');
  }
  _handleAuthMD5Password() { this._handleAuthCleartextPassword(); }
  private rejectAuthentication(phase: FailurePhase, reason: FailureMetadata['reason']) {
    (this as unknown as PgProtocol).connection.emit('error', attachFailure(new DatabaseError('unavailable'), { phase, reason }));
  }
  _handleAuthSASLFinal(message: { data: string }) {
    const protocol = this as unknown as PgProtocol;
    const plus = protocol.saslSession?.mechanism === 'SCRAM-SHA-256-PLUS';
    (Client.prototype as unknown as PgProtocol)._handleAuthSASLFinal.call(this, message);
    if (plus && protocol.saslSession === null && protocol.connection.stream.authorized) boundClients.add(this);
  }
}

export class DatabaseError extends Error {
  constructor(public readonly code: 'unavailable' | 'conflict' | 'invalid' | 'forbidden') {
    super(`Database operation ${code}`);
  }
}

export function sanitized(error: unknown, phase: FailurePhase = 'work', outcome?: TransactionOutcome, runtimeRole?: Readonly<RuntimeRoleSnapshot>): DatabaseError {
  const code = failureCode(error);
  const result = error instanceof DatabaseError ? error : new DatabaseError(code === '23505' || code === '40001' || code === '40P01' ? 'conflict'
    : ['23001', '23502', '23503', '23514', '22P02', '22001'].includes(code) ? 'invalid' : 'unavailable');
  const details = classifyFailure(error, phase);
  return attachFailure(result, { ...details, ...(outcome ? { transaction_outcome: outcome } : {}),
    ...((details.runtime_role ?? runtimeRole) ? { runtime_role: details.runtime_role ?? runtimeRole } : {}) });
}

export function connectionConfig(url: string, localTest = false): PoolConfig {
  try {
    const parsed = new URL(url);
    if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !parsed.hostname || !parsed.pathname.slice(1) || parsed.hash) throw new Error();
    const local = ['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname);
    // Reject URL options that could override TLS, timeouts, or search_path.
    const seen = new Set<string>();
    for (const [key, value] of parsed.searchParams) {
      if (seen.has(key)) throw new Error();
      seen.add(key);
      if (!(key === 'sslmode' && ['require', 'verify-full'].includes(value)) &&
          !(key === 'channel_binding' && value === 'require')) throw new Error();
    }
    if (localTest && (!local || seen.size)) throw new Error();
    const bindingRequired = parsed.searchParams.get('channel_binding') === 'require';
    // Translate validated security parameters into explicit pg options; pg URL
    // parsing must not overwrite certificate verification or interpret require as prefer.
    parsed.search = '';
    return {
      connectionString: parsed.toString(), ssl: localTest ? false : { rejectUnauthorized: true },
      enableChannelBinding: !localTest,
      ...(bindingRequired ? { Client: ChannelBoundClient, onConnect: (client: Client) => {
        // Reject trust/certificate-only authentication too. pg clears saslSession
        // after successful SCRAM verification; observe the negotiated mechanism below.
        if (!boundClients.has(client)) throw attachFailure(new DatabaseError('unavailable'), { phase: 'channel_binding', reason: 'channel_binding_rejected' });
      } } : {}),
      max: 2, connectionTimeoutMillis: 5000, idleTimeoutMillis: 10000,
      statement_timeout: 5000, query_timeout: 12000, lock_timeout: 2000, idle_in_transaction_session_timeout: 5000,
      application_name: 'talgov-r2',
    };
  } catch { throw attachFailure(new DatabaseError('invalid'), { phase: 'configuration', reason: 'invalid_configuration', transaction_outcome: 'not_started' }); }
}

/** Runtime pools cannot connect as an owner, migrator or inherited administrator. */
const runtimeGuards = new WeakSet<object>();
const guardSnapshots = new WeakMap<Client, Readonly<RuntimeRoleSnapshot>>();
export function runtimeConnectionConfig(url: string, localTest = false): PoolConfig {
  const config = connectionConfig(url,localTest);
  const prior = config.onConnect;
  const emitAccepted = createRuntimeRoleAcceptanceEmitter({ deployment_id: process.env.VERCEL_DEPLOYMENT_ID });
  const onConnect = async (client: Client) => {
    if (prior) await prior(client);
    let role: { safe?: boolean };
    try {
      ({rows:[role]} = await client.query(`WITH RECURSIVE inherited(oid) AS (
      SELECT oid FROM pg_roles WHERE rolname=session_user
      UNION SELECT m.roleid FROM pg_auth_members m JOIN inherited i ON m.member=i.oid
    ), checks AS (
    SELECT current_user=session_user AS identity_unchanged,
      pg_has_role(session_user,'talgov_runtime','USAGE') AS inherits_runtime,
      NOT EXISTS(SELECT 1 FROM pg_roles r JOIN inherited i ON i.oid=r.oid
        WHERE r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls
          OR r.rolname IN ('neondb_owner','postgres')) AS no_elevated_role,
      NOT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname IN ('app','public','r2_staging') AND nspowner IN (SELECT oid FROM inherited)) AS no_schema_ownership,
      NOT EXISTS(SELECT 1 FROM pg_database WHERE datname=current_database() AND datdba IN (SELECT oid FROM inherited)) AS no_database_ownership,
      NOT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname IN ('app','public','r2_staging') AND c.relowner IN (SELECT oid FROM inherited)) AS no_relation_ownership,
      NOT has_database_privilege(session_user,current_database(),'CREATE') AS no_database_create,
      NOT has_schema_privilege(session_user,'public','CREATE') AS no_public_create,
      NOT has_schema_privilege(session_user,'app','CREATE') AS no_app_create
    ) SELECT checks.*, current_user AS effective_role, session_user AS session_role, current_database() AS database_identity,
      identity_unchanged AND inherits_runtime AND no_elevated_role AND no_schema_ownership AND no_database_ownership AND
      no_relation_ownership AND no_database_create AND no_public_create AND no_app_create AS safe FROM checks`));
    } catch (error) {
      const observation = runtimeRoleSnapshot(undefined, 'not_evaluated', 'query_error');
      guardSnapshots.set(client, observation);
      throw sanitized(error, 'runtime_role', 'not_started', observation);
    }
    if (!role?.safe) {
      const observation = runtimeRoleSnapshot(role, 'rejected');
      guardSnapshots.set(client, observation);
      throw attachFailure(new DatabaseError('forbidden'), { phase: 'runtime_role', reason: 'runtime_role_guard_rejected', runtime_role: observation });
    }
    const observation = runtimeRoleSnapshot(role, 'accepted');
    guardSnapshots.set(client, observation);
    emitAccepted(observation);
  };
  runtimeGuards.add(onConnect);
  return { ...config, onConnect };
}

export interface SqlSession {
  query<T extends QueryResultRow = QueryResultRow>(sql: string, values?: unknown[]): Promise<T[]>;
}

export class PostgresDatabase {
  private readonly pool: Pool;
  private readonly runtimeGuarded: boolean;
  constructor(config: PoolConfig) {
    this.pool = new Pool(config);
    this.runtimeGuarded = !!config.onConnect && runtimeGuards.has(config.onConnect);
    // The pool has already removed idle failed clients. Never log provider errors/URLs.
    this.pool.on('error', () => undefined);
  }
  async transaction<T>(work: (session: SqlSession) => Promise<T>, readOnly = false): Promise<T> {
    let client: PoolClient | undefined;
    let discard = false;
    let phase: FailurePhase = 'connect';
    let observation: Readonly<RuntimeRoleSnapshot> | undefined;
    const onError = () => { discard = true; };
    try {
      client = await this.pool.connect();
      if (this.runtimeGuarded) {
        // A cached observation, never a fresh identity check of a pooled backend.
        const checked = guardSnapshots.get(client);
        observation = checked ? { ...checked, pool_observation: checked.decision !== 'accepted' ? 'checkout_after_rejection' : 'checkout_cached' }
          : runtimeRoleSnapshot(undefined, 'not_evaluated', 'not_observed');
      }
      client.on('error', onError);
      phase = 'transaction_setup';
      // One simple-protocol exchange, containing only fixed SQL. Keep every
      // setting transaction-local for PgBouncer, and await setup before work.
      // Reset the transaction timer before shortening it, as PostgreSQL requires.
      await client.query([
        readOnly ? 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY' : 'BEGIN',
        "SET LOCAL statement_timeout = '5s'",
        "SET LOCAL lock_timeout = '2s'",
        "SET LOCAL idle_in_transaction_session_timeout = '5s'",
        'SET LOCAL transaction_timeout = 0',
        "SET LOCAL transaction_timeout = '10s'",
      ].join('; '));
      const session: SqlSession = { query: async (sql, values = []) => {
        try { return (await client.query(sql, values)).rows; }
        catch (error) { throw sanitized(error, 'query'); }
      } };
      phase = 'work';
      const result = await work(session);
      phase = 'commit';
      await client.query('COMMIT');
      return result;
    } catch (error) {
      let outcome: TransactionOutcome = client ? 'unknown' : 'not_started';
      if (client) { try { await client.query('ROLLBACK'); if (phase !== 'commit') outcome = 'rollback_confirmed'; } catch { discard = true; } }
      throw sanitized(error, phase, outcome, observation);
    } finally { client?.removeListener('error', onError); client?.release(discard); }
  }
  async close() { await this.pool.end(); }
  async onModuleDestroy() { await this.close(); }
}
