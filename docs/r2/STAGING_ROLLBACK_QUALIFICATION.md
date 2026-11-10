# Rollback-only staging qualification

Run from `C:\Users\admin\Documents\TalGov-Final-Backend-Migration` with
`DATABASE_URL`, `STAFF_AUTH_DATABASE_URL`, and `MEDIA_DATABASE_URL` securely
injected. No env files are loaded. All three must target the pinned staging
endpoint (direct or pooled), use `sslmode=verify-full&channel_binding=require`,
and pass the existing restricted runtime guard. No migrator credentials are used.

Safe default (catalog reads only):

```powershell
npm --prefix backend run build:tsc
node backend/scripts/r2-staging-qualify.cjs
```

Only with separate explicit authorization for synthetic staging writes:

```powershell
node backend/scripts/r2-staging-qualify.cjs --authorize-rollback-writes
```

The flag authorizes the fixed CMS/auth/media probes for this invocation. It
does not provision fixtures. CMS/media require exactly one existing synthetic
source with reference and owner `r2-qualification`, unapproved; media also needs
one inactive staff account with provider and subject `r2-qualification`, and one
unapproved document category with slug `r2-qualification`. Missing fixtures stop
qualification. Runtime cannot insert these dependencies; any fixture provisioning
is a separate authorized operation, outside this script.

Effective table and column privileges (including denied hard DELETE and grant
options) are compared to the reviewed catalog for each runtime connection.
The six-migration baseline has RLS disabled and zero policies: this is checked,
not represented as RLS protection. Local migration checksums are verified;
the restricted runtime does not read the migration ledger or apply migrations.

Write probes use unique markers, exercise insert/update and CMS/media soft-delete,
and auth hard-delete on an additional synthetic record. A retained record must
be visible inside each pinned transaction, then absent in a new read-only
transaction after rollback, including after write failure. There is no COMMIT
path. Rollback/connection failures destroy the client and fail qualification;
PostgreSQL aborts uncommitted transactions on disconnect. Interrupted runs cannot
report successful absence verification. No existing fixture is modified.

Media uses only an injected in-memory fake store. This qualifies database writes,
not HTTP/authentication flows or real object storage. No application bootstrap,
mail, object-storage writes, e-services, payments, deployment or hosted test
suite is invoked. Output suppresses provider errors and credentials.

Local failure tests (no database connection):

```powershell
node --test backend/test/staging-qualification.test.cjs
```
