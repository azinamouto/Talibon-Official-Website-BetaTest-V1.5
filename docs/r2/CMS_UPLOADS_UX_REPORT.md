# TALGOV R2.1 CMS uploads and editor UX

Source-only work on `fix/talgov-r2-1-cms-uploads-ux`, based on canonical main `d72d184d6804cca6130025e65ccd952470cd616d`, verified again on 2026-11-17. Worktree: `C:/Users/admin/Documents/TalGov-R2-1-CMS-Uploads-UX`. The commit containing this report identifies the ending SHA (`git log -1 --format=%H -- docs/r2/CMS_UPLOADS_UX_REPORT.md`).

## HTTP 400 diagnosis

The source defects are reproducible at `POST /api/admin/media/uploads`:

- The combined uploader allowed a PDF with a photo category. The unchanged composite foreign key `(category_id, kind)`, `media_assets_category_id_kind_fkey`, rejects this with SQLSTATE `23503`; the repository maps it to HTTP 400. A preflight now returns a sanitized `fieldErrors: { "categoryId": "category_kind" }` while retaining the database constraint.
- The client did not enforce the existing filename rule: `^[a-zA-Z0-9][a-zA-Z0-9 _-]{0,100}\.(jpg|jpeg|png|webp|pdf)$`, case insensitive. A name such as `report (1).jpg` returns HTTP 400 with `fieldErrors: { "filename": "filename" }`. Editors now show an editable compatible upload filename; file contents are unchanged.
- Previously, the frontend discarded the 400 response details. Only allowlisted field names, bounded attachment/chart paths and fixed validation codes now cross the error boundary. Provider diagnostics, input values, storage keys and staff IDs are excluded.

**The original staging incident is unconfirmed:** its sanitized request/response was not supplied. These are locally reproduced source causes, not a claim about a particular deployed request. Missing or invalid category/source UUIDs, MIME mismatch, noncanonical base64, empty/oversized files and active/corrupt documents remain rejected. Wrong-origin requests remain HTTP 403; unauthenticated requests remain HTTP 401. Hosted constraints and migration state were not inspected or mutated.

## Functioning workflows

Every municipal content editor supports direct image/PDF selection and drag-and-drop, measured transfer progress, private verification, retry using the same upload identity, immediate attachment to the open draft, captions, photo alternative text, featured photos, previews and removal. Staff save the draft to persist its links. Queued files must be uploaded or removed before saving, and their slots count toward the existing 50-attachment limit.

The existing private Neon Storage and media APIs remain in use. The 2 MiB limit and full static-image/passive-PDF parsing remain unchanged. Successful uploads never publish automatically. Staff explicitly publish approved files, then the reviewed content record. Unpublishing or withdrawing provenance removes dependent public reads.

The library filters by type, search and readiness before pagination. `GET /api/admin/media/:id` returns authenticated ready metadata for attachments beyond the current library page. Pending recovery is offered only to the creator, retains original metadata and filename, and warns before discarding unsaved work. Retries cannot change reserved metadata or bytes.

Searchable source/category selectors explain approval status and private-draft restrictions. Unapproved categories and withdrawn/rejected choices are disabled; pending sources remain eligible for private drafts under the existing server policy. Administrators have direct Source approvals links. The database has no explicit rejection workflow; reviewed-but-unapproved sources are labelled “Approval withdrawn,” and explicit rejection is displayed only if supplied by the API.

CMS screens retain TalGov styling and include consistent spacing, labelled inputs, field errors, upload cards, skeletons, accessible progress/status feedback, recoverable empty/error states, disabled saving controls, native unsaved-change dialogs, browser-back/leave protection and mobile reflow. Better Auth, MFA, RBAC, immutable audits, transaction rollback and Neon runtime guards are preserved.

## Validation

Commands run from the named package directory unless stated otherwise.

| Check | Result |
| --- | --- |
| Backend lint/build; frontend lint/build | Passed |
| `node --test --test-timeout=120000 test/cms-upload-validation.test.cjs test/media-options.test.cjs test/media.test.cjs` | 13/13 passed |
| `powershell -NoProfile -ExecutionPolicy Bypass -File test/run-media-database-tests.ps1` | 11/11 passed, disposable PostgreSQL, including real password/TOTP cookies |
| `powershell -NoProfile -ExecutionPolicy Bypass -File test/run-staging-database-tests.ps1 -TestFile content-database.integration.cjs` | 11/11 passed, disposable PostgreSQL |
| Same runner with `-TestFile cms-upload-workflow.integration.cjs` | 10/10 passed; real constraints/HTTP, upload recovery, attachments, featured photos, all retained modules, approvals, public retrieval and unpublication |
| `npm test` in backend | 257/257 Node + 4/4 Jest tests passed |
| `node scripts/export-openapi.cjs --check` in backend | Passed; snapshot regenerated |
| `npm test` in frontend | 17/17 Node tests passed |
| Focused React CMS/editor/dashboard tests | 26/26 passed |
| `npm run test:coverage` in frontend | 137/137 React tests passed; existing configured coverage surface passed at 98.94% statements and 96.06% branches |
| `npx playwright test --config=playwright.cms.config.ts --reporter=list` in frontend | 16/16 passed on the final source |
| `node ops/check-runtime.mjs --artifacts` at repository root | Passed, 511 files checked |
| Audits of root/backend/frontend, all and production-only | All exit 0 at high severity; production trees have zero advisories. Backend development tree has 25 existing moderate advisories |

Earlier failures were retained in the work record and corrected: two browser selector matches after adding search labels; one loading-text assertion that omitted transfer percentage; duplicate test-pool teardown; and a 50-file React test timeout from broad DOM queries. A stalled Windows output-capture command was interrupted and the frontend gate rerun directly. Assertions, fixture size, server checks and coverage thresholds were preserved. Final tests have zero failures, skips or TODOs. Database/storage tests use disposable local PostgreSQL and in-memory object storage, not hosted Neon qualification. Browser API responses are intercepted synthetic test fixtures with external traffic blocked; production code contains no fake success path.

## Hosted handoff

No migration SQL, deployment workflow, hosted resource, other worktree, dependency version or retired service was changed. No deployment, merge or hosted database/storage mutation was performed. Rollback is a source revert; there is no new schema migration.

The Vercel and Neon migration 003 owners must supply deployment/migration acceptance and run the real authenticated image/PDF → saved draft → file publication → content publication → public retrieval → unpublication flow against the deployed artifact. Original staging 400 request/response evidence and real private-storage acceptance remain unverified here. Reviewed municipal sources/categories and content-owner signoff remain required for public release.
