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
