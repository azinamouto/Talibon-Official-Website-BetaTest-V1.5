# Increment 2.1 — Neon PostgreSQL integration qualification

Evidence date: **2026-11-02 (Asia/Shanghai)**. Development integration and logical recovery qualified. **Not a production cutover or production qualification. Stop after Increment 2.1.**

## Branch and commits

- Branch: `feat/talgov-r2-increment-2-1`.
- Clean starting HEAD: `3419b7bc0f6803e7651622de57f69e91dbe194c7`; Increment 2 `8c5f83df3d30b456fb911ef40ef6d0e97815e133` remains an ancestor.
- Implementation: **`ab2a5e5439bebcccb6f777581afe85c9302a32eb`**, secure Neon connections, guarded qualification tooling, tests and publication-clock correction.
- The following documentation/evidence commit contains this report. Obtain its exact ending SHA with `git log -1 --format=%H -- docs/r2/INCREMENT_2_1_REPORT.md`; the handoff also supplies it.
- R1, prior increment reports, Agent files, installed skills, frontend, API/guards, original migrations and contracts remain unchanged. No reset, stash, push, merge or deployment. [Preservation checks](evidence/increment-2-1/preservation-checks.json), [changed files](evidence/increment-2-1/changed-files.txt).

## Implementation and schema

`postgres.ts` accepts `channel_binding=require` and translates it to explicit verified TLS and channel-binding configuration. Unknown, duplicate or weakening parameters and fragments fail closed. Local plaintext tests cannot override an explicit security requirement. Pool bounds and transaction deadlines remain unchanged.

