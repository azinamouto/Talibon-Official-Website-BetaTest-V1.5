import { Pool, PoolClient, PoolConfig, QueryResultRow } from 'pg';

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
    if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !parsed.pathname.slice(1)) throw new Error();
    const local = ['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname);
    // Reject URL options that could override TLS, timeouts, or search_path.
    for (const [key, value] of parsed.searchParams) {
      if (key !== 'sslmode' || !['require', 'verify-full'].includes(value)) throw new Error();
    }
    if (localTest && !local) throw new Error();
    parsed.search = '';
    return {
      connectionString: parsed.toString(), ssl: localTest ? false : { rejectUnauthorized: true },
      max: 2, connectionTimeoutMillis: 5000, idleTimeoutMillis: 10000,
      statement_timeout: 5000, query_timeout: 12000, lock_timeout: 2000, idle_in_transaction_session_timeout: 5000,
      application_name: 'talgov-r2',
    };
  } catch { throw new DatabaseError('invalid'); }
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
