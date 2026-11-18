import { Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

const PHASES = ['configuration', 'ip_validation', 'connect', 'tls', 'channel_binding', 'runtime_role', 'transaction_setup', 'work', 'query', 'commit', 'response'] as const;
const REASONS = ['ip_missing', 'ip_non_string', 'ip_ambiguous', 'ip_invalid', 'invalid_configuration', 'media_category_missing', 'cms_schema_missing', 'cms_permission_missing', 'connection_failure', 'connection_timeout', 'tls_failure', 'channel_binding_rejected', 'database_authentication_failed', 'runtime_role_guard_rejected', 'permission_denied', 'relation_missing', 'column_missing', 'query_timeout', 'query_cancelled', 'lock_unavailable', 'transaction_timeout', 'idle_transaction_timeout', 'database_conflict', 'invalid_database_input', 'unexpected_exception'] as const;
const OUTCOMES = ['not_started', 'rollback_confirmed', 'commit_confirmed', 'unknown'] as const;
const OPERATIONS = ['ip_validation', 'configuration', 'throttle_cleanup', 'throttle_upsert', 'throttle_result', 'audit_insert', 'content_list', 'content_save', 'content_publish', 'media_upload', 'media_operation', 'unexpected'] as const;
const ROUTES = ['liveness', 'readiness', 'news', 'pages', 'services', 'about_profile', 'admin_content_news', 'admin_content', 'admin_media_uploads', 'admin_media', 'other'] as const;
const TLS_CODES = ['CERT_HAS_EXPIRED', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'SELF_SIGNED_CERT_IN_CHAIN', 'UNABLE_TO_GET_ISSUER_CERT', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'ERR_TLS_CERT_ALTNAME_INVALID'] as const;
const CONNECTION_CODES = ['08000', '08001', '08003', '08004', '08006', '08007', '08P01', 'ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'EHOSTUNREACH', 'ENETUNREACH', 'EPIPE', 'ETIMEDOUT'] as const;
const CODES = new Set<string>([...TLS_CODES, ...CONNECTION_CODES, '28P01', '28000', '42501', '42P01', '42703', '57014', '55P03', '25P03', '25P04', '53300', '23505', '40001', '40P01', '23001', '23502', '23503', '23514', '22P02', '22001']);
export const RUNTIME_ROLE_PREDICATES = Object.freeze(['identity_unchanged', 'inherits_runtime', 'no_elevated_role', 'no_schema_ownership', 'no_database_ownership', 'no_relation_ownership', 'no_database_create', 'no_public_create', 'no_app_create'] as const);
const PREDICATE_RESULTS = ['pass', 'fail', 'null', 'unavailable'] as const;
const ROLE_IDENTITIES = ['talgov_staging_runtime', 'talgov_runtime', 'talgov_staging_migrator', 'neondb_owner', 'postgres', 'other', 'unavailable'] as const;
const DATABASE_IDENTITIES = ['neondb', 'other', 'unavailable'] as const;
const GUARD_DECISIONS = ['accepted', 'rejected', 'not_evaluated'] as const;
const GUARD_RESULTS = ['complete', 'incomplete', 'inconsistent', 'row_missing', 'query_error', 'not_observed'] as const;
const SAFE_RESULTS = ['true', 'false', 'null', 'unavailable'] as const;
const POOL_OBSERVATIONS = ['on_connect', 'checkout_cached', 'checkout_unobserved', 'checkout_after_rejection'] as const;
export interface RuntimeRoleSnapshot {
  decision: typeof GUARD_DECISIONS[number];
  result_status: typeof GUARD_RESULTS[number];
  safe_result: typeof SAFE_RESULTS[number];
  effective_role: typeof ROLE_IDENTITIES[number];
  session_role: typeof ROLE_IDENTITIES[number];
  database_identity: typeof DATABASE_IDENTITIES[number];
  predicates: Readonly<Record<typeof RUNTIME_ROLE_PREDICATES[number], typeof PREDICATE_RESULTS[number]>>;
  pool_observation: typeof POOL_OBSERVATIONS[number];
}
export type FailurePhase = typeof PHASES[number];
export type TransactionOutcome = typeof OUTCOMES[number];
export type FailureOperation = typeof OPERATIONS[number];
export type DiagnosticRoute = typeof ROUTES[number];
export interface FailureMetadata {
  phase: FailurePhase;
  reason: typeof REASONS[number];
  error_code?: string;
  transaction_outcome?: TransactionOutcome;
  runtime_role?: Readonly<RuntimeRoleSnapshot>;
}
export interface FailureContext {
  component: 'rate_limiter' | 'audit' | 'content' | 'media';
  operation: FailureOperation;
  route?: DiagnosticRoute;
  request_id?: string;
  elapsed_ms?: number;
  phase?: FailurePhase;
  transaction_outcome?: TransactionOutcome;
}

// Metadata is never an enumerable exception property or a provider error/cause.
const metadata = new WeakMap<object, Readonly<FailureMetadata>>();
const isObject = (value: unknown): value is object => value !== null && typeof value === 'object';
function scalar(value: unknown, key: string): unknown {
  try { return isObject(value) ? Object.getOwnPropertyDescriptor(value, key)?.value : undefined; } catch { return undefined; }
}
function member<T extends string>(choices: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (choices as readonly string[]).includes(value);
}
function identity<T extends string>(choices: readonly T[], value: unknown): T | 'other' | 'unavailable' {
  return member(choices, value) ? value : typeof value === 'string' ? 'other' : 'unavailable';
}
function predicate(value: unknown): typeof PREDICATE_RESULTS[number] {
  return value === true ? 'pass' : value === false ? 'fail' : value === null ? 'null' : 'unavailable';
}
/** Read only fixed scalar fields; never retain the pg row or arbitrary identities. */
export function runtimeRoleSnapshot(row: unknown, decision: RuntimeRoleSnapshot['decision'], unavailable?: 'query_error' | 'not_observed'): Readonly<RuntimeRoleSnapshot> {
  const predicates = Object.freeze(Object.fromEntries(RUNTIME_ROLE_PREDICATES.map(key => [key, predicate(scalar(row, key))]))) as RuntimeRoleSnapshot['predicates'];
  const safe = scalar(row, 'safe');
  const complete = RUNTIME_ROLE_PREDICATES.every(key => predicates[key] === 'pass' || predicates[key] === 'fail');
  const override = unavailable === 'query_error' || unavailable === 'not_observed' ? unavailable : undefined;
  const result = override ?? (row == null ? 'row_missing' : typeof safe !== 'boolean' || !complete ? 'incomplete'
    : safe !== RUNTIME_ROLE_PREDICATES.every(key => predicates[key] === 'pass') ? 'inconsistent' : 'complete');
  return Object.freeze({ decision: member(GUARD_DECISIONS, decision) ? decision : 'not_evaluated', result_status: result, safe_result: safe === true ? 'true' : safe === false ? 'false' : safe === null ? 'null' : 'unavailable',
    effective_role: identity(ROLE_IDENTITIES, scalar(row, 'effective_role')), session_role: identity(ROLE_IDENTITIES, scalar(row, 'session_role')),
    database_identity: identity(DATABASE_IDENTITIES, scalar(row, 'database_identity')), predicates,
    pool_observation: override === 'not_observed' ? 'checkout_unobserved' : 'on_connect' });
}
function validatedRuntimeRole(value: object): Readonly<RuntimeRoleSnapshot> {
  const decision = scalar(value, 'decision'), result = scalar(value, 'result_status'), safe = scalar(value, 'safe_result');
  const observation = scalar(value, 'pool_observation'), predicates = scalar(value, 'predicates');
  return Object.freeze({ decision: member(GUARD_DECISIONS, decision) ? decision : 'not_evaluated',
    result_status: member(GUARD_RESULTS, result) ? result : 'incomplete', safe_result: member(SAFE_RESULTS, safe) ? safe : 'unavailable',
    effective_role: identity(ROLE_IDENTITIES, scalar(value, 'effective_role')), session_role: identity(ROLE_IDENTITIES, scalar(value, 'session_role')),
    database_identity: identity(DATABASE_IDENTITIES, scalar(value, 'database_identity')),
    predicates: Object.freeze(Object.fromEntries(RUNTIME_ROLE_PREDICATES.map(key => {
      const result = scalar(predicates, key); return [key, member(PREDICATE_RESULTS, result) ? result : 'unavailable'];
    }))) as RuntimeRoleSnapshot['predicates'],
    pool_observation: member(POOL_OBSERVATIONS, observation) ? observation : 'checkout_unobserved' });
}

/** One attempt per pool guard instance, only for its first complete fresh acceptance. */
export function createRuntimeRoleAcceptanceEmitter(context: { deployment_id?: unknown } = {}, logger?: Pick<Logger, 'log'>): (snapshot: unknown) => void {
  let poolId: string, deploymentId: unknown, sink: Pick<Logger, 'log'>;
  try {
    poolId = randomUUID();
    deploymentId = scalar(context, 'deployment_id');
    sink = logger ?? new Logger('RuntimeRoleDiagnostics');
  } catch { return () => undefined; }
  let attempted = false;
  return value => {
    try {
      if (attempted || !isObject(value)) return;
      const snapshot = validatedRuntimeRole(value);
      if (snapshot.decision !== 'accepted' || snapshot.result_status !== 'complete' || snapshot.safe_result !== 'true' ||
          snapshot.pool_observation !== 'on_connect' || snapshot.effective_role === 'unavailable' || snapshot.session_role === 'unavailable' ||
          !RUNTIME_ROLE_PREDICATES.every(key => snapshot.predicates[key] === 'pass')) return;
      // Consume before logging: failure/re-entry cannot cause retries or duplicate success events.
      attempted = true;
      const output: unknown = sink.log(JSON.stringify({
        event: 'runtime_role_guard_accepted', component: 'postgres_runtime', connection_pool_id: poolId,
        ...(typeof deploymentId === 'string' && /^dpl_[A-Za-z0-9]{1,80}$/.test(deploymentId) ? { deployment_id: deploymentId } : {}),
        runtime_role: { effective_role: snapshot.effective_role, session_role: snapshot.session_role,
          predicates: snapshot.predicates, safe_result: true, decision: 'accepted', result_status: 'complete', pool_observation: 'on_connect' },
      }));
      if (output instanceof Promise) void output.catch(() => undefined);
    } catch { /* Telemetry cannot change guard admission, denial or connection state. */ }
  };
}
export function failureCode(error: unknown): string | undefined {
  const code = scalar(error, 'code');
  return typeof code === 'string' && CODES.has(code) ? code : undefined;
}
/** Staff diagnostics contain only fixed classifications and allowlisted codes. */
export function emitStaffAuthFailure(error: unknown, operation: 'pool' | 'request' | 'initialization',
  logger: Pick<Console, 'error'> = console): void {
  try {
    const safeOperation = operation === 'pool' || operation === 'initialization' ? operation : 'request';
    const details = classifyFailure(error, safeOperation === 'pool' ? 'connect' : safeOperation === 'initialization' ? 'configuration' : 'work');
    const output: unknown = logger.error(JSON.stringify({ event: 'staff_auth_failure', component: 'staff_auth',
      operation: safeOperation, phase: details.phase, reason: details.reason,
      ...(details.error_code ? { error_code: details.error_code } : {}) }));
    if (output instanceof Promise) void output.catch(() => undefined);
  } catch { /* Logging cannot replace the authentication failure or response. */ }
}
export function attachFailure<T>(error: T, details: FailureMetadata): T {
  try {
    const phase = scalar(details, 'phase');
    const reason = scalar(details, 'reason');
    const code = scalar(details, 'error_code');
    const outcome = scalar(details, 'transaction_outcome');
    const runtimeRole = scalar(details, 'runtime_role');
    if (isObject(error)) metadata.set(error, Object.freeze({
      phase: member(PHASES, phase) ? phase : 'work',
      reason: member(REASONS, reason) ? reason : 'unexpected_exception',
      ...(typeof code === 'string' && CODES.has(code) ? { error_code: code } : {}),
      ...(member(OUTCOMES, outcome) ? { transaction_outcome: outcome } : {}),
      ...(isObject(runtimeRole) ? { runtime_role: validatedRuntimeRole(runtimeRole) } : {}),
    }));
  } catch { /* Diagnostics cannot replace the original failure. */ }
  return error;
}
export function classifyFailure(error: unknown, phase: FailurePhase = 'work'): Readonly<FailureMetadata> {
  try {
    const saved = isObject(error) ? metadata.get(error) : undefined;
    if (saved) return saved;
  } catch { /* Hostile objects fall through to the fixed classification. */ }
  const code = failureCode(error);
  const message = scalar(error, 'message');
  let reason: FailureMetadata['reason'] = 'unexpected_exception';
  if (code && (TLS_CODES as readonly string[]).includes(code)) { phase = 'tls'; reason = 'tls_failure'; }
  else if (message === 'timeout exceeded when trying to connect' || message === 'Connection terminated due to connection timeout' || (code === 'ETIMEDOUT' && phase === 'connect')) reason = 'connection_timeout';
  else if (code && (CONNECTION_CODES as readonly string[]).includes(code)) reason = 'connection_failure';
  else if (code === '28P01' || code === '28000') reason = 'database_authentication_failed';
  else if (code === '42501') reason = 'permission_denied';
  else if (code === '42P01') reason = 'relation_missing';
  else if (code === '42703') reason = 'column_missing';
  else if (message === 'Query read timeout' || (code === '57014' && message === 'canceling statement due to statement timeout')) reason = 'query_timeout';
  else if (code === '57014') reason = 'query_cancelled';
  else if (code === '55P03') reason = 'lock_unavailable';
  else if (code === '25P04') reason = 'transaction_timeout';
  else if (code === '25P03') reason = 'idle_transaction_timeout';
  else if (code && ['23505', '40001', '40P01'].includes(code)) reason = 'database_conflict';
  else if (code && ['23001', '23502', '23503', '23514', '22P02', '22001'].includes(code)) reason = 'invalid_database_input';
  return Object.freeze({ phase: member(PHASES, phase) ? phase : 'work', reason, ...(code ? { error_code: code } : {}) });
}

export function diagnosticRoute(path: unknown): DiagnosticRoute {
  if (path==='/api/admin/media/uploads') return 'admin_media_uploads';
  if (typeof path==='string' && /^\/api\/admin\/media(?:\/|$)/.test(path)) return 'admin_media';
  if (typeof path==='string' && /^\/api\/admin\/content\/news(?:\/|$)/.test(path)) return 'admin_content_news';
  if (typeof path==='string' && path.startsWith('/api/admin/content/')) return 'admin_content';
  switch (path) {
    case '/api/health': return 'liveness';
    case '/api/health/ready': return 'readiness';
    case '/api/news': return 'news';
    case '/api/pages': return 'pages';
    case '/api/services': return 'services';
    case '/api/about/profile': return 'about_profile';
    default: return 'other';
  }
}

/** Fixed-schema, failure-only logging. Never stringify the supplied exception/context. */
export function emitFailure(error: unknown, context: FailureContext, logger: Pick<Logger, 'warn'>): void {
  try {
    const phase = scalar(context, 'phase');
    const operation = scalar(context, 'operation');
    const route = scalar(context, 'route');
    const details = classifyFailure(error, member(PHASES, phase) ? phase : 'work');
    const requestId = scalar(context, 'request_id');
    const elapsed = scalar(context, 'elapsed_ms');
    const outcome = details.transaction_outcome ?? scalar(context, 'transaction_outcome');
    logger.warn(JSON.stringify({
      event: 'runtime_dependency_failure',
      component: scalar(context, 'component') === 'audit' ? 'audit' : scalar(context, 'component') === 'content' ? 'content' : scalar(context, 'component') === 'media' ? 'media' : 'rate_limiter',
      operation: member(OPERATIONS, operation) ? operation : 'unexpected',
      route: member(ROUTES, route) ? route : 'other',
      phase: details.phase, reason: details.reason,
      ...(details.error_code ? { error_code: details.error_code } : {}),
      ...(typeof requestId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId) ? { request_id: requestId.toLowerCase() } : {}),
      ...(typeof elapsed === 'number' && Number.isFinite(elapsed) ? { elapsed_ms: Math.round(Math.max(0, Math.min(60000, elapsed))) } : {}),
      ...(member(OUTCOMES, outcome) ? { transaction_outcome: outcome } : {}),
      ...(details.runtime_role ? { runtime_role: details.runtime_role } : {}),
    }));
  } catch { /* Logging cannot weaken denial, change exceptions or delay audit completion. */ }
}
