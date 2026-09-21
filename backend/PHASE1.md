# Phase 1 backend foundation

Backend-only implementation. Frontend source files are unchanged.

## Verification

From the repository root:

```powershell
npm run lint --prefix backend
npm test --prefix backend
npm run build:backend
npm run test:db --prefix backend
npm run test:db --prefix backend -- -Advisors
```

The database runner requires PostgreSQL tools on PATH and PowerShell. It creates
a disposable loopback-only PostgreSQL instance, tests both supported layouts and
migration reapplication, then stops the instance. It retains logs in the printed
temporary directory. It never connects to a hosted project. `-Advisors` also runs
the Supabase CLI security advisor against those local databases.

The SQL tests execute real PostgreSQL policies and constraints using fixtures for
Supabase-owned auth/storage schemas. They do not run GoTrue, PostgREST, Storage,
or SMTP. Auth HTTP tests mock the Supabase boundary. The deployment test boots
the actual API entry and checks validation, middleware, and concurrent startup.

## Database setup

The repository contains incompatible historical layouts. The documented canonical
baseline is `DATABASE/PRODUCTION_SETUP.sql`, with text lookup keys and the
`certificate_requests` table used by existing services. V4 uses UUID lookup keys
and a compatibility view. Do not replay V3/V4 over the canonical baseline or run
`supabase db reset` against this mixed historical migration directory.

For a **fresh, empty Supabase project**, run `DATABASE/PHASE1_SETUP.sql` using psql.
It applies the canonical baseline and hardening atomically. Its `\ir` directives
are psql syntax, not SQL Editor syntax. The original baseline alone is not the
hardened provisioning path.

For an **existing canonical or V4 database**, apply only
`supabase/migrations/20260920075951_phase1_backend_security.sql` transactionally,
after verifying migration history in staging. Both layouts and reapplication are
tested. Do not run old bootstrap scripts afterward: they recreate permissive rules.
Review custom policies first: this migration intentionally replaces public-table
and storage-object policies to remove historical unrestricted access.

Existing relationships are preserved. The migration adds an audit table with a
user foreign key, profile/notification indexes, and a backend-only session RPC.
It enables RLS, makes views honor RLS, restricts privileged RPC invocation, pins
function search paths, and moves extensions out of the exposed schema. The known
V4 seeded administrator is quarantined only if its published default password is
still installed. Real accounts with changed credentials are unaffected.

## Authentication and frontend handoff

Configure backend `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and
`SUPABASE_PUBLISHABLE_KEY` (or legacy `SUPABASE_ANON_KEY`). Keep the service key
server-side. Frontend Auth must use the same project. Production CORS requires
exact `ALLOWED_ORIGINS`. Localhost is accepted automatically only outside production.
`TRUSTED_PROXIES` accepts only trusted proxy IPs/CIDRs; otherwise forwarded IPs are ignored.

| Endpoint | Request | HTTP 200 response |
| --- | --- | --- |
| `POST /api/auth/login` | `{ email, password }` | `{ success: true, data: { session, user } }` |
| `POST /api/auth/refresh` | `{ refresh_token }` | `{ success: true, data: { session, user } }` |
| `GET /api/auth/me` | Bearer token | `{ success: true, data: { user: { id, email }, profile } }` |
| `POST /api/auth/logout` | Bearer token | `{ success: true }` |

Use `Authorization: Bearer <access_token>`. Login/refresh create isolated,
nonpersistent Auth clients. Consume the rotated refresh token returned by refresh.
The API sets no cookies. Existing Supabase access tokens work after migration.
Signup, confirmation, and recovery remain Supabase Auth flows; configure redirect
allowlists and email delivery during frontend integration.

Logout revokes the current session. The API verifies each JWT and checks
`auth.sessions`, so revoked sessions immediately stop working here. Direct
Supabase APIs can still accept an unexpired JWT; configure a short JWT lifetime
and clear frontend session state on logout.

All routes require authentication unless explicitly `@Public()`. Role-restricted
routes require a nondeleted database profile, verified status, and exact role match.
JWT metadata cannot override the profile. Certificate administration accepts
`super_admin`, `admin`, `municipal_admin`, and `staff`. Scoped barangay/department
roles receive no municipality-wide access. Content editing permits verified
municipal administrators and editors.

Citizens can update only their own profile's `full_name` and their own notifications'
`is_read`. Privilege fields and private-record writes require trusted server APIs.
Legacy privileged browser RPC calls are intentionally revoked and need API integration.
Most public content endpoints retain their existing static data; CMS is a later phase.

Errors use `{ success: false, statusCode, error, message, timestamp, requestId }`;
validation messages can be arrays. Codes include 400, 401, 403, 413, 429, and 503.
Every response includes `X-Request-Id`; sensitive and error responses are not cached.
Existing success shapes remain compatible except public certificate tracking now
returns only status/timestamps, omitting applicant data, attachments, and internal
notes. Tracking queries use exact values instead of interpolated filter expressions.

## Runtime and security limits

Standalone and serverless entry points share validation, CORS, 1 MB body limits,
and request IDs. Nest serves the API; Vite/hosting serves the frontend. TypeScript
compilation precedes startup to preserve Nest DTO metadata. `api/index.js` imports
the compiled handler; Vercel builds the backend and includes `backend/dist/**`.
Concurrent cold requests share initialization. Generated backend bundles are no
longer committed.

Authentication is limited to 10 requests/minute/IP. Other categories retain their
limits. The bounded in-memory limiter is **per process**; multiple production
instances also need shared/gateway limiting. Supabase Auth's own limits still apply.

Audit events contain request ID, actor ID when available, method, route template,
status, and timestamp. Tokens, credentials, bodies, query strings, and applicant
details are excluded. Structured platform logs are always emitted. The append-only
database audit write after response completion is best effort: configure retained
platform logs/drains or a durable queue for compliance before production approval.

Storage policies enforce owner folders, size limits, and MIME allowlists. Issued
certificates are server-write-only. Content scanning belongs in the later upload flow.

## Environment verification still required

Apply the migration in staging before enabling the new auth endpoints. Verify real
login/refresh/logout, signup/recovery, CORS, storage uploads, and existing frontend
Supabase calls. No hosted database or deployment was modified. Local verification
does not establish production readiness.

References: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[getUser](https://supabase.com/docs/reference/javascript/auth-getuser),
[signOut](https://supabase.com/docs/reference/javascript/auth-signout),
[Nest validation](https://docs.nestjs.com/techniques/validation).
