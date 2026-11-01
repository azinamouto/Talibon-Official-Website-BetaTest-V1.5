# R2 work packages and file-level implementation plan

Status at Increment 0: discovery documents implemented; runtime packages below are planned, blocked or pending inputs. Filenames marked **new** are proposals, not existing implementations. No later increment is authorized to bypass provider or release gates.

## Increment 1 status (2026-11-01)

| Package | Current status and evidence |
|---|---|
| WP0 | Completed discovery preserved without alteration in commit `cf3cd57fab1a90694d91d5f78d1e2ef62b750e94`, based on R1 `fd2fe689b2f442f22409ca9c7a2699e3cd0c25be` |
| WP1 | Application scope reduction implemented and locally tested. Exact HTTP/job inventory, compatibility decisions and hosted shutdown procedure: [shutdown contract](DEFERRED_WORKFLOW_SHUTDOWN.md). Validation and qualification: [Increment 1 report](INCREMENT_1_REPORT.md) |
| WP1 hosted exit | Pending credentials, clone rehearsal and operator evidence: direct provider grants/RPC/storage/signup restrictions and deployed worker/scheduler shutdown. Prepared deny candidate is outside automatic migrations and has not run. This exit is **not** certified by local tests |
| WP2?WP6 | Not started by Increment 1; existing provider, municipal and release gates remain |

Implementation refinements: `/services` and `/services/:slug` already provide read-only guidance and remain available. Legacy public forms GET/HEAD endpoints use a separate read-only controller with `/api/public-forms/*` aliases; they are not retired with citizen transactions. Shared staff account administration and security activity reports remain. Non-media mutation methods, workflow reports and public assistant entry points close. Historical implementations and R1 safety tests are preserved; current production-app tests establish retirement independently of the test-only historical controller harness.

The original file-level plan below remains a design record. No canonical SQL migration, Neon adapter, dependency upgrade, production action or Increment 2 work was performed.

## WP0 — Discovery (this increment)

Deliver the ten R2 design documents, baseline/source inventory, provider checks, risk register and execution report. Add discovery notices to README, agent guidance and example environments. Preserve R1 and all canonical SQL. Exit: every discovered dependency has a disposition, unresolved provider/account facts have explicit blockers, and evidence distinguishes baseline tests from R2 qualification.

## WP1 — Scope reduction

Prerequisites: review this scope and retain R1 baseline failure evidence. Can proceed independently of Neon credentials.

| File(s) | Concrete change |
|---|---|
| `frontend/src/pages/EServicesPage.tsx` | Replace directory/wizard/tracking with exact approved placeholder copy |
| `frontend/src/App.tsx` | Route `/forms/*`, transactional directory and payment-return paths to informational behavior; preserve other public routes |
| `frontend/src/components/Navbar.tsx`, `QuickAccess.tsx`, `Services.tsx`, `PopularServices.tsx`, `EServices.tsx`, `ServiceNavigator.tsx` | Keep E-services nav; remove application/payment entry actions; inspect data-driven links too |
| `frontend/src/pages/PaymentReturn.tsx`, `PaymentSuccess.tsx`, `PaymentCancel.tsx`, `components/PaymentButton.tsx`, `components/eservices/SubmissionPaymentStep.tsx` | No payment/status request or implied confirmation; no flag bypass |
| `frontend/src/pages/Login.tsx`, `contexts/SupabaseAuthContext.tsx`, notification UI | Remove citizen signup/workflow entry; preserve working staff login |
| **new** `backend/src/security/deferred-routes.middleware.ts`; `backend/src/configure-app.ts` | Deterministic sanitized 410 before parsing/auth/provider work; all retired aliases/methods/version variants |
| `backend/src/app.module.ts`, `api/forms/*`, `api/payments/*`, `api/notifications/*`, `api/auth/auth.controller.ts` | Unbind deferred services, reject signup; rehome public downloads before closing forms namespace |
| `backend/package.json`, `supabase/functions/send-status-email/index.ts`, deployment/job inventory | Remove worker/edge execution from R2; prepare reviewed stop procedure for hosted jobs |
| `backend/src/api/content/{pages,news,services}.controller.ts`, frontend admin tabs | Disable non-media mutations, preserve approved public reads |
| `backend/src/api/chat/*`, frontend assistants | Exclude external model/citizen assistance workflow from reduced scope |
| **new** reviewed source-side migration under existing SQL chain | Revoke deferred table/RPC/storage mutation paths without dropping data; run only in later approved rehearsal/cutover |
| `contracts/openapi.json`, `ops/smoke.mjs`, existing forms/payment/frontend tests | Update expected retired contracts; do not weaken sanitization just to satisfy R1 message test |
| **new** `backend/test/r2-disabled-routes.test.cjs`, `frontend/test/browser/r2-scope.spec.ts` | Assert no provider calls/database writes for every role/flag; deep-link, keyboard/mobile and public-site regressions |

Exit: closed server routes and source-side bypasses, stopped jobs, correct placeholder, public reads preserved, no new official content. Test all anonymous, citizen, editor/admin and legacy privileged roles. Existing R1 backend failure must be resolved by the intentional new contract, with before/after evidence.

## WP2 — Database foundation and retained reads

Prerequisites: source inventory/reconciliation and schema review; credentials needed only for hosted qualification, not unit design.

