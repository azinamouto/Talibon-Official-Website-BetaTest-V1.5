# Increment 2 delivery report

Evidence date: **2026-11-01, Asia/Shanghai**. **PostgreSQL foundation implemented and locally verified; NOT PRODUCTION-QUALIFIED.** No production data, hosted migration, deployment, push or merge. Stop after Increment 2.

## Branch, preservation and commits

- Branch: `feat/talgov-r2-increment-2`.
- Start: **`d9e357fab78d14d20f0badb76afbcf635ade8348`**, verified Increment 1 HEAD. Its runtime commit `eee418d` and R1 `fd2fe68` remain ancestors.
- `ca725108b0751e80f13bfa95e35bcebf4aed54d8` — database foundation, migrations, repository policy, transfer/recovery tooling, tests and operations contract.
- **Tested implementation end: `127755cfdbe96d181dc7762f191c0d912756eb24`** — exact numeric reconciliation hashes and regression coverage.
- A following documentation/evidence commit contains this report. Its final branch SHA is supplied in the handoff; obtain it locally with `git log -1 --format=%H -- docs/r2/INCREMENT_2_REPORT.md`.

Both initial worktrees were clean. This workspace switched from R1 to a new branch at Increment 1 without reset/stash/history changes. The Increment 1 worktree and existing branch refs were preserved. Untracked `Agent/AGENTS.md`, `Agent/R2_RULES.md`, `Agent/README.md` and `Agent/workflows/` appeared during execution; applicable instructions were read, and all those user files remain untouched/uncommitted. [Preservation checks](evidence/increment-2/preservation-checks.json) confirm unchanged frontend, API/guard/retirement code, canonical legacy SQL, contracts, ops and root dependency files. No Neon/PostgreSQL URL was supplied in the process environment or backend environment configuration; only presence was inspected.

[Exact changed-file manifest](evidence/increment-2/changed-files.txt).

## Delivered files and contracts

| Files | Result |
|---|---|
| `backend/src/database/{postgres,repositories,database.module}.ts` | `pg` pooling/TLS, transaction deadlines, sanitized errors; public/media/staff/audit repository interfaces and Nest tokens; active admin/editor checks, optimistic updates, last-admin protection and atomic auditing |
| `backend/database/migrations/001_foundation.sql`, `002_privileges.sql` | Nine app tables, two publication views, approval/immutability triggers, constraints/indexes and narrowly scoped NOLOGIN runtime group; operator-only checksum ledger |
| `backend/scripts/r2-migrate.cjs`, `r2-transfer.cjs` | Locked/versioned/dry-run migrations; read-only source snapshots; explicit approval mappings; count partitions, exact JSONB row digests, idempotent imports, reconciliation and guarded batch rollback |
| `backend/test/r2-database.integration.cjs`, `r2-restore-check.cjs`, `run-r2-database-tests.ps1` | Disposable cluster, fresh/upgrade/failure migrations, permissions/CRUD/constraints/concurrency/timeouts, export/import failures and logical restore verification |
| `backend/package.json`, lock, `.env.example` | `pg` + `@types/pg` and four script/example updates; all existing lock entries preserved |
| `backend/scripts/export-openapi.cjs` | Normalize CRLF for snapshot comparison; generated API document is semantically unchanged |
| `docs/r2/DATABASE_OPERATIONS.md` and architecture/schema/security/migration/recovery/acceptance/register addenda | Actual operator procedure, schema/role contract and qualification limits; raw evidence in `evidence/increment-2/` |

The tables are `staff_accounts`, `content_sources`, `public_content`, `media_categories`, `media_assets`, `media_revisions`, `content_asset_links`, `audit_events`, `import_batches`; migration history is `public.r2_schema_migrations`. **No HTTP endpoint or frontend API changes.** The module remains unmounted until auth/storage/cutover gates are met. No new code depends on Supabase SDKs. Existing provider use is preserved, not claimed removed. No Neon Auth, storage adapter, citizen workflow, payment or broader content CMS is introduced.

