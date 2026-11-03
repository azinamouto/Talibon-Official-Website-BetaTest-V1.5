# Neon migration plan

## Increment 2.1 development qualification — 2026-11-02

The unchanged `001_foundation.sql` and `002_privileges.sql` are now applied to the existing development `neondb` in project `misty-silence-69777617`, branch `br-bitter-fire-aouffr8u` (`dev-talgov-r2-foundation`), AWS Singapore. This supersedes the historical offline-only status below. No production/source migration or parent-main modification occurred. [Qualification report](INCREMENT_2_1_REPORT.md).

Run `npm run test:r2:neon --prefix backend` only for this authorized development target. The dedicated runner resolves authenticated control-plane metadata and rejects a wrong organization, project, region, branch ID/name/parent/default status, endpoint or URL before connecting. It requires a direct migration URL and pooled runtime URL with verified TLS and mandatory channel binding. The existing general migration/transfer CLIs **retain their loopback-only guards**; no generic remote-write flag was added.

Initial bootstrap requires the empty `neondb`, absent qualification roles/databases, and the setup credential file. It creates a NOLOGIN runtime group and separate restricted SCRAM login roles; migration credentials then perform DDL. Passwords are random and saved only in ignored user-ACL-protected files. Bootstrap CREATE ROLE/CREATE DATABASE uses provisioning credentials; temporary SET membership used to assign scratch database ownership is revoked in `finally`. It never assigns CREATEROLE/CREATEDB to either application role. `.env.local` ends with runtime credentials only; `.env.neon-provisioning` and `.env.neon-qualification` are operator files and must stay out of deployment.

The initial dry run rolls back both migrations and ledger, then explicit apply commits both atomically. Subsequent runs replay/check checksums and create **fresh** `r2_q_<8-hex>_{test,source,upgrade,restore}` databases on the same validated branch. Tests reuse existing synthetic fixtures, repositories, export/import/reconciliation and batch rollback functions. They check upgrade, failed DDL rollback, drift, permissions, publication, constraints, audit atomicity, timeouts and last-admin concurrency. The publication repository now takes its timestamp from PostgreSQL, with an application-clock-skew regression.

Recovery uses direct `pg_dump -Fc` and `pg_restore --exit-on-error --single-transaction` into a verified empty scratch database, then compares all nine app tables' canonical row digests, ledger checksums, constraints, indexes, views, functions and effective table/column ACLs. Passwords travel in child environment variables, never argv. Windows libpq receives an explicit CA file containing Node's bundled public trust anchors; `verify-full` and required binding remain on. `--restore-run=r2_q_<8-hex>` resumes backup/restore for a retained run; `--verify-restored` with that flag verifies an already restored database without overwriting it. `--prepare-only` verifies roles, migration replay, TLS, concurrent pooled transactions and safe authentication failures without creating a fresh suite.

No down migration, DROP database, TRUNCATE, `--clean`, production restore or reset-from-parent is used. Synthetic test state and protected local archives remain available for review. Do not treat those rows as approved LGU information. Logical recovery on a single development branch is verified; Neon PITR/branch restore, cross-project disaster recovery, production capacity and approved real-data reconciliation remain separate gates. Stop after Increment 2.1.

## Historical Increment 2 / design baseline

Increment 2: the foundation and rehearsal tooling are implemented. Follow [DATABASE_OPERATIONS.md](DATABASE_OPERATIONS.md) for actual filenames, dry-run/apply commands, reviewed row mapping, count/digest reconciliation and rollback/restore constraints. CLI target writes are limited to loopback `r2_*` databases. No source/Neon credentials or production data were used. Proposed filenames/versions below are historical design only; search, live storage and production cutover remain deferred. [Execution report](INCREMENT_2_REPORT.md).

Status: design only. No source/target data connection, export, import or migration executed in Increment 0.

## Preparation and gates

1. Record source project, schema/migration history, PostgreSQL/extensions, constraints, row counts, policies, triggers/functions, storage manifest, auth configuration and active jobs using read-only access. Do not print credential values.
2. Reconcile canonical versus deployed schema, including runtime-only table names. Require municipal content-owner approval and a private disposition manifest for each source table/object. Unknown official data stays unpublished.
3. Verify target Neon project/region/plan, pooled/direct URLs, runtime and migration roles, Auth controls, private storage permissions, budget and backup retention. [Provider gates](AUTH_AND_STORAGE_CONTRACTS.md) currently block auth; storage account checks are pending credentials.
4. Take encrypted source DB and object backups, separately protect key material, record SHA-256 and restore evidence. A successful export is not a restore rehearsal.
5. Rehearse on an isolated target with synthetic data first, then approved source copies under restricted access. Disable copied sessions, outbound email, webhooks and citizen jobs. Branching can copy sensitive state; use sanitized previews.

No production cutover is authorized by this plan. No implicit provider substitution is allowed.

## Versioned SQL sequence (proposed files)

