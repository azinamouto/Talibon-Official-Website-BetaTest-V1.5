# Sprint 4 admin APIs

All endpoints use `/api/admin`, bearer authentication and API version 1. See
[the permission matrix](admin-rbac.md). OpenAPI is served at `/api/openapi.json`.
Apply canonical migrations in filename order before connecting the dashboard.

## Reports (S4-BE-02)

`GET /reports/submissions`, `/reports/payments`, `/reports/user-activity` accept
required `from` (inclusive) and `to` (exclusive) ISO timestamps with timezones.
Ranges must be positive and at most 366 days. `limit` defaults to 100, maximum 500.
Results are ordered by `(created_at DESC, id DESC)` and return `{data,nextCursor}`.
Pass both returned cursor fields (`before`, `beforeId`) unchanged to retrieve the
next page; stop when nextCursor is null. Keep the same range across pages.

Example: `/api/admin/reports/payments?from=2026-09-01T00:00:00Z&to=2026-10-01T00:00:00Z&limit=100`.

Each row is flat JSON suitable for export. Payment amounts are decimal strings
and currencies remain separate. The submission export includes soft-deleted
history, but excludes names, emails, attachments and form details. Payment exports
exclude provider references. Activity means recorded API audit events: authentication,
mutations and failed requests; it is not a page-view analytics feed. Existing audit
persistence is best-effort, so this report is not a guarantee that every request
was recorded. Role changes have a separate transactional audit ledger.

Exports reflect current rows, not a frozen database snapshot. Use a completed
historical interval for repeatable operational exports. Clients generating CSV
must quote fields and escape spreadsheet formulas. No unbounded CSV download or
full-table count is performed by these endpoints.

`backend/test/admin-reports.sql` inserts 100,000 synthetic rows per source into
disposable PostgreSQL, analyzes them, and times first, next and deep cursor pages.
It asserts a combined 2-second ceiling per source, exact date boundaries, decimal
amounts, cursor continuity, and denial of direct browser RPC execution. Run with
`npm run test:db --prefix backend`. This measures local database query execution;
it does not measure hosted network latency or concurrent production traffic.

## User management (S4-BE-03)

| Method and path | Behavior |
| --- | --- |
| `GET /users` | Paginated profiles; `page=1`, `limit=20` (maximum 100), optional role, `status=active\|inactive\|all`, optional `q` (1–100 characters, literal name/email substring) |
| `GET /users/:id` | View profile including version and deactivation timestamp |
| `PATCH /users/:id` | Update full_name, barangay_id, department_id, is_verified |
| `PATCH /users/:id/role` | Assign role; verified super admin only |
| `POST /users/:id/deactivate` | Soft-deactivate, preserving history |

Every mutation requires the latest integer `version`. For example,
`{"version":3,"role":"editor"}` assigns a role. Refetch on 409 before retrying;
never silently overwrite another administrator's changes. Profile updates accept
nullable department/barangay IDs to clear assignments. Email and Auth credentials
are intentionally outside this profile API. Reactivation is not provided.

Admins and municipal admins can manage lower-privilege profiles. Only a super
admin can change administrative profiles or assign roles. No administrator may
mutate their own profile through these endpoints. Role assignment does not verify
the account; verification is an explicit update. Inactive profiles cannot be edited.

The backend-only `admin_mutate_user` RPC rechecks the live actor and locks admin
mutations before reading profiles. It also enforces target restrictions, version
checks, and preservation of a verified super admin. Profile mutation and append-only
`admin_user_audit` insertion commit together; an audit failure rolls back the mutation.
The ledger stores actor, target, action, request ID, timestamp, and old/new role,
verification, deactivation and version values. Names/emails are not duplicated in
this ledger. The service role has only SELECT/INSERT privileges on it. Database
owners remain capable of maintenance; this is not a tamper-proof external archive.

Deactivation blocks subsequent NestJS requests and authenticated Data API/Storage
access through restrictive active-profile policies, even with an existing JWT.
It does not delete the Supabase Auth identity or revoke the JWT itself. Anonymous
public content remains public. Existing in-flight requests and already-issued
signed file URLs cannot be recalled by these checks. New protected tables must
also include the active-account restriction in their migrations.

Validation includes HTTP route/permission/DTO/OpenAPI tests plus real PostgreSQL
tests for escalation denial, stale writes, immutable audit grants, audit rollback,
and deactivated-token RLS denial. The migration requires the canonical schema;
the archived V4 schema still needs reconciliation before Sprint 2–4 migrations.

## Validation record

The report benchmark passed on both fresh canonical migrations and PHASE1_SETUP
upgrade paths with 100,000 rows in each of the three report sources. First, next
and deep cursor pages together measured 34–196 ms per source in the final local run. These
are development-machine measurements, not a production latency guarantee.

Database design references: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
and [backend RPC calls](https://supabase.com/docs/reference/javascript/rpc).
