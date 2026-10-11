# Sprint 7 backend deployment and operations

Date: 2026-10-11. Tickets: S7-BE-01 through S7-BE-04.

Repository implementation is available; **live launch acceptance remains pending**.
The owner reports that Supabase and Vercel environments are configured. Existing
environment files were preserved. A read-only query using the configured backend
credentials returned HTTP 200 from the canonical `roles` table, and local FE/BE
project URLs match. This does not verify Vercel's secret store, production migration
history, a staging restore, or production availability. No remote writes were made.

Local validation passed: backend lint/build, 54 Jest tests, 61 Node integration
tests (4 pre-existing payment-webhook TODOs), operational smoke tests, frontend
production build, and PostgreSQL fresh/upgrade/security plus backup/restore tests.
The frontend build still reports its existing large-bundle warning.

## Acceptance evidence

| Ticket | Repository support | Evidence still required before closure |
| --- | --- | --- |
| S7-BE-01 | Reproducible dependency installation; liveness/readiness endpoints; release and smoke workflow | S6-INT-01 sign-off, Vercel project/environment review, deployed health responses |
| S7-BE-02 | Schema/RLS verification, migration history gate, data manifests, rollback procedure | Production migration log, before/after data comparison, hosted staging rollback rehearsal |
| S7-BE-03 | Structured request status/duration logs; scheduled readiness and latency probes; webhook alerts | Enable monitor, configure request-log error/latency alerts, team receipt of test alerts |
| S7-BE-04 | Daily encrypted logical backup workflow; local dump/restore rehearsal | Enable schedule, retrieve/decrypt backup, hosted staging restore and measured recovery time |

Keep evidence in a restricted operations record: commit, operator, UTC timestamps,
project refs, migration versions, backup/run IDs, deployment URL, verification
results, alert delivery confirmation, and elapsed restore time. Never attach raw
dumps, environment files, access tokens, or citizen records to tickets.

## Existing hosting topology and launch order

The existing root `vercel.json` serves a static frontend and `api/index.js` in a
**single atomic deployment**. Backend compilation now precedes frontend compilation.
The release workflow preserves this existing project and its production environment.

The ticket's strict order is **DB migration -> BE deploy -> FE deploy -> smoke**.
With the current topology the executable order is **DB migration -> combined BE/FE
candidate -> smoke -> promote -> production smoke**. Separate BE and FE deployments
are not claimed. If separate deployment boundaries are mandatory, provision two
explicitly identified Vercel projects and a same-origin API proxy before using this
workflow. Do not infer a second project or silently change the existing hosting.

Disable Vercel's automatic Git production deployments for the release branch (or
disconnect Git deployments and use this workflow) so pushes cannot bypass the DB
gate. The workflow runs only by manual dispatch from the default branch and uses a
non-cancelling release concurrency lock. Configure the GitHub `production`
environment's review policy to have an operator check the supplied evidence links.
Links are audit references, not machine verification of their contents.

## Configuration inventory (reuse existing values)

In Vercel's **Production** scope, verify backend variables from
`backend/.env.example`: `NODE_ENV=production`, `SUPABASE_URL`, the server-only
service-role key, publishable/anon key, exact HTTPS `ALLOWED_ORIGINS`, `APP_URL`,
and `ENABLE_MOCK_DATA=false`. Confirm payment/email credentials only for enabled
features. The email outbox needs a separately scheduled worker; a serverless HTTP
deployment does not run `notifications:work` continuously.

Frontend build variables must identify the same Supabase project and contain only
public keys: `VITE_SUPABASE_URL`, publishable/anon key, and
`VITE_ENABLE_MOCK_DATA=false`. Keep dashboard preview disabled. Production uses
same-origin `/api`; `VITE_API_URL` is a development proxy setting. Configure exact
Supabase Auth Site URL, confirmation callback and password recovery redirects for
the production domain. Rebuild after changing public build variables.

GitHub Actions cannot read credentials already stored in the Vercel dashboard.
Populate these **GitHub environment** values only to enable automation;
do not replace the existing application credentials:

| Name | Type / purpose |
| --- | --- |
| `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VERCEL_TOKEN` | Secrets identifying/accessing the existing Vercel project |
| `VERCEL_CLI_VERSION` | Variable: exact reviewed CLI version, e.g. numeric `major.minor.patch`; required, no floating latest |
| `PRODUCTION_URL` | Variable: canonical HTTPS origin without a path or trailing slash |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Secret, only if candidate deployment protection requires it |
| `PRODUCTION_PGHOST`, `PRODUCTION_PGPORT`, `PRODUCTION_PGUSER`, `PRODUCTION_PGPASSWORD` | Secrets for Supabase direct/session database connection; never transaction pooler |
| `SUPABASE_DB_URL`, `SUPABASE_CLI_VERSION` | Backup secret: SSL-required direct/session connection URI; variable: exact reviewed Supabase CLI version |
| `ALERT_WEBHOOK_URL` | Secret: team's HTTPS webhook accepting a JSON `text` field |
| `BACKUP_AGE_RECIPIENT` | Variable: public age encryption recipient; private identity belongs in a separate recovery vault |
| `PRODUCTION_MONITOR_ENABLED`, `PRODUCTION_BACKUP_ENABLED` | Repository variables: set to `true` after configuration/testing; default disabled |
| `MONITOR_LATENCY_MS` | Variable: readiness latency threshold, default 2000 ms |

