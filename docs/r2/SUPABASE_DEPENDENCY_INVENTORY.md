# Supabase dependency inventory

## Increment 4 CMS delta (2026-11-04)

Staff photo/document workflows now use `/api/admin/media` and Neon S3/PostgreSQL only. The legacy `FileUpload.tsx` uploader is retired and no longer calls Supabase Storage or returns fake success URLs. Media requests bypass legacy Supabase audit persistence because media mutations audit atomically in PostgreSQL. Other legacy/public Supabase dependencies remain in the application and package trees; this is not the WP5 whole-application exclusion claim. No hosted Supabase object permissions or production data were changed. See [media operations](MEDIA_OPERATIONS.md).

Status: repository inspection completed at R1 `fd2fe689b2f442f22409ca9c7a2699e3cd0c25be`; deployed account inventory pending credentials. See [machine-readable source inventory](evidence/source-inventory.json) for file/line references, literal table/RPC calls, SQL declarations and migration SHA-256 values. The lexical scan covers tracked runtime source, workflows, ops, edge functions, package manifests/locks and example environments; it is not an import-graph or live-bucket audit.

## Increment 3 authentication delta (2026-11-02)

The inventory below is a historical R1 baseline, not the current branch dependency graph. Increment 3 adds Better Auth 1.7.15 and uses the existing `pg` dependency for staff-only cookie sessions on PostgreSQL. Supabase login/refresh/signup/session/logout and R1 user-management/report APIs return 410; no new auth code calls Supabase. The browser staff context uses same-origin Better Auth endpoints. Existing Supabase packages and unrelated public-read/storage dependencies remain; this delta does not claim whole-project Supabase removal. See [Increment 3 authentication contracts](AUTH_AND_STORAGE_CONTRACTS.md) and [qualification report](INCREMENT_3_REPORT.md).

## Dependency graph

| Manifest/lock | Direct requirement | Locked SDK |
|---|---|---|
| root `package.json` / lock | `@supabase/supabase-js ^2.101.1` | 2.112.3 |
| `backend/package.json` / lock | same | 2.112.4 |
| `frontend/package.json` / lock | same | 2.112.4 |

Each lock also includes Supabase auth, functions, PostgREST, realtime, storage and phoenix packages. No Neon Auth, Neon serverless PostgreSQL, `pg`, or AWS S3 client package was found in these lockfile paths during inspection. Public documentation examples are not installed SDK qualification. Root packages matter: Vercel installs all three trees. Final exclusion checks must cover all three production dependency graphs and built/serverless artifacts.

## Runtime and operational surfaces

