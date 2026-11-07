# Final backend migration ? local verification

Date: 2026-11-07 (Asia/Shanghai). **NOT PRODUCTION-QUALIFIED.**

Branch: `feat/talgov-final-backend-migration`. Base: `5235a668a23dbfc759086dc3b65e379ab9b0c76b`.
Worktree: `C:/Users/admin/Documents/TalGov-Final-Backend-Migration`.
The original IDE checkout and the separate `-azinamouto` documentation checkout were not edited. Both repository URLs resolved to the same baseline. Increment 5 (`39ce924`, implementation `d8a675a`) was compared against current main and selectively adapted; it was not cherry-picked over partner changes.

## Implemented evidence

| Area | Files and behavior |
|---|---|
| Runtime removal | `backend/src/app.module.ts`, `backend/package*.json`, `backend/src/security/auth.guard.ts`, `archive/r1/backend/`: remove legacy provider binding and dependency; retain historical code outside runtime. Clean builds remove stale compiled provider files. |
| Published content | `backend/src/database/public-content.service.ts`, `api/{about,executive,legislative,transparency,tourism,news,content,search}/*.service.ts`: parameterized reads from `app.published_content`, approved sources only, pagination, bounded search, sanitized 503 failures. Hardcoded backend civic records and sample notices were removed. |
| Empty states | Object feeds return `{}` and list feeds return `[]`. `frontend/src/pages/ContentPage.tsx` recognizes empty objects. Tourism views no longer substitute random photos; BudgetView no longer fabricates a certification/preparation claim. Partner layout and stylesheet work remains intact. |
| Public media | `backend/src/database/media.repository.ts`, `api/media/media.{controller,service}.ts`: paginated `GET /api/media?kind=photo|document&page=N`, photo preview, authorized download. Listing uses `app.published_media`, omits keys/uploader/source/checksum fields, and fails closed on revoked approval. Downloads reauthorize and verify object integrity. |
| Frontend media | `frontend/src/services/api.ts`, `pages/DownloadsPage.tsx`, `components/PublishedPhotos.tsx`: paginated documents and photos, authorized backend links, explicit loading/error/empty states. The news gallery API also uses approved photos. Existing news `image_url` fields can reference public preview URLs; broad news editing remains disabled. |
| Shared rate limits | `security/rate-limiter.guard.ts`: atomic shared PostgreSQL counters using the existing `app.staff_auth_throttle` contract, distinct `http:` keys, 120/min public reads, 60/min public media, stricter mutation categories, 429 retry headers, 503 on store failure. Liveness is dependency-independent. |
| Client identity | `security/client-ip.ts`, `authentication/better-auth.adapter.ts`: the Vercel-provided single IP is used only when the deployment environment sets `VERCEL=1`; otherwise Express socket/trusted-proxy identity is used. Invalid/missing Vercel IPs fail closed. Browser-supplied internal headers never become identity. Staff per-account and per-IP controls remain. |
| Audit | `security/audit.middleware.ts`: persist before ending the response; use live `req.staff.id`; omit bodies, cookies, query strings and concrete identifier paths. Media/staff mutation audits remain transactional. Request-audit DB failures are logged without secrets; platform log retention/delivery still requires hosted qualification. |
| Readiness | `api/health/health.controller.ts`: probe public content/throttle/audit, staff session/MFA, media metadata and private storage ACL/policy; any failure returns 503. This is connectivity/privacy readiness, not proof of recovery email, provisioning or production qualification. |
| Security configuration | `config/environment.ts`, `backend/.env.example`: require database/auth/mail/storage configuration in production, verify connection options, HTTPS staff/storage origins, and signing-secret minimum length. `vercel.json`: self-only scripts, no eval, object/frame restrictions. API docs disabled in production. `.nvmrc` and package engines pin the Node 22 compatibility range. |
| CI/release | `ops/test/production-gates.test.mjs`: assert the live retired-payment boundary rather than a deleted frontend module. Workflows use R2 database/auth/media suites, runtime exclusion and PostgreSQL backup. `ops/verify-official-data.sql` permits an empty fresh database while rejecting unapproved publication. Production release remains explicitly gated. |
| Contracts | `contracts/openapi.json`, `backend/scripts/export-openapi.cjs`, controller response decorators: retained routes, empty states, media listing and deferred 410 responses. |