Use SSL and the provider's connection details. Restrict repository/environment access
and protect production credentials from untrusted workflow edits. Use a reviewed
CLI version consistently for the staging rehearsal and production release.
Release values belong to `production`. Scheduled backup/monitor values belong to
`production-operations`, restricted to the default branch and without per-run
review requirements so unattended jobs can run. Copy only the needed values:
backup DB URI/CLI version/age recipient, monitor URL/threshold, and alert webhook.

## Database migration and data verification (S7-BE-02)

1. Record S6-INT-01 sign-off and identify production and isolated staging projects.
   Compare actual schema/history before using `supabase/migrations`. This is a
   fresh-project chain; never replay its baseline on an existing populated database.
   Never run `legacy-migrations` as a chain or mark migrations applied merely to
   bypass the release gate. Reconcile drift in staging first.
2. Rehearse the exact commit on staging using synthetic data. Run the SQL checks
   below, exercise role access and critical workflows, and rehearse rollback.
3. Freeze writes (including background workers, integrations and direct clients).
   Capture a fresh backup and record its successful run ID. Capture a before
   manifest. These checks can scan large tables; use an appropriate maintenance
   window. Do not freeze reads unnecessarily.
4. With Supabase CLI authenticated and linked to the **confirmed** production ref,
   review `supabase migration list --linked` and `supabase db push --linked --dry-run`.
   Verify the proposed files against the staging run, then `supabase db push --linked`.
   Do not proceed through an unexpected migration, baseline, or destructive change.
5. Run schema/RLS and history checks, then capture the after manifest. Compare
   relation names, row counts and digests. Any change requires an explanation from
   the reviewed migration; new columns can legitimately change row digests. Stop
   the release if records disappeared or values changed unexpectedly. Hashes cover
   public/auth data, not migration-history timestamps or Storage object bytes.
6. Keep writes frozen until the deployment/smoke sequence is complete. Record the
   data comparison and migration results alongside the pre-release backup evidence.

Commands below use libpq `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`,
`PGDATABASE=postgres`, `PGSSLMODE=require` in a protected operator environment.
They read the database and print no row contents:

```sh
psql -X -v ON_ERROR_STOP=1 -f ops/verify-database.sql
node ops/check-migration-history.mjs
psql -X -qAt -v ON_ERROR_STOP=1 -f ops/data-manifest.sql > before.txt
# Apply reviewed migration(s), then repeat to after.txt and compare in a secure workspace.
```

`production-release.yml` intentionally **does not auto-apply migrations**. It gates
deployment on exact repository migration versions and schema/RLS checks after the
operator's controlled migration/data verification step. This avoids treating an
unknown existing production database as a fresh installation.

## Release and health verification (S7-BE-01)

Dispatch `Production release (existing combined Vercel project)` with the staging
and fresh backup evidence URLs. It runs backend and operational tests, checks DB
history/schema, pulls the existing Vercel production configuration, builds, deploys
a candidate with `--prod --skip-domain`, smokes it, promotes it, and smokes the public
domain. A failed candidate is never promoted. A failure after promotion requires
the operator's rollback decision; the workflow alerts and does not blindly restore
the database.

For manual checks, set `DEPLOYMENT_URL` to the deployment origin and run
`npm run ops:smoke`. It verifies uncached liveness and database readiness JSON,
anonymous access denial to a protected endpoint, root HTML and SPA deep linking.
It rejects a SPA fallback pretending to be an API response. It does not replace
authenticated citizen/admin, email and payment acceptance tests.

- `GET /api/health`: 200 when the application boots; no dependency call.
- `GET /api/health/ready`: 200 when the backend can read the canonical `roles`
  table, 503 on dependency error/timeout; database call bounded to three seconds.
- Both are public, have `Cache-Control: no-store`, and contain no project IDs,
  credentials, citizen data or internal errors. Readiness proves connectivity to
  one canonical table; full migration readiness is checked separately by SQL.

## Monitoring and team alerts (S7-BE-03)

Enable the uptime workflow after setting the production URL and webhook. Every
scheduled run samples readiness three times and alerts if at least two samples
fail or exceed the latency threshold. Failed alert delivery also fails the job.
It alerts again on each failing run; it has no persistent incident deduplication.
GitHub schedules can be delayed or disabled on inactive repositories, so use a
dedicated external uptime provider if a firm detection-time SLA is required.