The new content table is a normalized import read model, not a completed port of every legacy table/DTO/search relationship. Runtime cannot edit retained content or approval/readiness records. Media starts pending/draft; physical file validation and delivery are deferred. Public queries require publication, time, nondeletion and provenance/category approval and omit private object keys. Verified identity is an internal future-auth contract, not a client-supplied identity or implemented Neon session bridge. [Detailed constraints and operating limits](DATABASE_OPERATIONS.md).

## Exact final validation

Windows, Node **22.16.0**, npm **10.9.2**, PostgreSQL **18.6**, local Edge/Playwright. New foundation requires PostgreSQL 17+. Only explicitly synthetic isolated fixtures were created. Frontend build/tests used loopback provider configuration and the existing browser fixtures; no live provider qualification is implied. Evidence output normalizes ANSI escapes, CRLF and trailing whitespace.

| Command | Final result / evidence |
|---|---|
| `npm run build --prefix backend` | Exit 0; [log](evidence/increment-2/backend-build.txt) |
| `npm run lint --prefix backend` | Exit 0, ESLint + TypeScript; [final log](evidence/increment-2/backend-lint-final.txt) |
| `npm test --prefix backend` | Exit 0; Jest **54/54**, **5 suites**; Node **92 total: 88 passed, 4 TODO, 0 failed/skipped/cancelled**; [log](evidence/increment-2/backend-test.txt) |
| `npm run contracts:check --prefix backend` | Exit 0 after CRLF portability fix; [log](evidence/increment-2/contracts-check.txt) |
| `npm run test:r2:db --prefix backend` | Exit 0; **12/12**, restore passed; [log](evidence/increment-2/r2-database.txt) |
| `powershell -NoProfile -ExecutionPolicy Bypass -File backend/test/run-r2-database-tests.ps1` | Final script/precision changes: exit 0, **12/12**, **9 tables / 21 rows** restored with exact hashes, ledger/grants/constraints verified; [final log](evidence/increment-2/r2-database-final.txt). This is the same suite, not 12 additional tests |
| `npm run test:db --prefix backend` | Exit 0; fresh/canonical security, content, forms, reports, user/RLS regressions; historical V4 security/replay and local legacy dump/restore passed; [log](evidence/increment-2/legacy-database.txt). Historical V4 remains outside later canonical content compatibility |
| `npm test --prefix frontend` | Exit 0; **21/21**; [log](evidence/increment-2/frontend-test.txt) |
| `npm run test:react --prefix frontend` | Exit 0; **52/52**, 2 files, unchanged test limits; [final log](evidence/increment-2/frontend-react-final.txt) |
| `npm run lint --prefix frontend` | Exit 0; [log](evidence/increment-2/frontend-lint.txt) |
| `npm run build --prefix frontend` | Exit 0; **2,796 modules**; JS **1,535.46 kB / gzip 438.59 kB**; existing large-chunk warning; [log](evidence/increment-2/frontend-build.txt) |
| `npm run test:browser --prefix frontend` | Exit 0; **26/26**; [log](evidence/increment-2/browser-public.txt) |
| `npm run test:eservices --prefix frontend` | Exit 0; **22/22**; [log](evidence/increment-2/browser-eservices.txt) |
| `npm run test:admin --prefix frontend` | Exit 0; **12/12**; [log](evidence/increment-2/browser-admin.txt) |
| `npm run test:contracts:browser --prefix frontend` | Exit 0; **10/10**, unchanged test limits; [final log](evidence/increment-2/browser-contracts-final.txt) |
| `npm run test:ops` | Exit 0; **8/8**; [log](evidence/increment-2/ops-test.txt) |
| `git diff --check`, staged diff check, scoped secret-pattern/import/preservation review | Passed before implementation commits; no detected credential literals, new browser DB imports or legacy dependency changes; [checks](evidence/increment-2/preservation-checks.json). Not a complete historical secret audit |

