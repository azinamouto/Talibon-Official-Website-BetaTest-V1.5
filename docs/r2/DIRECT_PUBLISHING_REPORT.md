# TalGov R2.1 direct staff publishing

Source-only implementation on `feat/r21-direct-publishing-20261118`, based on canonical main `b0ecb71f3b0c74f234350a14c3174c175bf3f373`. Worktree: `C:/Users/admin/Documents/TalGov-R21-Direct-Publishing-20261118`. This report supersedes the mandatory draft/source approval workflow described in the earlier CMS reports for ordinary publication.

## Staff workflow

Select a module, enter its relevant information, add files, and click **Publish**. New content and revisions use one action. A successful response links to the existing public website page. News, updates, and advisories have a post type, title, and body; summary, address, and publication time are generated. Tourism has descriptions, locations, opening hours, highlights, event details or delicacy information as appropriate. Transparency and downloadables have categories, descriptions and PDFs. Offices and charts have named people, positions, offices, reporting relationships and photos. Albums accept multiple photos.

Routine forms no longer require sources, checksums, qualifications, approvals, drafts or prior media publication. Supporting documents can be attached in the form; existing source associations remain attached when editing. Historical evidence registration and approval remain available to administrators separately. No historical sources, content or audits are removed or fabricated.

Files upload directly in each form, with previews, removal, progress and retry. Ready files remain private until the content publication transaction commits. Appropriate file types are enforced per module; the existing 2 MiB per-file and 50-attachment bounds remain. File names are normalized automatically. The optional library is collapsed until needed. Staff can edit published content, withdraw it, archive/restore it and, as an administrator with fresh MFA, soft-delete it.

## Security and consistency

Direct publishing uses Better Auth cookies, the existing MFA assurance and live database authorization for active administrators/editors. JSON allowlists, same-origin checks, shared rate limits, validated static images/passive PDFs, private storage and verified downloads remain enforced. Ordinary roles cannot publish or delete content. Technical supporting evidence is optional; staff authority is recorded in protected publisher columns assigned only by narrowly granted database functions after live session/MFA checks.

Content, selected file publication, attachment links, publisher identity, server timestamp, audit events and an immutable submission receipt commit together. Stale versions and audit failures roll back. A stable submission UUID and payload comparison serialize duplicate requests and recover a lost response without repeating publication or audits. The editor keeps the same submission after an uncertain response and protects it from accidental navigation. File retries retain the original upload identity, metadata and bytes.

Existing published rows keep their source-based visibility rules and timestamps; migration 004 does not backfill staff authority onto historical records. Source withdrawal still suppresses legacy publications. Public APIs continue to use protected publication views and suppress content with inaccessible attachments. Existing public routes and unrelated retired API responses are retained.

## POST 503 evidence

The captured failure is **POST** `https://talgov-r2-staging.vercel.app/api/admin/content/news`, HTTP 503 after approximately 10.57 seconds. The supporting authenticated GET requests succeeded. There is no correlated response/request ID or runtime log yet.

Read-only inspection of the intended staging branch/database found:

- `talgov_staging_runtime` inherits `talgov_runtime` and can insert content title/body, update publication and insert immutable audits.
- It cannot SELECT, INSERT or DELETE `app.content_asset_links`.
- The route's repository always executes `DELETE FROM app.content_asset_links WHERE content_id=$1`, including a new post without attachments. Attachment posts also require the missing SELECT and INSERT rights.
- The expanded municipal kinds, `app.approve_content_source` function and other migration 003 changes are absent. The staging ledger contains the six foundation/auth/media/content policy migrations, which are distinct from municipal migration 003.
- Migration 004's publisher columns, receipt table and direct-publishing functions are absent. The point-in-time lock inspection found no held locks. A SELECT made as the staging runtime connected successfully; this does not certify Vercel's deployed database binding or its pooled TLS configuration.

The matching local fixture proves **SQLSTATE 42501 / permission_denied** at the link-delete query becomes sanitized HTTP 503 with confirmed rollback. Applying 003 on disposable local PostgreSQL resolves that reproduced failure with authentication unchanged. This is a confirmed staging authoring blocker and a reproduced server failure, not a claim that the exact captured request reached this query. The 10-second transaction bound could also explain the observed timing if a prior operation timed out; duration alone cannot distinguish these failures.

Sanitized catalog and permission evidence is in [POST_AUTHORING_READ_ONLY_EVIDENCE_2026-11-18.json](POST_AUTHORING_READ_ONLY_EVIDENCE_2026-11-18.json). Vercel project/log access with the available credential returned HTTP 403 `forbidden` for the requested staging team. Runtime environment bindings, deployed commit and the exact request remain unverified. New source diagnostics record only allowlisted operation, route, request ID, elapsed time, failure phase/code, runtime guard predicates and transaction outcome; they do not expose SQL, provider text, cookies, object keys, credentials or entered content.

### Retrieve the existing request and Vercel logs

1. In the browser's existing Network entry for the failing POST, copy the response `X-Request-Id`, response JSON `requestId`, and `x-vercel-id` if present. Record the timestamp with timezone and the sanitized response body. Do not export a full HAR or copy request cookies, tokens or private form contents.
2. In Vercel, select team `rynzz22s-projects`, project `talgov-r2-staging`, then **Logs**. Select the deployment serving the canonical staging domain and the time window around that request. Filter the request path `/api/admin/content/news`, method POST and status 503; use its request ID if available. Open that request's runtime logs and record the deployment ID/commit.
3. Share only the application failure JSON or a sanitized entry with timestamp, request/deployment ID, exception type, SQLSTATE, failure phase and transaction outcome. Remove database URLs/passwords, cookies, tokens, staff details, full SQL parameters, object keys and entered content. A `42501` permission failure confirms the grant defect; `25P04`/`57014`, connection or guard errors identify a different earlier failure. If the current artifact has only the generic content error, retain the request metadata and provide its sanitized runtime exception.

