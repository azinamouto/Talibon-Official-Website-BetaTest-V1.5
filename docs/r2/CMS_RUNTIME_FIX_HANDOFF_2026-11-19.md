# R2.1 CMS runtime fix handoff

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