| File under `backend/db/migrations/` | Purpose |
|---|---|
| `0001_r2_foundation.sql` | App schema, separate runtime/migrator privileges, checksum ledger; no public access |
| `0002_public_content.sql` | Retained content tables/read models, constraints/indexes/source approval; no sample municipal rows |
| `0003_staff_and_audit.sql` | Provider-independent staff identity, admin/editor allowlist, transactional audit privileges |
| `0004_media.sql` | Categories/assets/revisions/upload intents, publication invariants and asset relationships |
| `0005_public_search.sql` | Bounded search over approved retained rows only |

Add `backend/scripts/migrate-r2.mjs` with an advisory lock, direct connection, checksum verification, per-migration transaction, explicit failure exit and environment identity check. No startup migration and no `DROP ... CASCADE`. Lock/statement timeouts bound DDL; failed transactions leave the prior migration version usable. Future concurrent indexes need a separately reviewed nontransactional migration rather than silently weakening atomicity.

Data import is a separate reviewed tool (`backend/scripts/import-r2.mjs`), dry-run by default, accepting an approval manifest and deterministic ID mappings. Import retained rows in FK order, quarantine rejected rows, then link verified objects. Do not import `auth.users`, credentials, sessions, MFA seeds, sample data or deferred workflow tables into the active schema. Archive preservation has separate restricted storage/access, not a web-accessible schema copy.

## Runtime connection and transaction policy

Neon documents PgBouncer transaction pooling and recommends pooled connections for concurrent application traffic; direct connections serve migrations/session-level operations. Its 10,000 pooled-client limit is not a 10,000-query concurrency budget. [Neon pooling](https://neon.com/docs/connect/connection-pooling), [connection guide](https://neon.com/docs/get-started/connect-neon).

Proposed initial settings, to be load-tested: pool max 2 per warm Vercel instance; connection acquisition 5 seconds; idle release 10 seconds; statement timeout 5 seconds; lock timeout 2 seconds; transaction idle timeout 5 seconds; maximum application transaction duration 10 seconds. Readiness should use a bounded 3-second lightweight query. Set PostgreSQL limits per role/transaction where appropriate, not persistent session state assumed to survive pooling. Verify TLS certificate/hostname and driver connection-string behavior; never disable certificate validation.

Reserve connection headroom for migrations/operations. Bound instance concurrency so `instances × pool max` fits the account's measured capacity; verify compute-specific direct connection limit, server pool and Vercel scaling before launch. Prefer one singleton pool per warm runtime; release connections in `finally`, handle idle errors, and close on local shutdown. Connection loss must not produce mock rows or success responses.

Repositories accept a transaction/query executor. Services check active staff/role, perform metadata mutation and append audit event on the **same connection** within BEGIN/COMMIT. Runtime role has no schema ownership, superuser or BYPASSRLS privilege. Repositories enforce public predicates; optional RLS defense must use server-established transaction-local context and verified grants, never browser claims. Do not enable browser Data API access to work around missing repositories.

All values are SQL parameters; sort/order/table identifiers are strict code allowlists. Bound pagination/search length. Retry at most twice with jitter for transient connection failures on safe reads. Retry an entire transaction only for explicit serialization/deadlock errors with proven idempotency. Never blindly retry an unknown COMMIT outcome, object delete or email send; look up the idempotency record first. Pool exhaustion/dependency loss returns sanitized 503, not stale privileged access.

## Reconciliation and acceptance

Propose `backend/scripts/reconcile-r2.mjs` and `backend/test/r2-migration.test.cjs`. For each source table: record source count, approved import count, archived/deferred count, quarantined count and reason; categories must partition the source without unexplained loss. Compare target counts with the **approved subset**, not total source count.

Verify PK uniqueness, required fields/nullability, FK anti-joins, status/category checks, timestamp/timezone semantics, exact representative content fields, sorted stable row digests, duplicate slugs and encoding. Preserve null versus zero. Detect source drift after snapshot and reconcile final changes under the write freeze. Record discrepancies and require zero unexplained mismatches before promotion.

For every approved file, compare downloaded source and target SHA-256, byte count, MIME/signature, publication status and referring row; do not treat an S3 ETag as a universal checksum. Verify private/draft/expired URL denial and published downloads. Any missing object or unresolved reference blocks publication. Search results, facets, navigation and content bodies must contain no active Supabase URLs.

Test fresh migration replay, upgrade from the last R2 schema, failed migration rollback, checksum drift rejection, query injection, least privilege, audit failure rollback and complete backup restore into a new isolated database. These are **not yet verified**. Local Supabase-stub tests cannot establish Neon compatibility.

## Sequencing

Increment 1 closes deferred behavior independently of provider migration. Increment 2 can implement/test the DB foundation offline. Increment 3 stops at the auth capability gate. Increment 4 can define interfaces/tests but cannot activate live CMS without verified auth/storage. Increment 5 removes all Supabase production dependencies only after retained paths have replacements. Increment 6 qualifies staging and rollback. Do not deploy an intermediate half-migrated application as R2.