Client-IP platform contract: [Vercel request headers](https://vercel.com/docs/headers/request-headers). Platform behavior must still be confirmed on the authorized staging deployment; this work did not contact a hosted environment.

## Fresh database and content contracts

No existing development records were imported. No production schema, credential, bucket or hosted resource was changed. No new schema migration was needed: the existing publication views, JSON content bodies, auth throttle/audit tables and private media policy support this integration.

- Apply foundation migrations `001_foundation.sql`, `002_privileges.sql`, then auth `001_provider.sql`, `002_staff_policy.sql`, then media `001_media_policy.sql` on an approved empty isolated target before production.
- Use pooled least-privilege runtime connections; direct owner connections only for approved offline migration/backup. Existing `pg` pools retain max 2 connections each, TLS certificate verification and bounded query/transaction timeouts. Several lazy service pools exist; qualify aggregate concurrency before release.
- Simple informational pages use kind `pages`, slug `<section>-<route>` (for example `executive-vision-mission`, `about-profile`, `transparency-budget`) and the view's existing fields in `body`.
- List-shaped page aggregates use approved `pages.body.items`: executive directory, transparency infrastructure/finance/orders/biddings/ordinances and tourism delicacies. Missing `items` yields `[]`.
- Dedicated datasets use existing kinds: departments, officials, barangays, services_cms, ordinances, resolutions, tourism_spots and news. Festivities use `events` with category `festivity`. News categories use ARTICLE, UPDATE, ADVISORY and NOTICE.
- Only an authorized content owner may populate and approve these records. The runtime cannot edit public content. Media CMS remains photos/documents only. No synthetic government records were introduced; synthetic fixtures exist only in tests on disposable local databases.
- Public media stays `no-store` so unpublication takes effect on the next request. CDN caching is deliberately not introduced without a revocation design. File limit remains 2 MiB; acceptance of this limit and malware-scanning policy remain open.

## Verification

Evidence directory: [final-migration](evidence/final-migration/). Logs distinguish failed attempts from subsequent successful runs. Tests ran locally on Windows, Node 22 and disposable PostgreSQL 18; browser suites used local Edge with mock APIs. No hosted test is implied.

| Gate | Result / evidence |
|---|---|
| Backend lint/build | Passed; `backend-lint-verified.log`, backend test build output |
| Backend tests | 3 Jest + 56 Node passed, no TODO/skips; `backend-test-complete.log` |
| Foundation/database/HTTP | 13/13; `r2-db.log`. Logical backup/restore verified 9 tables, 21 synthetic rows, exact digests, checksums, grants and constraints. |
| Staff/MFA database | 8/8; `auth-db.log`, including expiry/revocation, TOTP replay, role boundaries and audit immutability |
| Media database | 10/10; `media-db-final.log`, including shared cross-instance rate counters and public approval boundaries |
| Frontend Node | 12/12 after contract example correction; `frontend-test-complete.log` |
| Frontend React | 88/88; `frontend-react-final.log` (`--maxWorkers=2`). Earlier full concurrency run had one 5-second chatbot timeout, retained in `frontend-react.log`. |
| Frontend lint/build | Passed; `frontend-lint-complete.log`, `frontend-build-complete.log`. Large bundle warning remains in this pre-performance build. |
| Browser contract routes/search | 10/10; `browser-contracts.log` |
| Browser media/integration/shutdown scope | 8/8; `browser-integration-final.log`, including 375px and 1280px media views |
| Browser disabled e-services | 23/23; `browser-eservices.log` |
| Browser staff UI | 5/5; `browser-admin.log` |
| Ops | 16/16; `ops-verified.log` |
| Baseline browser defect | 4 emergency-theme failures: tests expect a siren emoji but the baseline span is empty. Component, CSS and test were confirmed byte-identical to origin/main. Preserved rather than altering partner UI. See `browser-targeted.log` (8 passed, 4 failed). |

Older Supabase-specific auth/content tests were archived with the retired implementation; their old counts are not current R2 evidence. Database and HTTP suites exercise the new provider boundary. The foundation HTTP suite isolates the rate guard because it intentionally lacks auth tables; the combined media database suite tests the real shared limiter concurrently.

## Security and release blockers

1. **P0 credential exposure:** Claude's supplied audit identifies a production service-role JWT in historical commit `356e294`. Treat it as compromised. An authorized operator must revoke/rotate affected credentials and review access logs since exposure. No credential was retrieved, printed, tested or rotated here. Removing runtime references does not revoke a credential.
2. **Hosted shutdown:** direct legacy grants/RPCs/functions/signup/schedules remain unverified. Application 410 responses do not prove provider-side shutdown. Do not delete resources as part of this branch.
3. **Hosted stack:** fresh LGU-owned production/staging Neon, private bucket, staff roster/MFA enrollment, recovery mail, Vercel packaging/limits/real-IP behavior, and DNS cutover remain unqualified. No deployment or provisioning was performed.
4. **Dependencies:** backend production has 2 high findings (`@nestjs/platform-express`/`multer`); root has 2 high + 1 moderate; frontend production has 0. Backend full tree has 28 (2 high, 23 moderate, 3 low). Swagger's moderate finding was removed by the adapted patch. No untested major Nest upgrade or risk acceptance was made. See `audit-*.json`.
5. **Recovery and monitoring:** encrypted hosted database restore, private object backup/restore, measured RPO/RTO, alert delivery, log retention, and failover/cold-start/load behavior remain open. The local logical backup does not cover those gates.
6. **LGU decisions:** approve source-held civic content and surviving legacy WordPress assets, cloud ownership/hosting, content publication workflow, privacy/retention, accessibility, and release/rollback operators. Copilot's revised documentation in the separate checkout was read and left untouched; this branch does not overwrite it.
7. **Known baseline UI test defect:** emergency-theme assertions remain failing as described above. A full all-spec browser pass is not claimed.

## Authorized staging preparation (not executed)

Use a fresh isolated LGU-approved target with production-like least-privilege roles, reviewed migration checksums, no copied development records, and separate secrets from production. Rehearse the ordered schema chain, private storage permissions, real staff enrollment and email recovery. Verify the exact candidate's upload/PDF worker/native image packaging, CSP and client-IP behavior on Vercel. Exercise publish/unpublish/revoke, direct forbidden routes, readiness dependency failures and concurrent rate limiting. Perform encrypted database and object restores into another isolated target and record RPO/RTO. Require dated LGU/IT/security approvals before enabling release or backup workflows.

Rollback must preserve the Neon data and object/audit history and use a separately verified candidate. Never reactivate the exposed legacy stack as an automatic fallback. No production rollback was performed.

No push, merge, deployment, production mutation, secret rotation or legacy-resource deletion occurred.
