# R2.1 CMS runtime fix handoff

The original handoff below records Astra's work through `c094008`. The completion review at the end records the subsequent authorized delivery and integration checks.

Local branch: `codex/r21-cms-runtime-failures`, based on canonical main `33d99ffa7f75589166ed46de6ded65ea2e930e50` (PRs #120–122 already included). The original checkout and its uncommitted changes are preserved. No push, remote PR, merge, deployment, hosted SQL or configuration change was performed.

## Findings

Confirmed application defects fixed here:

- Content/media services discarded the safe dependency classification when wrapping a database failure as HTTP 503. The exception filter then discarded the distinction entirely. The client displayed the same ambiguous message for missing configuration and uncertain commits, and discarded request references.
- The uploader accepted any string ID and omitted version/kind checks in a successful response. Invalid IDs could then reach UUID media routes. Publication also trusted an attachment metadata response even when its ID differed from the requested asset. These failure paths are reproduced with local fixtures; they are **not attributed to the user's hosted 400**.
- Fetch transport failures and malformed JSON success responses escaped the shared staff error handling. They now enter the existing recovery path without automatic mutation retries.

Safe HTTP 503 `failureCode` values are `dependency_unavailable` and `operation_unconfirmed`. Provider text, SQLSTATE, schema names, credentials, role details and transaction internals remain private. The frontend renders only fixed guidance and a validated UUID request reference. Authorization uses HTTP status rather than matching message text, so a reference does not alter expired-session handling.

Existing shared forms already implement inline image/PDF uploads, local preview and one Publish action. Their fields and backend contracts are retained across News/Updates/Advisories, Tourism, Events, Galleries, Photos, Documents, Downloadables, Transparency, Local Government and Organizational Chart. Upload IDs, queued bytes, content submissions and attachment versions remain stable during recovery. MFA, RBAC, same-origin checks, private storage, file parsing, atomic audits and publication receipts are unchanged.

## Hosted evidence and limits

- A fresh GitHub status associates `33d99ff` with successful Vercel deployment `DbV8PfMs17ZpoKrjsWzRGcw9YM4S`, updated `2026-11-19T06:23:18Z`. The staging alias's exact SHA and database/storage environment bindings were not independently retrieved.
- Fresh read-only Neon metadata confirms project `misty-silence-69777617`, branch `br-steep-sea-ao0qw05a` (`staging-talgov-r2`) and private bucket `talgov-staging-media` still exist.
- Staging `GET /api/health` returned 200. The readiness request ended with a connection reset; it supplies no new readiness result. An initial GET to the nonexistent `/api/health/live` returned 404 and was corrected.
- Vercel runtime-log credentials/connector are unavailable. The Neon SQL tool rejected the read-only catalog query because it requires approval while its session approval policy is disabled. Current grants/schema/categories therefore remain **unrefreshed**.
- The earlier [November 19 read-only evidence](HOSTED_UPLOAD_READ_ONLY_EVIDENCE_2026-11-19.json) records missing approved `website-photos`/`website-documents`, missing direct-publication receipts/functions and nullable-source/publisher schema, and missing SELECT/INSERT/DELETE on `app.content_asset_links`. These are sufficient independent blockers, reproduced on disposable PostgreSQL, but they do not establish the exact cause of either uncaptured hosted POST 503.
- User-supplied 400 ID `1166c4ec-7e82-4bd3-817f-7dccf306f67c` at `06:29:50Z` has no supplied route/payload or matching log; its exact UUID cause remains unverified. GET 404 ID `e6e5b1bc-3fcf-4315-8f1d-98cb708fa774` at `06:32:20Z` targets `/api/admin/content/organizational_chart/publish`, which is a POST-only endpoint. Neither ID identifies a POST 503.

## Smallest safe hosted remediation, approval required

First verify the staging deployment bindings and refresh catalogs using the restricted `talgov_staging_runtime` identity. Check the migration ledger, receipt/functions, nullable media/content source constraints, approved media defaults and runtime attachment privileges. Establish the approved backup/restore point before a schema change.

If the previously observed six-file baseline is unchanged, the existing, unchanged migrations [003](../../backend/database/migrations/003_municipal_content_foundation.sql) and [004](../../backend/database/migrations/004_direct_staff_publication.sql), applied in that order in one reviewed transaction by the staging migrator, supply the missing CMS dependencies. An isolated category insert or link grant does not restore direct publication on that baseline. See the existing [repair proposal](HOSTED_UPLOAD_FAILURE_REPORT_2026-11-19.md) for normalized file hashes and the proposed command. Nothing was executed here.

If 003/004 are already fully installed and only link rights are missing, the narrower repair is:

```sql
GRANT SELECT, INSERT, DELETE ON app.content_asset_links TO talgov_runtime;
```

Use the existing restricted runtime-role membership. Do not add UPDATE, DDL, source approval, audit mutation, ownership or elevated login rights. Recheck capabilities before choosing either repair; never replay 003/004 blindly. The existing private bucket needs no confirmed configuration change.

## Changed files

- `backend/src/api/content/content.service.ts`, `backend/src/api/media/media.service.ts`: retain trusted failure classifications across HTTP wrapping.
- `backend/src/security/all-exceptions.filter.ts`: bounded CMS-only recovery code, with normal response sanitization intact.
- `frontend/src/lib/staffErrors.ts`, `frontend/src/contexts/StaffAuthContext.tsx`: meaningful fixed guidance, safe request references and recoverable transport/JSON failures; status-based expired-session handling.
- `frontend/src/lib/mediaUpload.ts`, `frontend/src/components/admin/AdminContent.tsx`: UUID/version/kind/readiness checks and requested-asset identity matching before attachment publication.
- Backend/runtime, disposable database, React and browser regression files; this handoff and the prepared PR description.

## Verification

| Check | Result |
| --- | --- |
| Backend `npm test` | 284 Node tests and 4 Jest tests passed; zero failures/skips |
| Disposable PostgreSQL direct publication/upload suite | 40 passed; zero failures/skips |
| Focused React CMS and staff login/recovery checks | 48 passed |
| All CMS browser cases | 42 passed at mobile/desktop widths |
| Backend/frontend lint and production builds | Passed; existing frontend chunk-size/mixed-import warnings |
| OpenAPI contract snapshot and Git whitespace check | Passed |

The CMS browser invocation selected one file through the release-wide wrapper. Its 42 tests passed, but the wrapper correctly returned failure because the full 155-test inventory and unrelated required suites were absent. This is a focused browser result, not a passed release gate. Initial sandbox write/process denials were resolved by approved local reruns. The hidden worktree name initially prevented Jest discovery; a visible worktree name resolved it and the complete backend suite then passed. A new React test initially clicked while upload completion still disabled Publish; waiting for completion fixed the test, and final checks passed.

All database writes and uploaded bytes in tests belong to fresh loopback PostgreSQL and fake storage. Browser APIs are mocked; these tests do not establish authenticated hosted acceptance. Final worktree: `C:/Users/admin/Documents/Talibon-Official-Website-BetaTest-V1.5/cms-runtime-r21`.

## Next action

Approve pushing only `codex/r21-cms-runtime-failures` to canonical and opening a separate draft PR with [the prepared description](CMS_RUNTIME_FIX_PR.md). Hosted remediation and deployment need separate approval after the pinned preflight. Then verify real staff MFA → upload → attach → preview → Publish → public visibility, including lost-response recovery, on staging.

## Completion review

The user authorized pushing the existing branch to `azinamouto/Talibon-Official-Website-BetaTest-V1.5` and creating a separate draft PR against canonical `main`. Merge, deployment, Vercel changes, hosted Neon changes and execution of migrations 003/004 remain unauthorized.

The existing clean worktree and runtime commit `c0940088cdba6b6a8fd70c9f41b638b991fb1813` were reused. Canonical `main` was fetched and matched the recorded base `33d99ffa7f75589166ed46de6ded65ea2e930e50`. The full diff was reviewed for error redaction, UUID route compatibility, attachment identity/version checks, retry identity, and preservation of MFA/RBAC, private storage, transactions, immutable audits and duplicate protection. No further application changes were required. Other worktrees and uncommitted changes were preserved.

Astra's backend 284 Node tests, four Jest tests in one suite, disposable PostgreSQL 40 tests, lint and builds were carried forward because runtime source and dependencies are unchanged. Canonical-base [frontend CI](https://github.com/azinamouto/Talibon-Official-Website-BetaTest-V1.5/actions/runs/44471050700) and [backend/database CI](https://github.com/azinamouto/Talibon-Official-Website-BetaTest-V1.5/actions/runs/44471050460) were independently confirmed successful. These are baseline evidence, not hosted acceptance or checks on the forthcoming PR.

Fresh local integration results:

| Command / check | Result |
| --- | --- |
| `npm --prefix frontend test` | 17 passed; zero failures/skips/TODOs |
| `node node_modules/vitest/vitest.mjs run --coverage --maxWorkers 1 --testTimeout 30000` (frontend cwd) | 22 files / 163 tests passed; existing coverage thresholds passed |
| `npm --prefix frontend run test:browser` | 200 passed, including all 42 CMS cases; strict inventory passed, zero skips/issues |
| `node scripts/run-browser-suite.mjs admin` (frontend cwd) | 10 passed; strict inventory passed |
| `node scripts/run-browser-suite.mjs contracts` (frontend cwd) | 10 passed; strict inventory passed at original test deadlines |
| `node scripts/run-browser-suite.mjs login` (frontend cwd) | 21 passed; strict inventory passed for recovery disabled/enabled |
| `node scripts/run-browser-suite.mjs eservices` and `eservices --grep 'payments remain unavailable by default'` with `TEST_SUBMISSION_PAYMENTS=false` (frontend cwd) | 23 passed plus 1 explicit disabled-payments check; strict inventories passed |
| `node backend/scripts/export-openapi.cjs --check` | Passed; snapshot unchanged |
| `node --test ops/test/*.test.mjs` | 17 passed; zero failures/skips/TODOs |
| `node ops/check-runtime.mjs --artifacts` | Passed; 526 source/build files checked |
| `npm audit` for root/frontend/backend and backend `--omit=dev` | Root/frontend and backend production: zero vulnerabilities; backend development tree: 25 moderate package findings, zero high/critical |

The coverage percentages apply only to the existing configured Sprint 5 surface: statements 98.94%, branches 96.06%, functions/lines 100%. They are not whole-CMS coverage. An unchanged mayor-layout test hit its original five-second deadline under concurrent local work; its focused recheck passed, and the complete coverage run passed with one worker and a longer local deadline. Assertions, repository test settings and coverage thresholds were retained. Two concurrent contract runs hit the fixed About-page deadline (initially 2 failures/8 passes, then 1 failure/9 passes). The final serial contract run passed all 10 tests at their original deadlines; the earlier timeout results remain recorded rather than erased.

The original 42-case CMS invocation was correctly rejected as a release gate because the other required suites and minimum inventory were missing. The release wrapper was retained without lowering its inventory, permitting skips or overriding its reporter. The final release report records 200 discovered/executed tests, minimum 155, every mandatory suite present, zero skipped tests and no inventory issues. No gate implementation change was needed.

No hosted SQL access was attempted or retried during this continuation. Earlier catalog observations still support the conditional remediation already documented above: unchanged 003 then 004 for the six-file baseline, or only `GRANT SELECT, INSERT, DELETE ON app.content_asset_links TO talgov_runtime` if both migrations are already fully installed and only those link rights are absent. Both normalized migration hashes were rechecked and match the existing report; neither migration was executed. Link rights alone cannot restore the missing upload defaults, nullable source constraints or direct-publication functions/receipts. Current catalogs, deployed database/storage bindings and exact POST 503 log correlation remain unverified.

Next approval: review the draft source PR, then separately authorize a bounded hosted preflight and the evidence-supported staging repair with backup/restore readiness. Merge/deployment and genuine staff MFA/upload/attach/Publish/public-visibility acceptance require separate approval. Local fixtures and passing tests do not qualify hosted functionality.
