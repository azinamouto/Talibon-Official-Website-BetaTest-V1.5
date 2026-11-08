# R2 staging migration operator procedure

Implementation is local-tested only. No hosted execution is authorized by this
document. The checked-in target intentionally has null branch, endpoint, host
and migrationLogin: both modes fail closed until an approved staging identity is reviewed.
Never substitute main, development, production, or pooled endpoints.

## Review and prerequisites

1. Obtain written LGU ownership/IT authorization, a maintenance/write freeze,
   verified protected backup/recovery set (or documented empty baseline), and
   two-person target/checksum review. These organizational approvals remain
   external evidence; an environment variable cannot establish their authenticity.
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

```powershell
node backend/scripts/r2-staging-migrate.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Staging preflight rejected' }
```

Omitting the flag also selects preflight. Preflight uses a READ ONLY transaction,
checks target, roles, ACL prerequisites, migration hashes and existing history,
and takes a nonblocking transaction advisory lock. It executes no migration SQL
and creates no ledger. Empty targets report five pending; fully migrated targets
must match the catalog baseline. Preflight does not prove future DDL will succeed.

After explicit written apply authorization and two-person review, the operator
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
