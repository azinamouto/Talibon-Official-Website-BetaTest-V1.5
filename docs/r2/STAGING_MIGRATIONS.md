# R2 staging migration operator procedure


Current status (2026-11-10): **operator reports 6 applied, 0 pending; all six history entries verified**. See [post-migration evidence and runtime handoff](STAGING_READINESS.md#post-migration-runtime-integration---2026-11-10). Execution timestamp/protected output reference remain to be attached; no hosted rerun or independent verification occurred in this session. The pre-apply procedure and historical approval records below are retained for provenance, not an instruction to reapply migrations.


## Final retained scope and executable test preparation - 2026-11-09

Retain all five existing SQL files, their ordered manifest checksums and the catalog baseline unchanged: 20 application tables, including `app.import_batches` and `app.content_asset_links`. No 18-table alternative, migration rewrite, new CMS architecture or page/news/service editing activation. The final decision and current mandatory prerequisites are in [STAGING_READINESS.md](STAGING_READINESS.md#final-cms-database-scope-decision---2026-11-09).

The recorded ALZA authorization already covers the pinned staging provisioning, inspection, preflight and five-migration apply. References below to obtaining separate/renewed owner permission are historical and do not require repeating that authorization. Recovery, security disposition, two-person candidate review, credentials and freeze/window records remain mandatory. No acknowledgment variable substitutes for those records.

Reuse the recorded 41/41 staging database result and existing runner. These are the exact existing local synthetic workflows, from the repository root, in a clean process environment without inherited hosted auth/database/Neon or Node preload settings:

```powershell
npm.cmd run build:tsc --prefix backend
if ($LASTEXITCODE -ne 0) { throw 'Build failed' }
powershell -NoProfile -ExecutionPolicy Bypass -File backend/test/run-staging-database-tests.ps1
if ($LASTEXITCODE -ne 0) { throw 'Staging database tests failed' }
node --test backend/test/media.test.cjs backend/test/local-staging-fixture.test.cjs
if ($LASTEXITCODE -ne 0) { throw 'Media or fixture checks failed' }
powershell -NoProfile -ExecutionPolicy Bypass -File backend/test/run-auth-database-tests.ps1
if ($LASTEXITCODE -ne 0) { throw 'Better Auth integration failed' }
powershell -NoProfile -ExecutionPolicy Bypass -File backend/test/run-media-database-tests.ps1
if ($LASTEXITCODE -ne 0) { throw 'Media CMS integration failed' }
```

Prerequisites: installed existing dependencies, Node and PostgreSQL tools on PATH; preserve the existing provider SQL so the auth suite cannot take its missing-file generation path. Auth/media wrappers each create a fresh loopback cluster and `r2_auth_test`, set their own local `R2_AUTH_TEST_URL`, and stop/remove their synthetic cluster afterward. Keep `R2_AUTH_HOSTED` unset. Before execution verify resolved temporary cleanup paths remain inside the intended temporary directory. These commands are prepared, not newly executed by this documentation update.

Fixture workflow: the auth suite creates random `example.invalid` staff/passwords, enrolls fresh TOTP/recovery factors, and checks closed registration, MFA/replay, recovery/revocation, role isolation and immutable audit; password-reset delivery is an in-process sink. The media suite creates synthetic admin/editor/session/source/category rows and generated tiny images/passive PDFs, then checks upload, private download, photo/document publish/unpublish, deletion authorization, reconciliation and audit atomicity. Its auth and object storage are mocked. Capture only sanitized outcomes/counts, never credentials, cookies, factors or payloads. These media operations do not enable page/news/service editing.

Hosted execution is a later distinct qualification: these local suites apply schema/create test roles themselves and must not be pointed directly at the retained staging database. Existing `:neon` wrappers target development and remain excluded. A reviewed staging-bound fixture harness, verified restricted runtime identity and isolated private bucket/scoped object credentials are prerequisites for hosted auth/media writes, not additional prerequisites for schema-only preflight. Track generated fixture IDs/object keys and retain immutable audit/history evidence. No hosted runtime/storage qualification is claimed.


## Current execution disposition - 2026-11-09

Owner AJ Rienze Josol explicitly authorized staging provisioning, hosted inspection, preflight and the five existing migrations in this session. Recorded at 2026-11-09 01:51:47 Asia/Shanghai (UTC+08:00); exact scope and candidate hashes are in STAGING_READINESS.md. This supersedes historical missing/expired owner-permission language, but neither review column below has been signed and no mandatory gate has been waived.

Preflight and apply were not invoked: required credentials are absent, and recovery acceptance, incident/dependency disposition, two-person review and freeze/escalation records remain incomplete. Do not generate the apply acknowledgment until those gates and successful preflight evidence exist.

### Prepared synthetic Better Auth and photo/document CMS checks

Use generated example.invalid identities, random passwords and fresh factors; generated tiny PNG/JPEG/WebP files and passive PDFs only. Never import real staff, sessions, documents or government records. Capture counts/statuses only, never passwords, cookies, TOTP seeds, backup codes or connection strings.

| Area | Existing test source / assertions | Hosted disposition |
|---|---|---|
| Better Auth | backend/test/staff-auth.integration.cjs: closed registration, password-only denial, mandatory MFA, invalid/replayed TOTP, single-use recovery, expiry/revocation, admin/editor isolation, immutable audit | Prepared, not executed against staging |
| Photo/document validation | backend/test/media.test.cjs: valid generated formats, corrupt/spoofed/oversized/active-file rejection, safe names, exact origin and JSON, checksum/idempotent offline reconciliation | Local-only verification; no hosted storage |
| CMS workflow | backend/test/media.integration.cjs: anonymous draft denial, editor/admin boundaries, private upload/download, publish/unpublish, PDF attachment/preview, stale MFA deletion denial, retry/reconciliation and audit atomicity | Prepared; existing suite uses mocked auth/storage, so it cannot establish real hosted auth/storage qualification |

Local execution result: backend build passed; the four media checks and two fixture guards passed (6/6, exit 0). The staging database safety suite separately passed 41/41. Better Auth and CMS workflow integration remain unexecuted in this session.

Hosted test safety blockers: schema/preflight gates are incomplete; no verified staging runtime identity, isolated private bucket or scoped object credentials are supplied. The existing r2-auth-neon-qualify.cjs uses the development selector and temporary databases/role memberships; r2-media-neon-qualify.cjs pins br-bold-art-aolg7usz. Neither is a staging test runner and neither was invoked or retargeted. Do not run their npm :neon commands for this task. A staging-specific harness must preserve metadata/TLS guards, use reviewed runtime privileges, target only this approved branch and track synthetic fixture IDs/keys for scoped cleanup without destroying migration history or immutable audit evidence. External delivery stays disabled; recovery delivery uses a local sink. No hosted-write test is currently technically safe.


Implementation is local-tested only. No hosted execution is authorized by this
document. As inspected on 2026-11-09, the existing target now pins branch
`br-steep-sea-ao0qw05a`, endpoint `ep-sparkling-bird-ao5precf`, its direct host
and migrationLogin `talgov_staging_migrator`. Pins are not approval. See the
[final preflight assessment](STAGING_READINESS.md#final-preflight-preparation---2026-11-09-asiashanghai-utc0800)
for operator-supplied observations and the outstanding gates.
Never substitute main, development, production, or pooled endpoints.

## Review and prerequisites

1. Obtain written ALZA infrastructure-owner authorization for empty schema-only
   staging, a maintenance/write freeze, verified documented empty baseline, and
   two-person target/checksum review. These organizational approvals remain
   external evidence; an environment variable cannot establish their authenticity.
   Complete the [ALZA authorization record](STAGING_READINESS.md#staging-authorization-record---preparation-2026-11-08),
   including security-owner acceptance of incident closure with credential
   revocation/rotation and access-log review evidence. This path includes no real
   LGU data, official content, production deployment or external integrations;
   those retain their separate applicable approvals. ALZA ownership alone does
   not authorize hosted reads or schema apply.
2. Review `backend/scripts/staging/target.json`. The existing project is pinned,
   not newly approved by this change. Fill only approved staging branch ID,
   direct endpoint ID/hostname and restricted migrationLogin; verify organization, region
   and exact staging name. No CLI/environment target override exists.
3. Preserve PostgreSQL 18 database `neondb` ownership as `neondb_owner`
   (`databaseOwner` is pinned). Preserve public schema owner `pg_database_owner`.
   Separately provision a restricted LOGIN migrator and `talgov_runtime` NOLOGIN,
   both without SUPERUSER, CREATEDB, CREATEROLE, REPLICATION, BYPASSRLS or any
   memberships. Never grant the migrator `neon_superuser` or `neondb_owner`.
   The migrator owns TalGov objects, `app`, and `r2_staging`, not the database.
   Grant database CONNECT/CREATE and public USAGE/CREATE without grant options.
   Revoke database CREATE/TEMP from PUBLIC/runtime and TEMP from the migrator.
   Allow no other non-owner database CREATE/TEMP or schema CREATE grantees.
   Globally revoke default function EXECUTE from PUBLIC for the migrator;
   a schema-local revoke is insufficient. All stored migrator default ACLs must
   grant nothing to other roles. Runtime LOGIN identities need separate review.
4. Securely inject `R2_STAGING_DATABASE_URL` and `NEON_API_KEY` into the process
   environment using the approved secret manager. Do not put secrets in command
   history, logs or this repository. The URL must use the pinned migrationLogin,
   direct host, `neondb`, port 5432, `sslmode=verify-full` and
   `channel_binding=require`. The existing database utility enforces certificate
   verification and SCRAM channel binding. No dotenv files are loaded.

Live authenticated GETs against the fixed Neon API origin verify project,
organization, region, PostgreSQL version, branch ID/name/non-default status and
endpoint ownership/type/hostname before connecting. Metadata is rechecked under
the lock and before commit. Redirects, unavailable/incomplete metadata and
mismatches fail closed. PostgreSQL database/user checks supplement this evidence;
they do not establish branch identity. See the official
[endpoint metadata API](https://neon.com/docs/reference/api/endpoints/get-project-endpoint).
Protect the API credential, checkout and provisioning authority; this procedure
does not defend against an authorized administrator concurrently reassigning
resources or altering the runner. Freeze control-plane changes during execution.

## Next manual staging provisioning steps (not executed)

After the approvals above, an authorized administrator must review and pin the
staging branch, direct endpoint/host and chosen migrator name in `target.json`.
Keep `databaseOwner` set to `neondb_owner`. On the approved empty `neondb`, confirm
its existing owner and the public schema owner first; STOP on a mismatch rather
than transferring Neon-managed ownership. Review existing grants/memberships;
remove unexpected grants individually with owner approval.

The following is the exact fresh-role SQL template for the administrator, using
`talgov_staging_migrator` as the reviewed `migrationLogin`. It is documentation,
not a runner action; do not run against main/development/production. Existing
roles must be inspected rather than blindly recreated. Set the LOGIN password
through the approved secret manager/provider mechanism, never in this script.

```sql
CREATE ROLE talgov_staging_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
  NOREPLICATION NOBYPASSRLS;
CREATE ROLE talgov_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
  NOREPLICATION NOBYPASSRLS;
REVOKE CREATE, TEMPORARY ON DATABASE neondb FROM PUBLIC, talgov_runtime;
REVOKE TEMPORARY ON DATABASE neondb FROM talgov_staging_migrator;
GRANT CONNECT, CREATE ON DATABASE neondb TO talgov_staging_migrator;
REVOKE CREATE ON SCHEMA public FROM PUBLIC, talgov_runtime;
GRANT USAGE, CREATE ON SCHEMA public TO talgov_staging_migrator;
```

Then connect directly as the restricted migrator and execute the global default
change before preflight (or have an administrator with the required authority
execute it FOR ROLE the migrator):

```sql
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
```

Do not add `IN SCHEMA`: absent global ACL rows fall back to PostgreSQL's PUBLIC
EXECUTE default. Do not pre-create app/history objects. Securely inject the
restricted URL and API credential, obtain separate hosted read authorization,
then run the preflight command below. Apply requires separate written approval.

## Two-person staging migration review

**PENDING - preparation only, 2026-11-08.** Two distinct people must review the
same candidate and target. Each records name/role, decision, timestamp/timezone
and external written evidence reference. An acknowledgment variable is not a
signature. Do not populate approvals from local test results.

| Review record | Migration operator | Independent reviewer |
|---|---|---|
| Identity, decision, date/time and evidence reference | PENDING | PENDING |
| Exact candidate commit plus all uncommitted/untracked runner, target, manifest and catalog content identified by reviewed hashes | PENDING | PENDING |
| Target identity and provisioning evidence accepted | PENDING | PENDING |
| Ordered migration checksums and catalog baseline accepted | PENDING | PENDING |
| Recovery baseline, freeze, stop procedure and authorized preflight scope accepted | PENDING | PENDING |
| Separate apply scope/window accepted (required before apply only) | PENDING | PENDING |

- [ ] **PENDING:** Match `backend/scripts/staging/target.json` to external
  ownership evidence: project, organization, region, PostgreSQL 18, exact staging
  name, non-default branch ID, direct endpoint ID/host and restricted migrationLogin.
  Reject production/development/main and pooled endpoints. Null fields remain
  blockers; approval of existing pins is not implied by their presence.
- [ ] **PENDING:** Review administrator evidence for `neondb_owner` database
  ownership, `pg_database_owner` public ownership, restricted migrator and
  `talgov_runtime` NOLOGIN, no elevated flags/memberships, exact grants without
  grant options, CREATE/TEMP restrictions, and global default PUBLIC function
  EXECUTE revocation, as required above. Confirm no app/history precreation.
- [ ] **PENDING:** Independently recompute SHA-256 over UTF-8 SQL normalized to LF
  and compare all five ordered entries in `backend/scripts/staging/manifest.json`
  against `backend/database/`: `migrations/001_foundation.sql`,
  `migrations/002_privileges.sql`, `auth/001_provider.sql`,
  `auth/002_staff_policy.sql`, `media/001_media_policy.sql`. Retain both reviewers'
  comparison evidence. Review `backend/scripts/staging/catalog.json` and exact
  candidate local-test evidence; do not regenerate baselines to accept drift.
- [ ] **PENDING:** Accept the [authorization record](STAGING_READINESS.md#staging-authorization-record---preparation-2026-11-08)
  and [recovery baseline](ROLLBACK_AND_RECOVERY.md#staging-recovery-baseline-checklist).
  Confirm secret-manager injection process, direct verified-TLS/channel-bound URL
  requirements, maintenance/write and control-plane freeze, and escalation owner.
- [ ] **PENDING:** Record separately authorized preflight output/reference,
  timestamp, exit status, target and reviewed candidate. Re-review changed target,
  SQL, manifest, catalog or runner content before proceeding. No hosted result
  exists from this preparation. Apply remains blocked until separate written
  approval and both apply reviews are recorded.

## Exact commands (repository root, PowerShell)

Local verification; no Neon credentials or network database required:

```powershell
npm run build:tsc --prefix backend
if ($LASTEXITCODE -ne 0) { throw 'Build failed' }
powershell -NoProfile -ExecutionPolicy Bypass -File backend/test/run-staging-database-tests.ps1
if ($LASTEXITCODE -ne 0) { throw 'Local tests failed' }
```

The harness initializes a fresh loopback-only PostgreSQL cluster on a temporary
port, creates empty test databases/roles, and stops it in `finally`. It retains
temporary evidence files. It creates no LGU records. The checked-in catalog
baseline was captured from the unchanged chain on disposable PostgreSQL 18;
normal tests independently replay and compare it, never regenerate it.

Only after separate hosted read authorization and prerequisite completion:

Required process environment names: `R2_STAGING_DATABASE_URL` and `NEON_API_KEY`.
Inject values through the approved secret manager; do not print them or read env
files. `R2_STAGING_APPROVAL` is apply-only and is not required for preflight.
The CLI does not enforce the external approval/recovery/two-person records for
preflight; operators must satisfy those gates before invoking it. The entry
point performs authenticated metadata GETs before entering the core runner;
SQL checksums are checked by the core runner before the database connection.

```powershell
node backend/scripts/r2-staging-migrate.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Staging preflight rejected' }
```

Omitting the flag also selects preflight. Preflight uses a READ ONLY transaction,
checks target, roles, ACL prerequisites, migration hashes and existing history,
and takes a nonblocking transaction advisory lock. It executes no migration SQL
and creates no ledger. Empty targets report five pending; fully migrated targets
must match the catalog baseline. Preflight does not prove future DDL will succeed.

After explicit written ALZA apply authorization and two-person review, the operator
sets the target/manifest-bound acknowledgment and invokes apply:

```powershell
$env:R2_STAGING_APPROVAL = node -e "const {approval}=require('./backend/scripts/staging/runner.cjs'); const t=require('./backend/scripts/staging/target.json'); process.stdout.write(approval(t))"
try {
  node backend/scripts/r2-staging-migrate.cjs --apply
  if ($LASTEXITCODE -ne 0) { throw 'Staging apply failed; investigate before retry' }
} finally {
  Remove-Item Env:R2_STAGING_APPROVAL -ErrorAction SilentlyContinue
}
node backend/scripts/r2-staging-migrate.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Post-apply verification failed' }
```

The acknowledgment is intentional operator confirmation, not an access credential
or substitute for external approval. Never generate it automatically in CI.

## Transaction, verification and recovery

The manifest fixes all five paths in the requested order with SHA-256 over UTF-8
SQL normalized to LF. Files are read and checked before connection; those same
bytes are executed. The whole chain plus private `r2_staging.history` is atomic.
The transaction advisory lock uses key 72001 (also used by the foundation runner).
Competing staging execution fails immediately. Statement/lock/transaction limits
are 30/3/120 seconds; transport limits may fail sooner. `search_path=public`
places unqualified auth tables correctly while PostgreSQL implicitly searches
pg_catalog first. Existing app/function-local search paths are unchanged.

Only empty state or the complete exact five-row history is accepted. Unknown,
partial or changed histories fail. Existing schemas without this ledger cannot
be silently adopted. Repeat apply verifies and skips all five migrations.
Catalog comparison verifies relations/ownership, columns, constraints, indexes,
view definitions, trigger definitions/enabled state, functions and table/column/
function ACLs. Additional checks cover schema ACLs, default ACLs, runtime role
requirements and private ledger ownership/grants. PostgreSQL 18 deparser changes
may fail closed and require independent review; do not refresh evidence just to
make a mismatch pass. This is schema verification, not application/storage or
runtime-login qualification. Any future nontransactional migration requires a
separately reviewed runner design.

On error, the runner attempts ROLLBACK and discards the connection; closing the
session releases its transaction lock. All logs are fixed messages or aggregate
counts; raw SQL/provider exceptions and URLs are suppressed. A network failure
during COMMIT can leave the outcome unknown: run approved preflight to reconcile
the ledger and catalog before retrying. Never infer rollback merely from exit 1.
Do not delete history, edit applied SQL, DROP schemas, restore over the target,
or automatically run down migrations. Retain sanitized results and independently
inspect the approved target. Escalate drift/partial history to the database owner.
Use a separately authorized recovery branch/restore and reconcile evidence before
any cutover. Existing staging-readiness and recovery blockers remain in force.
