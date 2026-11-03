# R2 Increment 3 — Staff authentication

Evidence date: **2026-11-03**. Branch `feat/talgov-r2-increment-3`; starting HEAD `2e3d038c0879a6a508561b1e9dfedaa28cac9a87` (Increment 2.1 remains an ancestor). This increment is implementation and development-branch qualification only. No production migration, push, merge, or deployment was performed.

## Scope and implementation

Increment 3 replaces staff login and administration with Better Auth **1.7.15** and app-owned PostgreSQL tables. Better Auth is not Neon Managed Auth. Public registration, citizen login, social login, and account deletion are disabled; the only eligible identities are pre-provisioned active `admin` or `editor` staff accounts. The retired Supabase authentication and legacy staff-admin/report API routes fail closed; deferred legacy routes return 410.

Staff access requires a verified email, an active supported staff role, an unexpired Better Auth session, enabled MFA, and recorded MFA assurance. Sessions expire after eight hours and do not refresh. Cookies are HttpOnly, SameSite Strict, Secure for non-test deployments, and unavailable to browser JavaScript. Mutations require same-origin JSON; administrative changes require a fresh MFA step-up, use account versions, protect the last active administrator, revoke affected sessions, and write transactional audit events. TOTP replay is denied atomically; backup codes are single-use; password recovery is non-enumerating, expires after 15 minutes, invalidates sessions, and carries its reset token in the URL fragment rather than the query string. Authentication audit records are immutable. Idle database-pool errors are surfaced using sanitized error codes rather than being silently discarded.

The staff portal provides sign-in, MFA enrollment/challenge, recovery, bounded staff and audit listings, and admin-only account activation, role changes, and session revocation. The API contract documents the production `__Secure-talgov-staff.session_token` cookie. Recovery tokens and session tokens are not returned in API response bodies or logged.

## Files changed

- **Backend:** `package.json`, `package-lock.json`; `src/app.module.ts`, `src/configure-app.ts`, `src/security/deferred-routes.middleware.ts`; new `src/authentication/{authentication.adapter.ts,better-auth.adapter.ts,runtime.ts,staff.guard.ts}` and `database/auth/{001_provider.sql,002_staff_policy.sql}`; new `scripts/r2-auth-neon-qualify.cjs`; new auth database runner and integration/guard tests; updated admin, deployment, foundation, retired-route, and signup tests.
- **Frontend:** `src/App.tsx`, `src/components/Navbar.tsx`; new staff auth context, login, and portal; updated admin/foundation browser tests and contract mock.
- **Contracts and docs:** `contracts/openapi.json`; updated R2 auth/storage, deferred-workflow, security-model, Supabase-inventory, and work-package docs; this report and Increment 3 evidence directory.

## Verification

All commands below ran on the Increment 3 branch. Exit 0 means the command passed.

| Command | Result |
|---|---|
| `npm --prefix backend run lint` | Exit 0; ESLint and TypeScript checks passed. |
| `npm --prefix backend test` | Exit 0; Jest **54/54**, 5 suites; Node **97 total, 93 passed, 4 TODO, 0 failed or skipped**. |
| `npm --prefix backend run contracts:export` | Exit 0; regenerated the OpenAPI snapshot, including the production Secure cookie name. |
| `npm --prefix backend run contracts:check` | Exit 0; generated contract matches the snapshot. |
| `npm --prefix backend run test:auth:db` | Exit 0; **8/8** integration tests on disposable local PostgreSQL; server and synthetic files cleaned up. |
| `npm --prefix backend run test:r2:db` | Exit 0; **12/12** R2 database tests; logical backup/restore verified **9 tables / 21 rows** with exact digests, checksums, grants, and constraints. |
| `npm --prefix backend run test:auth:neon` | Exit 0; **8/8** real Better Auth HTTP integration tests against the isolated Neon development branch, using direct migration and pooled least-privilege runtime connections with required TLS/channel binding. Synthetic database and temporary role membership were removed; no email was sent. |
| `npm --prefix frontend run lint` | Exit 0; TypeScript check passed. |
| `npm --prefix frontend run build` | Exit 0; production build succeeded. Vite reported a large-chunk warning (>500 kB). |
| `npm --prefix frontend test` | Exit 0; **21/21** Node tests. |
| `npm --prefix frontend run test:react` | Exit 0; **52/52** React tests. |
| `npm --prefix frontend run test:browser` | Exit 0; **23/23** public/staff browser tests. |
| `npm --prefix frontend run test:admin` | Exit 0; **5/5** staff administration browser tests. |
| `git diff --check` | Exit 0; no whitespace errors. |

Auth integration coverage includes closed registration and provider endpoints, origin/content-type enforcement, password sign-in, MFA enrollment and enforcement, expired/forged/revoked sessions, concurrent sessions, TOTP replay, backup-code single use, password recovery and session invalidation, account deactivation, role escalation denial, admin/editor access boundaries, pagination/version conflicts, audit immutability, and fresh-MFA step-up. The browser test web server logged connection refusals for API proxy requests without a live backend; all browser assertions passed.

## Dependency audit and remaining blockers

The following exact production-dependency audit commands returned exit 1 because advisories remain:

- `npm audit --omit=dev --audit-level=moderate`: **10 vulnerabilities** (1 critical, 7 high, 2 moderate).
- `npm --prefix backend audit --omit=dev --audit-level=moderate`: **9 vulnerabilities** (1 critical, 5 high, 3 moderate).
- `npm --prefix frontend audit --omit=dev --audit-level=moderate`: **2 high**.

Findings include critical `proxy-addr` IP-spoofing exposure and advisories in `axios`, `body-parser`, `follow-redirects`, `multer`, `qs`, `source-map-js`, `vite`/`esbuild`, and `js-yaml`. They were not auto-fixed: dependency-wide upgrades are outside this authentication increment and may include breaking changes. Resolve and requalify them before production release. The frontend bundle-size warning also remains.

No production database change or production readiness claim is made. Apply the reviewed auth schema and perform operational/mail-delivery, recovery, and deployment-secret configuration only through a separately approved production release. Increment 4 was not started.