| Area | Files / behavior | R2 replacement |
|---|---|---|
| Infrastructure | `backend/src/supabase.service.ts`; `api/about/about.service.ts` independently calls `createClient` | DB repositories and provider adapters; no service-role bypass client |
| Auth | `api/auth/*`, `security/auth.guard.ts`, `authenticated-request.ts`, `permissions.ts` | Verified auth adapter + app staff policy; preserve immediate deactivation/revocation semantics |
| Content/search | `api/content/content.service.ts`, `api/search/search.service.ts` (`search_content`) | Parameterized SQL behind public-content repository; preserve published/nondeleted filters |
| Users/reports | `api/admin/users.service.ts` (`admin_mutate_user`), reports (`admin_report`) | Admin/editor account control only; defer workflow reporting |
| Deferred server paths | forms, notifications, `claim_form_email` / `finish_form_email` | Disable and exclude from runtime |
| Audit/health | `security/audit.middleware.ts`, `api/health/health.controller.ts` | PostgreSQL audit transactions and bounded readiness query |
| Browser auth | `lib/supabase.ts`, `lib/authSession.ts`, `contexts/SupabaseAuthContext.tsx`, login/callback/guards and consumers | Provider-neutral session context; tested cookie/session bridge |
| Browser public queries | services for news/events/tourism/downloadables/navigation/maps; `Navbar.tsx`, `Events.tsx`, downloads/ordinances/resolutions/budget/chart pages | Retained backend public API only |
| Browser privileged queries | `services/cmsService.ts`, profile/dashboard/certificate/notification services, `GadEntryModule.tsx`, `MeetingAssistant.tsx` | Narrow CMS APIs or deferred exclusion; never trust client audit inserts |
| Storage | `FileUpload.tsx`; legacy `pages/AdminDashboard.tsx` list/delete/public URL generation | Private object adapter plus authoritative media metadata and validation |
| Configuration | three `.env.example` files, frontend env validation, backend env validation, CSP middleware, `configure-app.ts`, generated OpenAPI | Stage-specific config; remove Supabase keys and CSP origins only when consumers are migrated |
| Deployment | `vercel.json`, `api/index.js`, serverless build and all package locks | Artifact inspection, explicit Neon secrets and no Supabase runtime closure |
| CI/operations | `.github/workflows/frontend-ci.yml`, `database-backup.yml`, `production-release.yml`; `ops/check-migration-history.mjs`, verify SQL | Replace Supabase CLI/history/auth-schema assumptions; retain manual approval and official-data gate |
| Off-server jobs | `supabase/functions/send-status-email/index.ts`, worker script | Exclude and inventory hosted executions before cutover |
| Tests | backend SDK stubs/auth/RLS tests; browser mocks; frontend environment tests | Keep legacy tests labeled as such; add provider-independent and live target contracts |

76 files in the scan contain a case-insensitive Supabase reference. Presence is not proof of reachability: `AdminDashboard.tsx` is a notable legacy candidate. Conversely, generic `.from()` calls, database URLs, media embedded in rows and hosted jobs can escape a name search. Inventory both imports and content references before removal.

## Storage evidence

Canonical SQL creates `public-cms`, `public-documents`, `citizen-vault`; final hardening policies also recognize `documents`, `media`, `avatars`, `certificates`. Source policies are not proof those extra buckets exist. Public reads cover public media/document/avatar buckets; citizen files are owner/staff scoped. Final hardening overrides earlier permissive policies in the same baseline; evaluate the entire migration chain.

The upload component defaults to `public-cms`, sets browser-provided content type, generates a timestamp/name key and returns `getPublicUrl`. It has development mock fallbacks guarded by `isMockAllowed`; do not count those as successful storage verification. No complete server-side photo/document signature validation pipeline was established by this inspection.

Reference fields include `news.image_url/file_url`, `downloadables.file_url`, tourism image arrays, officials' images, event banners, ordinance/resolution files, nested `downloadable_forms`, citizen attachments, and any URLs in rich content/JSON. Some source links use `http://talibon.gov.ph/wp-content/...`; they need source/transport review, not a mechanical provider hostname replacement.

Required live manifest: source project/bucket/key, visibility/policy, bytes, content type, SHA-256, owning row/field, approval and retention classification, target bucket/key, verification result. Do not include credentials, signed URLs or citizen file contents in Git. Counts, object bytes, deployed policies, auth users and active schedules remain **pending credentials**.

## Historical exclusions and final checks

`supabase/legacy-migrations/`, `DATABASE/*.sql`, `FIREBASE/*`, previous documentation and Git history are historical inputs, never an R2 production bootstrap. The current canonical `supabase/migrations/` is still used by R1 tests/ops and is **not yet retired**. `BACKUPENVSUPA.txt` is a sensitive filename candidate: inventory its tracking/exclusion and privately scan for credentials before release; do not paste its contents into reports.

Increment 5 must check production npm trees, literal imports, transitive imports, bundles, serverless traces, environment requirements, CSP/health/CI dependencies, storage/content URLs and browser network traffic. No Supabase service-role/anon key, connection, auth validation, active URL or browser query may remain. Explicit allowlists cover only archived/nonexecuted artifacts. Remove legacy runtime files from compiler/build inclusion; a dead UI route alone is insufficient.