Vercel application logs contain one `http_request` event per response with
`requestId`, method, route template, status and `durationMs`. Raw query strings,
bodies, user IDs, tokens and IPs are omitted; aborted responses use status 499.
Configure a Vercel log drain/observability provider to retain and aggregate these
events. Suggested initial alert rules (confirm with the team):

- Server error rate >= 5% over 5 minutes, minimum 20 requests, excluding health.
- p95 duration > 2000 ms over 5 minutes, minimum 20 requests; tune AI endpoints
  separately after measuring their baseline.
- Readiness unavailable, backup failure, or no successful backup in 26 hours.

Route these rules to the same team destination. In staging, deliberately point a
test monitor at an unavailable endpoint and confirm the team receives the alert.
Generate a controlled 500 and slow request in staging to test request-log rules.
Record delivery time, recipient acknowledgment and recovery. Do not simulate an
outage by modifying production secrets. Merely adding a webhook variable does not
prove team delivery; log-based alert rules still require provider configuration.

## Backups and restore rehearsal (S7-BE-04)

The backup workflow runs daily at 18:17 UTC (02:17 Asia/Shanghai the next day),
uses a pinned Supabase CLI to export roles/schema/data and migration history,
packages and encrypts them with age, and retains only ciphertext and its SHA-256
checksum in a restricted Actions artifact for 30 days. Restricted temporary SQL
files are removed on exit. Shell error checking prevents a failed dump from being
uploaded as a successful backup. The private age identity
is never supplied to the backup job. Test that recovery staff can retrieve it.

Enable Supabase managed backups/PITR appropriate to the existing plan as the
primary platform recovery path; inspect backup freshness and retention in the
dashboard. Do not assume plan coverage or incur a plan upgrade silently. A logical
dump complements this but does not include Storage object bytes, external secrets,
Auth provider settings or project configuration. Back up Storage objects separately
with provider tooling and maintain a protected configuration inventory.

Restore rehearsal on **isolated hosted staging**, never over production:

1. Record backup ID, version, checksum, encryption-key availability and start time.
   Verify `sha256sum -c database.tar.age.sha256`, then decrypt in a restricted
   scratch directory: `age --decrypt -i <recovery-identity> -o database.tar database.tar.age`.
2. Inspect `tar -tf database.tar` and extract into the restricted scratch directory.
   Use Supabase's managed restore/clone or its documented CLI roles/schema/data
   restore procedure for the staging project's version. Restore migration history
   separately from `history_schema.sql` and `history_data.sql`. Recreate custom
   Auth triggers and Storage policies from the reviewed migration definitions:
   the CLI excludes managed schema definitions. Configure required extensions and
   handle encryption root keys per the provider guide before importing encrypted
   columns. Never blindly replay the baseline or a whole pg_dump onto a populated
   managed project. Supply connection secrets through `PG*`, not literals.
3. Point only staging to the recovered database. Compare pre-backup and restored
   manifests, run schema/RLS checks, and test login, role denial, content, a synthetic
   form submission, audit and outbox behavior. Check Storage objects independently.
4. Simulate a failed additive migration in staging, stop writes, and recover to the
   recorded pre-migration snapshot using the same procedure. Confirm the previous
   application version can read it. Record the actual recovery time and data loss
   window, then securely remove decrypted scratch data.

Proposed objectives: RPO <= 24 hours for daily logical backups, RTO <= 4 hours.
These are targets, not measured guarantees. Select PITR if the municipality requires
a smaller data-loss window. A successful backup job alone does not close S7-BE-04.

The CLI schema/data exports are separate snapshots: freeze writes during a
pre-release backup and avoid concurrent schema changes during daily jobs. Managed
backups/PITR remain the consistent whole-platform recovery path.

`npm run test:db --prefix backend` rehearses a full logical dump/restore in an
isolated local PostgreSQL cluster with synthetic data, compares every public/auth
table's count and digest, and checks restored RLS/schema. It does not exercise the
hosted CLI/encryption pipeline, claim a hosted Supabase recovery test, or validate
restoration of managed platform internals.

## Rollback decision and procedure

Record the previous immutable Vercel deployment URL before release. If the new
application fails but schema changes are backward-compatible, restore that version
with Vercel's rollback controls and rerun smoke tests. Prefer an additive forward
database fix after review. Do not automatically run destructive down migrations.

If data corruption requires database recovery, freeze all writes first, capture the
failed state for investigation, and obtain the release owner's decision on the
recovery point and potentially lost writes. Restore the rehearsed backup/PITR point,
verify counts/digests/schema/access rules, then deploy the matching application
version and smoke it. Reconcile post-backup writes, payments and external email
side effects before reopening; database restoration cannot undo external actions.

## Provider references

- [Supabase migration deployment](https://supabase.com/docs/guides/deployment/database-migrations)
- [Supabase backup scope and retention](https://supabase.com/docs/guides/platform/backups)
- [Supabase CLI backup/restore procedure](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
- [Vercel candidate deployment and skip-domain](https://vercel.com/docs/cli/deploy)
- [Vercel promotion](https://vercel.com/docs/cli/promote)