- **New** `backend/src/persistence/database.module.ts`, `postgres.database.ts`, `query-executor.ts`; repository interfaces under `persistence/contracts/`, SQL implementations under `persistence/repositories/`.
- **New** `backend/db/migrations/0001_r2_foundation.sql` through `0005_public_search.sql`, `scripts/migrate-r2.mjs`, `scripts/import-r2.mjs`, `scripts/reconcile-r2.mjs`; sequence and safety in [migration plan](NEON_MIGRATION_PLAN.md).
- Refactor `api/about/about.service.ts`, `api/content/content.service.ts`, `api/search/search.service.ts`, `api/health/health.controller.ts`; adapt retained frontend public services and direct-query pages. Keep current DTO compatibility and approved source-held content.
- **New** `backend/test/r2-repositories.test.cjs`, `r2-migration.test.cjs`; test parameter binding, public filtering, constraint preservation, transaction rollback and restore on disposable PostgreSQL, then Neon.
- Update backend dependency/lock/environment validation for pooled runtime and direct migration URLs. No secret URL in frontend. Do not remove Supabase prematurely from still-dependent auth/storage paths.

Exit: reviewed migrations, public reads through backend, no fabricated seed rows, explicit deployed-schema comparison and reconciliation result. Hosted evidence remains blocked without isolated credentials.

## WP3 — Authentication (blocked)

Gate: verified provider MFA, closed registration and supported Nest session bridge. A generic Better Auth tutorial or compatible-looking SDK is insufficient.

- **New** `backend/src/authentication/authentication.adapter.ts`, `neon-auth.adapter.ts`, `staff-policy.service.ts` after gate clearance; bind through Nest module.
- Refactor `security/auth.guard.ts`, `permissions.ts`, `authenticated-request.ts`, `api/auth/*`, `api/admin/users.*`, auth-related audit paths.
- Replace `frontend/src/contexts/SupabaseAuthContext.tsx` and `lib/authSession.ts` with provider-neutral context/service; update login/callback/route guards/navbar and every consumer in inventory. Add secure recovery and MFA enrollment flow only after provider verification.
- **New** backend and browser auth contract tests: expiry, logout/all-session revocation, deactivation, recovery/reuse, admin/editor roles, forged claims, CSRF/origin, MFA and direct provider registration denial.

Exit: invitation/re-enrollment rehearsal with approved staff roster and recovery evidence; no unrestricted registration. Do not activate CMS or remove working R1 auth while this gate is blocked.

## WP4 — Storage and photo/document CMS (pending credentials; depends on WP3)

- **New** `backend/src/storage/object-store.ts`, `neon-object-store.ts`, `file-validation.service.ts`; `backend/src/api/media/{media.module,media.controller,media.service,media.dto}.ts`.
- Proposed HTTP: `POST /api/admin/media/uploads` (intent), `POST /api/admin/media/uploads/:id/complete`, `GET/PATCH/DELETE /api/admin/media/:id`, `POST /api/admin/media/:id/publication`, category management, and `GET /api/media/:id/download` (approved public or explicitly authenticated preview). Define exact DTO/status/idempotency contracts before implementation; no generic client-controlled object keys.
- Refine `frontend/src/pages/SprintAdminDashboard.tsx` into photos/documents plus necessary account controls; **new** `components/admin/AdminMedia.tsx`, `services/mediaService.ts`; adapt `FileUpload.tsx` to upload intent/finalization and real error recovery. Do not revive the entire legacy dashboard.
- **New** `backend/scripts/migrate-r2-objects.mjs`, `backend/test/r2-media.test.cjs`, storage adapter integration tests and `frontend/test/browser/r2-cms.spec.ts`.

Exit: MIME/extension/signature/size validation; unauthorized/private/draft access denial; correct publication/unpublication, admin-only deletion, failed-storage recovery, transactional audit, checksums and browser mobile/accessibility checks. No false upload success from mock URLs.

## WP5 — Supabase exclusion

Prerequisites: all retained consumers replaced; auth/storage gates passed. Remove SDK/runtime files from root/frontend/backend manifests, locks, TypeScript compilation and Vercel artifacts. Replace `lib/supabase.ts`, `backend/src/supabase.service.ts`, env validation, health/audit/CSP/OpenAPI and all inventory consumers. Defer/remove citizen integrations from execution; preserve Git history and explicitly archived SQL.

Update `.github/workflows/{backend,frontend-ci,production-release,database-backup,production-monitor}.yml`, `ops/check-migration-history.mjs`, `ops/verify-database.sql`, `ops/data-manifest.sql`, `ops/verify-official-data.sql` and smoke/monitor tests. Preserve manual approvals/official-data validation; replace Supabase CLI/auth/history assumptions with R2 ledger and restore tooling. Update current README/agent guidance/environment templates to implemented state.

**New** `ops/test/r2-no-supabase.test.mjs` checks all three production dependency trees, source imports, artifact traces, env/CSP and production workflow inputs with a narrow legacy allowlist. Browser tests assert no Supabase requests; reconciliation scans actual stored URLs and embedded content. Archive paths must be excluded from production builds, not merely renamed.

Exit: zero active Supabase dependencies, URLs, keys, connections and hosted integrations; evidence must include built artifacts and live staging traffic, not a grep-only claim.

## WP6 — Staging qualification (pending credentials and approval)

Use [acceptance matrix](PRODUCTION_ACCEPTANCE.md) and [recovery runbook](ROLLBACK_AND_RECOVERY.md). Add sanitized release evidence under `docs/r2/evidence/` for the exact candidate SHA/environment. Run builds/unit/API/browser/role/disabled-route/exclusion/DB/file/audit/security/accessibility/mobile/load checks, reconciliation and restoration. Verify Vercel function limits, budgets/alerts, rate limits and operational owners. Prepare reviewable release/rollback record; production deployment is a separate explicitly approved action.

## Next increment

Recommended next is **WP1 scope reduction**, after reviewing the deliberate 410 contract and approved public download routing. Work on provider capability resolution can continue without changing authentication. Production readiness remains blocked; no package status becomes Tested through design documentation alone.
