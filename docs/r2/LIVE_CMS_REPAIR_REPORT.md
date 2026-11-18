# TalGov R2.1 live CMS upload and publishing repair

Source-only repair on `fix/r21-live-cms-repair-20261118`, based on canonical main `a690280bca1c314a504fcc6ec5a4743c8c5b7630` (merged PR #120). Worktree: `C:/Users/admin/Documents/TalGov-R21-Live-CMS-Repair-20261118`. Existing worktrees and uncommitted changes are preserved.

## Findings and their limits

The inspected staging database is incompatible with the deployed CMS source. The upload category failure has a concrete configuration cause: the inline uploader intentionally omits `categoryId`; the server selects the approved `website-photos` or `website-documents` category according to the verified file type. Neither exists. The only category is an unapproved legacy document fixture with slug `r2-qualification`. The old repository passed an unresolved default into category validation, producing HTTP 400 / `category_missing` and the misleading advice to upload again. File type validation and private storage are separate checks and remain enforced.

Direct publication queries `app.content_publication_receipts` before inserting content or changing attachment links. That table and the publication functions are missing. A SELECT with `WHERE false`, made as `talgov_staging_runtime`, returns SQLSTATE `42P01`. A disposable PostgreSQL fixture reproduces the same direct-route HTTP 503 with confirmed rollback.

The older attachment-link defect also remains: runtime lacks SELECT, INSERT and DELETE on `app.content_asset_links`. This explains the previously reproduced legacy authoring SQLSTATE `42501`, and would block later writes after the receipt dependency is repaired. A grant alone cannot restore the current direct publishing path.

These are confirmed blockers on the inspected staging branch. **The exact user-reported POST /api/admin/content/news/publish remains uncorrelated.** No failed-request ID, timestamp or matching Vercel log is available. Its first failure could occur earlier in authentication, throttling, connection setup or another dependency. The application's deployed database bindings and the canonical alias's current deployment assignment were not independently verified.

Read-only GitHub metadata associates the merged source SHA with a successful Vercel status recorded at 2026-11-18 09:37:30 UTC: [deployment metadata](https://vercel.com/rynzz22s-projects/talgov-r2-staging/7LWimeovK79n6u8o3DqiiyhZkaKT). The existing liveness and readiness endpoints returned HTTP 200. Readiness currently checks the older foundation tables, auth and private storage, but omits the CMS 003/004 schema and default categories; it therefore does not establish that publishing works.

[Sanitized read-only evidence](LIVE_CMS_READ_ONLY_EVIDENCE_2026-11-18.json) includes the actual category metadata, constraints, six-row migration ledger, runtime grants, missing schema markers and the empty-result runtime probe. Catalog checks show that runtime can read categories and use the inspected media reservation/readiness/revision grants, but cannot create or approve categories, mutate audit records or create schema/database objects. No live upload or publishing request was repeated.

## Source repair

- Missing server default categories now produce a sanitized service failure, with allowlisted media diagnostics and the request ID. Explicitly invalid or mismatched category IDs remain HTTP 400 validation failures.
- The known qualification category is excluded from ordinary media choices. Its database record and every historical association remain intact.
- Concurrent identical upload retries return the same ready file. Readiness, revision and audit records are written once; changed metadata or bytes still conflict.
- CMS readiness now checks the municipal/direct publication functions, publisher columns, nullable supporting evidence, receipt table and grants, attachment-link grants and approved image/PDF defaults.
- Recovery messages stop advising staff to upload again to fix an unavailable category. Failed forms keep their entered information, files and stable retry IDs.
- The OpenAPI 503 description documents unavailable upload configuration and same-identity retries.

No editor redesign or new publishing step was added. Better Auth, MFA, live admin/editor RBAC, same-origin checks, MIME/signature/full-parser validation, 2 MiB file limits, private byte-verified storage, server publication timestamps, immutable audits and atomic publication receipts remain enforced. Supporting evidence remains optional for routine authorized publication. Existing public routes, historical source-based visibility and retired API behavior remain compatible.

## Exact database operation proposed, not executed

Approved target only:

| Identity | Value |
| --- | --- |
| Project | `misty-silence-69777617` |
| Branch | `br-steep-sea-ao0qw05a` (`staging-talgov-r2`) |
| Database | `neondb` |
| Direct endpoint | `ep-sparkling-bird-ao5precf.c-2.ap-southeast-1.aws.neon.tech` |
| Migration login | `talgov_staging_migrator` |
| Runtime login/group | `talgov_staging_runtime` / `talgov_runtime` |

For the observed six-migration baseline, the minimal complete repair is the existing [003_municipal_content_foundation.sql](../../backend/database/migrations/003_municipal_content_foundation.sql), followed by [004_direct_staff_publication.sql](../../backend/database/migrations/004_direct_staff_publication.sql), in one reviewed transaction. These files are unchanged by this repair PR. Migration 003 supplies scoped content/link privileges and municipal schema. Migration 004 supplies the missing approved image/PDF classifications, nullable evidence, protected staff publisher identity, receipts and publication functions/views. No fixture needs approval and no official content needs creation.

Normalized LF SHA256: 003 = `455c81c7d511c2bf0bdbc45b3bf2ff9d78c5e180fc4ee9b150d05f5fc056a0b7`; 004 = `755577d2f635f2c6eebb8a08c2a6c859664cc8ef24f968e421a092ad0165a411`.

Confirm the deployed database bindings before authorizing the operation. After explicit approval, verified backup/restore evidence and a refreshed read-only preflight, use the already verified direct migration URL in process memory:

```powershell
# Pending approval. The URL must identify exactly the target and migration login above,
# with sslmode=verify-full and channel_binding=require. Never print it.
psql -X -v ON_ERROR_STOP=1 --single-transaction --dbname="$taskCmsMigrationUrl" -f backend/database/migrations/003_municipal_content_foundation.sql -f backend/database/migrations/004_direct_staff_publication.sql
if ($LASTEXITCODE) { throw 'CMS upgrade failed; inspect transaction outcome before retrying.' }
```

The six-entry staging foundation manifest does not apply either CMS migration. Do not replace that manifest or relabel its sixth content-policy entry as municipal migration 003. Preserve its existing ledger; retain the approved migration files, normalized SHA256 values and operation result as the CMS upgrade record. Recheck catalog state before retrying. These migrations are not a replayable patch: applying them again to an upgraded database will fail, and the transaction must roll back.

Only if 003/004 are already fully present and a later preflight isolates missing attachment-link rights, the narrow grant repair is:

```sql
GRANT SELECT, INSERT, DELETE ON app.content_asset_links TO talgov_runtime;
```

That grant is included in 003 and is insufficient for the currently inspected baseline. Do not grant ALL, ownership, elevated role membership, category approval/update rights or audit mutation to runtime. If approved defaults were deliberately withdrawn, investigate that decision rather than silently reapproving them.

## Verification

All database writes use disposable loopback PostgreSQL. Media bytes are synthetic local test files in an in-memory private object store. Browser checks block remote requests. These results are local evidence, not hosted acceptance.

| Check | Result |
| --- | --- |
| Backend lint/build | Passed |
| Focused backend validation, diagnostics and security | 42 passed |
| Backend full Jest / Node regression | 4 / 264 passed |
| Direct upload/publication database regression | 39 passed, zero skipped |
| OpenAPI snapshot and operations | Passed / 17 passed |
| Frontend typecheck | Passed |
| Focused editor/upload React checks | 18 passed |
| Full React coverage / Node checks | 152 / 17 passed; retained coverage surface 98.94% statements, 96.06% branches |
| Frontend production build | Passed; existing large-chunk and mixed-import warnings remain |
| CMS/media/public browser checks | 55 passed at 375px and 1280px, zero skipped |
| Legacy private-media, upload and content database checks | 11 / 12 / 11 passed, zero skipped |
| Foundation migration and backup/restore rehearsal | 13 passed; 10 tables, 23 rows, exact digests, checksums, grants and constraints restored |
| Runtime exclusion | Passed; 526 files checked, including built artifacts |

The database regression covers missing defaults with valid JPEG/PDF files; explicit category mismatch; 42P01 before 004; 42501 on the older link path; migration dry-run rollback; preserved history; default category selection; deterministic concurrent upload completion; duplicate content receipts; lost responses; all thirteen module lifecycles; public download visibility; validation, audit and stale-version rollback; revoked category/source suppression; MFA/RBAC and immutable audit/receipt denial. React checks preserve titles, descriptions and the same file/UUID after upload service failures and preserve the same news submission after a publish 503.

Commands executed from this repair worktree: `npm --prefix backend run lint`, `npm --prefix backend run build`, `node backend/node_modules/jest/bin/jest.js --config backend/jest.config.cjs --runInBand`, `node --test --test-timeout=120000 backend/test/*.test.cjs`, `node backend/scripts/export-openapi.cjs --check`, `node --test ops/test/*.test.mjs` and `node ops/check-runtime.mjs --artifacts`.

Database commands: `powershell -NoProfile -File backend/test/run-staging-database-tests.ps1 -TestFile <file>`, separately for `direct-publication.integration.cjs`, `media.integration.cjs`, `cms-upload-workflow.integration.cjs` and `content-database.integration.cjs`; then `powershell -NoProfile -File backend/test/run-r2-database-tests.ps1`. Each fixture uses a fresh loopback cluster, and each command exited 0.

Frontend commands: `npm --prefix frontend run lint`, `npm --prefix frontend run test:react -- test/react/cms-upload.test.tsx`, `npm --prefix frontend run test:coverage`, `npm --prefix frontend test` and `npm --prefix frontend run build`. Browser command, from `frontend/`: `node node_modules/@playwright/test/cli.js test --config playwright.cms.config.ts --forbid-only`. All final local commands passed. GitHub CI is recorded separately against the PR head; no hosted acceptance was run.

## Files changed

| Area | Files |
| --- | --- |
| Upload reservation/recovery | `backend/src/database/media.repository.ts` |
| Upload API and diagnostics | `backend/src/api/media/media.service.ts`, `media.controller.ts`; `backend/src/security/failure-diagnostics.ts` |
| CMS readiness | `backend/src/database/cms-readiness.ts`; `backend/src/api/health/health.controller.ts` |
| Staff feedback | `frontend/src/lib/staffErrors.ts` |
| Backend regression | `backend/test/direct-publication.integration.cjs`, `failure-diagnostics.test.cjs`, `final-security.test.cjs` |
| Editor regression | `frontend/test/react/cms-upload.test.tsx` |
| Contract | `contracts/openapi.json` |
| Evidence/handoff | This report; `docs/r2/LIVE_CMS_READ_ONLY_EVIDENCE_2026-11-18.json` |

## Hosted approval and verification plan

1. Confirm that `DATABASE_URL`, `STAFF_AUTH_DATABASE_URL` and `MEDIA_DATABASE_URL` identify the intended staging endpoint and least-privileged runtime login. Confirm the existing private object-storage binding. Hosted environment changes, if actually needed, require separate approval.
2. Approve the backup and application of 003/004 to that verified target. Recheck ownership, ledger/checksum and catalog drift before applying; verify counts and historic publication/source records afterward.
3. Approve merging/deploying the source repair to staging separately. Confirm the deployment SHA, canonical alias and readiness result.
4. Separately authorize acceptance using a genuine staff session/MFA and operator-approved real content and media. Verify inline image/PDF upload, direct publication/edit, one audit/receipt on retry, private/public download boundaries and the existing public page. Do not publish synthetic official announcements.
5. If acceptance fails, keep the entered form and retry identity, record its request ID/time and the sanitized runtime failure, and roll back the application deployment if necessary. Preserve the additive database schema and historical records; do not drop receipts or publisher attribution.

Minimum evidence for the existing failed request: its response request ID and timestamp with timezone, a matching sanitized Vercel runtime entry with deployment ID, SQLSTATE/failure phase and transaction outcome, and sanitized endpoint/runtime-role identifiers to establish the deployed binding. Full URLs, cookies, tokens, file contents and staff details are unnecessary.

Hosted migrations, environment changes, merge, deployment and live write acceptance have not been performed. The exact failed-request correlation remains unverified.