Final browser total: **70 passed, 0 failed, 0 skipped**. The database suite exercises actual non-owner runtime credentials, not only SQL strings/mocks. It checks stale versions, editor/admin/inactive/unknown identities, missing assurance, source/category withdrawal, future publication, injection payloads, FK/check/unique constraints, immutable history, denied DDL/readiness/audit edits, last-admin races, rollback on audit failure, lock/statement/pool/idle/transaction timeout recovery, migration checksum drift and CRLF portability. Source drift includes integers beyond JavaScript's safe range; native PostgreSQL JSONB text is hashed before numeric conversion. Export partitions counts, rejects missing decisions, detects modified bundles and target edits, and rolls back partial imports. Restore compares exact table data and retained permissions.

## Failed attempts retained separately

Early development found an invalid SQL regex bound and a too-short test connection timeout; both were corrected before qualification. The first captured foundation qualification run was **10/12**: it assumed a different PostgreSQL RESTRICT error code and incorrectly shortened an already-running transaction timer. [Failure evidence](evidence/increment-2/r2-database-initial.txt); corrected final results are above. The source maps the RESTRICT code and resets the transaction timer before setting its deadline.

The initial React run was **51/52** (one 5-second timeout); its unchanged sequential rerun is **52/52**. [Initial React log](evidence/increment-2/frontend-react-initial.txt). Initial contract-browser execution was **9/10**, with the mobile multi-page About test exceeding 30 seconds during concurrent checks; [initial log](evidence/increment-2/browser-contracts-initial.txt). Its unchanged sequential rerun is **10/10**. No frontend runtime/test changes or increased timeout thresholds were made. A CRLF-only OpenAPI comparison failure was independently reproduced as semantically identical JSON; [initial log](evidence/increment-2/contracts-check-initial.txt). It now passes with newline normalization. Machine-readable initial and final result files remain separate; failed attempts are not counted as final passes.

## Audits and qualification blockers

All six `npm audit --package-lock-only --audit-level=high --json` commands (root, `--prefix backend`, `--prefix frontend`, then each with `--omit=dev`) exited **1**. Counts are per dependency tree and are not additive unique vulnerabilities.

| Tree | Critical | High | Moderate | Low | Total |
|---|---:|---:|---:|---:|---:|
| Root, all / production | 1 | 7 | 2 | 0 | 10 |
| Backend, all | 1 | 7 | 30 | 3 | 41 |
| Backend, production | 1 | 5 | 3 | 0 | 9 |
| Frontend, all | 0 | 4 | 0 | 0 | 4 |
| Frontend, production | 0 | 2 | 0 | 0 | 2 |

[Full audit commands](evidence/increment-2/audits-checks.json), [root](evidence/increment-2/audit-root.json), [backend](evidence/increment-2/audit-backend.json), [frontend](evidence/increment-2/audit-frontend.json), [root production](evidence/increment-2/audit-root-prod.json), [backend production](evidence/increment-2/audit-backend-prod.json), [frontend production](evidence/increment-2/audit-frontend-prod.json). All-dependency counts are unchanged from Increment 1. The critical `proxy-addr` finding and high findings involving Nest platform/axios/body-parser/follow-redirects/multer/source-map-js/vite remain; no blind audit fix or unrelated dependency upgrade was performed. Maintainer/security review and remediation remain release blockers.

Neon connectivity/TLS certificate verification against the hosted service, PgBouncer behavior, account roles, cold starts/load, branch/PITR recovery and cross-cluster restores are **unverified**. No real Supabase source catalog, approved municipal row mapping, media byte verification, source freeze/delta comparison or production import occurred. The CLI only writes to loopback `r2_*` targets; export is read-only, target operations dry-run unless explicitly applied. Reconciliation is scoped to imported subsets; excluded/archive counts are not backups. Larger-than-10,000-row retained tables require a reviewed streaming extension.

Existing hosted legacy shutdown, identity/session/MFA, private storage delivery, official-data/DPO/operational approvals, distributed rate limiting, historical secret review and dependency findings remain blockers. Production has not been switched to this adapter. No production data was altered or deleted. **Increment 2 ends at this local foundation; no further increment, deployment, push or merge is started.**