## Verification

All database writes below use fresh loopback-only PostgreSQL clusters pinned by directory/cluster identity. Object storage is disposable in-memory storage. Browser fixtures block external requests. These checks do not constitute hosted staging acceptance.

| Check | Result |
| --- | --- |
| Backend lint and build | Passed |
| Backend Jest and Node regression suites | 4 + 263 passed |
| Foundation migration, privilege and backup/restore rehearsal | 13 passed; 10 tables and 23 rows restored with exact digests, migration checksums, grants and constraints |
| Staff password/TOTP and first-administrator bootstrap suites | 12 + 6 passed across separate recovery-enabled/disabled fixtures |
| Frontend typecheck and Node tests | Passed; 17 Node tests |
| Full React coverage run | 148 passed; existing coverage surface 98.94% statements / 96.06% branches |
| Focused CMS/media/public browser suite | 55 passed, including every editor lifecycle at 375px and 1280px |
| Legacy municipal database suite | 11 passed |
| Legacy upload/content database suite | 12 passed |
| Direct publication and POST diagnosis suite | 33 passed, including all module kinds, retries, rate limiting, atomic audits and migration dry-run |
| Private-media database suite | 11 passed, including real Better Auth password/TOTP cookies and byte-verified downloads |
| Required staff browser gate | 10 passed |
| Required public contract browser gate | 10 passed |
| Frontend production build | Passed; existing bundle-size warning retained |
| OpenAPI snapshot and operations tests | Passed; 17 operations tests |

Earlier failures were corrected without weakening runtime controls or test thresholds: stale browser selection and incomplete pagination fixtures; an initial local startup timeout that did not recur; and a combined fixture that exceeded the retained publishing rate limit. Module cases now run independently, and a dedicated duplicate-retry test explicitly exercises the rate limit. Temporary setup tracing was removed. All final local CMS checks pass without skipped cases. Authentication conditionally skips the inactive password recovery mode; both modes were verified in separate local fixtures. GitHub CI is checked against the PR head separately.

The initial GitHub database failure was a foundation rehearsal that still expected three migrations after this PR added 004. The corrected test covers every checked-in migration, upgrades from 001 through the current schema, checks replay and checksum drift, and runs its failing DDL after the latest migration. It asserts SQLSTATE 42703 and verifies that both the DDL and migration ledger roll back, rather than accepting an unrelated migration-history rejection. The complete database CI chain plus the separate recovery-disabled check passed locally: 98 tests, including logical backup/restore reconciliation.

## Changed files

The PR changes 42 source, contract, test, workflow and documentation files. No build outputs, credentials or local test clusters are included.

| Area | Files |
| --- | --- |
| Database publication | `backend/database/migrations/004_direct_staff_publication.sql`; `backend/src/database/content.repository.ts`, `media.repository.ts`, `repositories.ts` |
| Content API | `backend/src/api/content/cms.controller.ts`, `content.dto.ts`, `content.service.ts`, `municipal-schema.ts`, `officials-schema.ts` |
| Media API | `backend/src/api/media/media.controller.ts`, `media.dto.ts`, `media.service.ts` |
| Validation and diagnostics | `backend/src/security/cms-validation.ts`, `failure-diagnostics.ts`; `contracts/openapi.json` |
| Staff forms and controls | `frontend/src/components/admin/AdminContent.tsx`, `AdminMedia.tsx`, `CmsControls.tsx`, `CmsRouteGuard.tsx`, `DraftMediaPanel.tsx`, `EditorActions.tsx`, `MunicipalDashboard.tsx`, `OfficialEditor.tsx`, `municipalModules.ts` |
| Editor state and public display | `frontend/src/hooks/useCmsEditor.tsx`; `frontend/src/lib/mediaUpload.ts`, `staffErrors.ts`; `frontend/src/pages/StaffPortal.tsx`, `about/DepartmentsView.tsx` |
| Backend verification | `backend/test/direct-publication.integration.cjs`, `officials-schema.test.cjs`, `r2-database.integration.cjs`, `run-staging-database-tests.ps1`; `.github/workflows/backend.yml` |
| Frontend verification | `frontend/test/browser/admin.spec.ts`, `cms-uploads.spec.ts`, `media.spec.ts`; `frontend/test/react/admin-content.test.tsx`, `cms-upload.test.tsx`, `staff-portal-dashboard.test.tsx` |
| Handoff | This report and `docs/r2/POST_AUTHORING_READ_ONLY_EVIDENCE_2026-11-18.json` |

## Hosted operations require separate approval

Review and transactionally apply existing [003_municipal_content_foundation.sql](../../backend/database/migrations/003_municipal_content_foundation.sql), followed by new [004_direct_staff_publication.sql](../../backend/database/migrations/004_direct_staff_publication.sql), only to explicitly approved project `misty-silence-69777617`, branch `br-steep-sea-ao0qw05a` (`staging-talgov-r2`), database `neondb`. Inspect schema/grant drift and preserve a verified backup before any approved operation. The unchanged pinned staging migration manifest does not automatically apply either municipal migration. Migration 004 is never run at application startup.

Migration 003 supplies the missing authoring privileges and municipal schema. Migration 004 makes supporting evidence nullable, records staff publication authority, adds immutable retry receipts and real file categories, and updates the protected publication functions/views. Its local dry-run rollback and history preservation are tested. Hosted environment variables, credentials, Neon resources, migrations and deployments were not changed. Deployment and real cookie/MFA/storage/public-visibility acceptance remain separately authorized operations. The PR targets main; do not merge or deploy automatically.