The supported `pg` option `enableChannelBinding:true` only prefers PLUS. Required binding therefore also uses the Pool Client extension point with three version-sensitive authentication hooks and a pool admission check: plain SCRAM, MD5, cleartext, trust authentication, unverified TLS and invalid server signatures cannot satisfy it. Cryptography remains in `pg`; version **8.23.1 is pinned**. Driver upgrades require these downgrade tests and hosted requalification. [Driver configuration documentation](https://node-postgres.com/features/ssl).

The first hosted run exposed application/database clock skew: `publish()` supplied JavaScript `new Date()`, while the publication view compared against PostgreSQL `now()`. The repository now uses the database clock. A test advances the application clock by one day and verifies immediate publication. No HTTP contract or application-module wiring changed.

`r2-neon-target.cjs` validates authenticated organization/project/region/branch/parent/endpoint metadata and exact connection hosts before remote writes. `r2-neon-qualify.cjs` provisions restricted roles, reuses the existing migrations and integration suite, and verifies logical recovery. The ordinary migration/transfer CLIs retain their loopback-only guards. New config/target tests add six Node tests; the existing database suite supports guarded hosted execution. `package.json` adds `test:r2:neon`; the lockfile changes only the pg version range, with **no locked dependency version changes**.

The unchanged migrations `001_foundation.sql` and `002_privileges.sql` were applied to the initially empty development `neondb`. They create nine operational tables, two publication views, constraints/indexes/triggers and the migration ledger; no third migration or production schema change was introduced. Tables: `staff_accounts`, `content_sources`, `public_content`, `media_categories`, `media_assets`, `media_revisions`, `content_asset_links`, `audit_events`, `import_batches`. [Final catalog and migration checksums](evidence/increment-2-1/neon-catalog.json).

## Exact Neon target and permissions

- Organization `org-patient-mud-50407342`; project **`talgov-r2` / `misty-silence-69777617`**; PostgreSQL 18, AWS Singapore.
- Only branch **`dev-talgov-r2-foundation` / `br-bitter-fire-aouffr8u`**, endpoint `ep-bold-bread-aof0cgtb`, received SQL writes.
- Parent `main` / `br-flat-shape-aoyf83yq` received no SQL connection or write. A read-only control-plane observation reports zero written data bytes. [Evidence](evidence/increment-2-1/parent-main.json).
- Runtime **`talgov_r2_app`** inherits only NOLOGIN `talgov_runtime`, without admin option. Migration **`talgov_r2_migration`** owns the app schema/ledger and has required database/public-schema CREATE privileges. Neither login has SUPERUSER, CREATEDB, CREATEROLE, REPLICATION or BYPASSRLS; migration has no inherited role memberships.
- Runtime cannot create schema/temp objects in `neondb`, assume the migration role, read/change the ledger, change approvals/readiness, tamper with audit history or edit retained content. Existing repository admin/editor checks and atomic audit transactions pass with the actual runtime login.
- Provisioning credentials are used only for role/database bootstrap. Temporary SET membership for assigning scratch database ownership is revoked in `finally`. Ordinary `.env.local` now holds runtime credentials only. Ignored `.env.neon-provisioning` and `.env.neon-qualification` isolate operator credentials; all three files have current-user-only Windows ACLs. No credentials were printed or committed. The changed-file scan found zero matches for actual qualification URLs/passwords; this is not a complete historical secret audit.

## Results

Windows, Node 22.16.0, PostgreSQL tools 18.6. All data is explicitly synthetic; no LGU/source data or storage objects were imported.

| Check | Exact result |
|---|---|
| Initial Neon migration dry run / apply / replay | Exit 0; dry run rolls back 2 migrations with no app schema; apply commits 2; replay applies 0. [Log](evidence/increment-2-1/neon-prepare.txt) |
| `npm run test:r2:neon --prefix backend` | Exit 0; **12/12** hosted database tests; fresh logical restore **9 tables / 21 rows**, matching exact digests and schema/privilege checks. [Log](evidence/increment-2-1/neon-database.txt) |
| Final expanded restore verification | Exit 0; also matches view options, triggers, table/column effective ACLs and functions. [Log](evidence/increment-2-1/neon-restore-final.txt) |
| TLS, roles, pool and failures | Direct migration and pooled runtime use authorized TLS and verified SCRAM-SHA-256-PLUS. Eight concurrent transactions stay within pool max 2, transaction markers do not leak, wrong password is sanitized. [Log](evidence/increment-2-1/neon-security.txt) |
| Backend build / lint / contracts | Exit 0 each; build also rerun by final hosted command. [Build](evidence/increment-2-1/backend-build.txt), [lint](evidence/increment-2-1/backend-lint-final.txt), [contracts](evidence/increment-2-1/backend-contracts-check-final.txt) |
| `npm test --prefix backend` | Exit 0; Jest **54/54**, 5 suites; Node **98 total, 94 passed, 4 TODO, 0 failed/skipped/cancelled**. [Final log](evidence/increment-2-1/backend-test-final.txt) |
| `npm run test:r2:db --prefix backend` | Exit 0; **12/12**, disposable local restore **9 tables / 21 rows**. Same suite in another environment, not additional coverage claims. [Final log](evidence/increment-2-1/backend-test-r2-db-final.txt) |
| `npm run test:db --prefix backend` | Exit 0; existing legacy database/security/migration/restore regressions. [Log](evidence/increment-2-1/backend-test-db.txt) |
| Frontend lint / build | Exit 0 each; 2,796 modules, existing large-chunk warning. [Lint](evidence/increment-2-1/frontend-lint.txt), [build](evidence/increment-2-1/frontend-build.txt) |
| Frontend Node / React tests | Exit 0; **21/21** and **52/52**. [Node](evidence/increment-2-1/frontend-test.txt), [React](evidence/increment-2-1/frontend-test-react.txt) |
| Public / e-services browser regressions | Exit 0; **26/26** and **22/22**. [Public](evidence/increment-2-1/frontend-test-browser.txt), [e-services](evidence/increment-2-1/frontend-test-eservices.txt) |
| `npm run test:ops` | Exit 0; **8/8**. [Log](evidence/increment-2-1/ops-test.txt) |

Hosted tests cover migration upgrades/idempotency/checksum drift/failed-DDL rollback; constraints, publication and provenance withdrawal; RBAC and last-admin races; CRUD, optimistic conflict, injection, audit rollback; statement/lock/idle/transaction/pool timeout recovery; source drift, exact numeric hashes, import idempotency, reconciliation and guarded batch rollback. Connection unit tests additionally cover refused/disconnected sockets, downgrade rejection and secret-safe logging. Admin and contract-browser suites were not rerun; frontend is unchanged, and backend contract/HTTP regression tests passed.

Final full hosted run uses `r2_q_9d0f60e4_{test,source,upgrade,restore}` on the designated development branch. `pg_dump -Fc` and single-transaction `pg_restore` use direct TLS connections and a verified empty restore database. Windows libpq receives Node's bundled public CA roots explicitly, with `verify-full` and required binding. The full-run archive SHA-256 is `deafba91fa16555fcecb28969bf03c20e82353a35a337b67d59aeb7ed0ff357e`; protected artifact paths and the later verification archive hash are in the logs. Backups/passwords are not in Git.

Synthetic state is retained: `neondb` has **20 first-run synthetic rows**; successful fresh runs have 21 rows each. The catalog evidence lists all retained scratch databases. No DROP, TRUNCATE, restore-over-live, down migration or parent reset was executed. These rows must never be presented as official municipal content.

## Failed attempts and security findings

The initial hosted suite was **11/12** because of publication clock skew; [failure evidence](evidence/increment-2-1/neon-database-initial.txt) is retained. The corrected suite was 12/12, then Windows libpq rejected its system trust store during backup; [evidence](evidence/increment-2-1/neon-database-tls-failure.txt). Explicit trusted roots corrected this without weakening TLS. The first restored ACL comparison flagged equivalent explicit-owner versus default-NULL ACL representations; [evidence](evidence/increment-2-1/neon-restore-initial.txt). Comparison now uses effective privileges including column grants. Subsequent restore verification and the full end-to-end command passed. Bootstrap also required PostgreSQL's temporary SET membership to assign database ownership; no broad permanent privilege was added.

All six `npm audit --package-lock-only --audit-level=high --json` checks (root/backend/frontend, all and production-only) exit **1**. Findings are unchanged from Increment 2; counts are per tree, not additive unique vulnerabilities. [Commands/results](evidence/increment-2-1/ops-audit-checks.json).

| Tree | Critical | High | Moderate | Low | Total |
|---|---:|---:|---:|---:|---:|
| Root, all / production | 1 | 7 | 2 | 0 | 10 |
| Backend, all | 1 | 7 | 30 | 3 | 41 |
| Backend, production | 1 | 5 | 3 | 0 | 9 |
| Frontend, all | 0 | 4 | 0 | 0 | 4 |
| Frontend, production | 0 | 2 | 0 | 0 | 2 |

The critical `proxy-addr` and existing high findings remain release blockers. No blind audit fix or unrelated dependency upgrade was performed. Provider authentication hooks are a documented maintenance risk gated by a pinned driver and tests. Existing hosted legacy shutdown, identity/session/MFA, object storage/private delivery, official-data approval, privacy/operations review and historical secret review remain open.

This demonstrates logical recovery within one Neon development branch, **not** provider PITR/branch restore, cross-project disaster recovery, production load/cold-start capacity, RPO/RTO or a real-data cutover. No auth/storage integration, Supabase reintroduction, production migration, push, merge, deployment or Increment 3 work occurred. The database module remains unmounted. **Stop here.**
