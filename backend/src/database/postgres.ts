import { Client, Pool, PoolClient, PoolConfig, QueryResultRow } from 'pg';
import { TLSSocket } from 'node:tls';

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
    if (!protocol.connection.stream.authorized || !message.mechanisms.includes('SCRAM-SHA-256-PLUS')) {
      this._handleAuthCleartextPassword();
      return;
    }
    (Client.prototype as unknown as PgProtocol)._handleAuthSASL.call(this, { mechanisms: ['SCRAM-SHA-256-PLUS'] });
  }
  _handleAuthCleartextPassword() {
    (this as unknown as PgProtocol).connection.emit('error', new DatabaseError('unavailable'));
  }
  _handleAuthMD5Password() { this._handleAuthCleartextPassword(); }
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

export function sanitized(error: unknown): DatabaseError {
  if (error instanceof DatabaseError) return error;
  const code = (error as { code?: string })?.code;
  return new DatabaseError(code === '23505' || code === '40001' || code === '40P01' ? 'conflict'
    : ['23001', '23502', '23503', '23514', '22P02', '22001'].includes(code) ? 'invalid' : 'unavailable');
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
        if (!boundClients.has(client)) throw new DatabaseError('unavailable');
      } } : {}),
      max: 2, connectionTimeoutMillis: 5000, idleTimeoutMillis: 10000,
      statement_timeout: 5000, query_timeout: 12000, lock_timeout: 2000, idle_in_transaction_session_timeout: 5000,
      application_name: 'talgov-r2',
    };
  } catch { throw new DatabaseError('invalid'); }
}

/** Runtime pools cannot connect as an owner, migrator or inherited administrator. */
export function runtimeConnectionConfig(url: string, localTest = false): PoolConfig {
  const config = connectionConfig(url,localTest);
  const prior = config.onConnect;
  return { ...config, onConnect: async (client: Client) => {
    if (prior) await prior(client);
    const {rows:[role]} = await client.query(`WITH RECURSIVE inherited(oid) AS (
      SELECT oid FROM pg_roles WHERE rolname=session_user
      UNION SELECT m.roleid FROM pg_auth_members m JOIN inherited i ON m.member=i.oid
    ) SELECT current_user=session_user AND
      pg_has_role(session_user,'talgov_runtime','USAGE') AND
      NOT EXISTS(SELECT 1 FROM pg_roles r JOIN inherited i ON i.oid=r.oid
        WHERE r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls
          OR r.rolname IN ('neondb_owner','postgres')) AND
      NOT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname IN ('app','public','r2_staging') AND nspowner IN (SELECT oid FROM inherited)) AND
      NOT EXISTS(SELECT 1 FROM pg_database WHERE datname=current_database() AND datdba IN (SELECT oid FROM inherited)) AND
      NOT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname IN ('app','public','r2_staging') AND c.relowner IN (SELECT oid FROM inherited)) AND
      NOT has_database_privilege(session_user,current_database(),'CREATE') AND
      NOT has_schema_privilege(session_user,'public','CREATE') AND
      NOT has_schema_privilege(session_user,'app','CREATE') AS safe`);
    if (!role?.safe) throw new DatabaseError('forbidden');
  } };
}

export interface SqlSession {
  query<T extends QueryResultRow = QueryResultRow>(sql: string, values?: unknown[]): Promise<T[]>;
}

export class PostgresDatabase {
  private readonly pool: Pool;
  constructor(config: PoolConfig) {
    this.pool = new Pool(config);
    // The pool has already removed idle failed clients. Never log provider errors/URLs.
    this.pool.on('error', () => undefined);
  }
  async transaction<T>(work: (session: SqlSession) => Promise<T>, readOnly = false): Promise<T> {
    let client: PoolClient | undefined;
    let discard = false;
    const onError = () => { discard = true; };
    try {
      client = await this.pool.connect();
      client.on('error', onError);
      await client.query(readOnly ? 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY' : 'BEGIN');
      // Transaction-local settings work with transaction pooling and cannot leak to another request.
      await client.query("SET LOCAL statement_timeout = '5s'");
      await client.query("SET LOCAL lock_timeout = '2s'");
      await client.query("SET LOCAL idle_in_transaction_session_timeout = '5s'");
      // PostgreSQL does not shorten an already-active transaction timer without resetting it.
      await client.query('SET LOCAL transaction_timeout = 0');
      await client.query("SET LOCAL transaction_timeout = '10s'");
      const session: SqlSession = { query: async (sql, values = []) => (await client.query(sql, values)).rows };
      const result = await work(session);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      if (client) { try { await client.query('ROLLBACK'); } catch { discard = true; } }
      throw sanitized(error);
    } finally { client?.removeListener('error', onError); client?.release(discard); }
  }
  async close() { await this.pool.end(); }
  async onModuleDestroy() { await this.close(); }
}
