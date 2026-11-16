# TalGov R2 GitHub integration — 16 November 2026

This review stack completes publication of the verified local R2 work. It does not qualify or deploy official production. Every new branch is based on the predecessor below; the first starts at `origin/main` commit `7c6f6d2787c89d3208afbb65e38e66425fb9aeb6`.

## Existing merged work

Main already contains the Neon PostgreSQL migration, upstream Better Auth staff bridge, MFA/RBAC, private Neon media storage, public publication APIs and retired e-service boundary through PRs #103–#109. PR #110 merged the approved staff login on 15 November. These changes are inherited, rather than replayed from older local branches. The login stylesheet and official seal from #110 remain unchanged; login changes add explicit password-recovery policy.

## Review and merge order

| Order | Branch | Scope | Scope head |
| --- | --- | --- | --- |
| 1 | `feat/r2-neon-foundation-20261116` | Bounded runtime-role diagnostics, TLS/channel-binding failures and transaction outcomes; nine existing privilege predicates remain enforced | `edeb2b84071209acdbad201007466d9fd3ecd047` |
| 2 | `feat/r2-staff-auth-security-20261116` | Native ESM provider loading, safe transaction leases, exact staging origins, opt-in recovery, bounded audit/throttle diagnostics and guarded operator bootstrap | `73530bd32c7976d7b2e639bddd1822abe37ba554` |
| 3 | `feat/r2-media-cms-api-20261116` | Photo/document authoring only, same-origin media mutations, text-authoring 410 responses and synchronized OpenAPI/mock contracts | `0829aa523d006bd9d08c869ec828331e3e359a65` |
| 4 | `feat/r2-professional-cms-dashboard-20261116` | Dashboard overview, distinct photo/document workspaces, admin-only staff/audit navigation, MFA confirmation, responsive sidebar and lazy public routes | `101bd85e66091f722cea2e8e16a97149189b7a57` |
| 5 | `ci/r2-release-verification-20261116` | Required browser inventory, production-chunk regression tests, portable measurements, CI, deployment configuration and this handoff | Final head and PR URLs are recorded in the GitHub PR descriptions and publication report |

Merge in this order. Retarget the next PR to main after its predecessor is merged. Prefer merge commits to preserve the stack's ancestry. Do not merge or deploy any branch automatically. The complete regression evidence applies to the final integrated tree; each of the first four layers also passed an isolated backend build and frontend typecheck.

## Preservation and provenance

A new worktree, `TalGov-R2-GitHub-final-20261116`, was created for this completion. The earlier integration worktree, Phase 4, release-hardening, performance, migration, login and other existing worktrees were used read-only. A preservation snapshot checked all 18 pre-existing worktrees, their branches/HEADs/status and 14,196 tracked or untracked source files. Verification found zero mismatches. Generated dependencies, caches and verification outputs are excluded from the source manifest.

The starting input is the already-reconciled unfinished integration worktree. Its importer verified the 295-file staging candidate with source fingerprint `240eb708701975a0983c16bdbd92f5c80820bcd8167f1831508c79d7f3d2743c` and incorporated the Phase 4 and release-hardening fixes. The final tree preserves that candidate's application source except the `/login` layout alias correction needed to retain PR #110's isolated login. The other candidate differences are browser-runner package scripts, local-output ignore rules and a stylesheet line-ending difference. Supplemental tests, CI, diagnostics and runbooks are included separately in the stack.

Older R1 branches, local experiments and alternative implementations remain available locally. They were not overlaid onto R2. Local environment files, generated credentials, raw evidence, browser output and the temporary no-database verification preload are excluded. Dated receipt-reconstruction helpers (`qualify-builds`, `qualify-frontend`, `qualify-summary` and the phase-3 Playwright config) remain in their original worktrees because they require unpublished historical receipt files. Reusable measurements and production-build tests are included.

## Final regression evidence

All application HTTP/browser tests use local fixtures. Database checks use disposable local PostgreSQL clusters; no hosted database, auth, mail or storage mutation was performed.

| Gate | Command / scope | Result |
| --- | --- | --- |
| Backend build and lint | `npm --prefix backend run build`; `npm --prefix backend run lint` | PASS |
| Backend suite | `npm --prefix backend test`, with an external preload blocking real database connections | 4 Jest and 252 Node tests PASS; zero skips |
| Frontend build and lint | `npm --prefix frontend run build`; `npm --prefix frontend run lint` | PASS |
| Frontend Node / React coverage | `npm --prefix frontend test`; `npm --prefix frontend run test:coverage` | 17 Node and 121 React tests PASS |
| OpenAPI | `node scripts/export-openapi.cjs --check` from backend | PASS |
| Ops / runtime exclusion | `node --test ops/test/*.test.mjs` | 17 PASS, including Supabase runtime exclusion and retired-service boundary |
| General browser | `npm --prefix frontend run test:browser` | 155 PASS; zero skips |
| Admin browser | `npm --prefix frontend run test:admin` | 10 PASS; zero skips |
| Staff/recovery browser | `npm --prefix frontend run test:login` | 21 PASS; zero skips |
| Public contracts browser | `npm --prefix frontend run test:contracts:browser` | 10 PASS; zero skips |
| Retired e-services browser | `npm --prefix frontend run test:eservices` | 23 PASS; zero skips |
| Production-built browser | `playwright.performance.config.ts`, mandatory strict reporter | 22 PASS; zero skips |
| Disposable PostgreSQL | staging 60, content 21, media 11, recovery-off 11, recovery-on 11, bootstrap 6 | 120 PASS; two conditional skips for the opposite recovery policy |
| Dependency audits | `npm audit` and `npm audit --omit=dev` at root/backend/frontend | Production-only: zero advisories in all three. Full root/frontend: zero. Full backend: 23 moderate, 3 low development-tooling advisories; zero high/critical |
| Publication hygiene | `git diff --check`; redacted Gitleaks scan of integration changes | PASS; zero new secrets |

The first concurrent historical gate exposed timing failures. The final serial browser gates passed. The long React keyboard scenario hit its default five-second timeout; its unchanged interaction assertions passed after a bounded 15-second timeout was set. Production tests were reconciled with the approved login and dashboard instead of preserving obsolete footer/workspace expectations. No assertion was skipped or marked as an expected failure.

## Operational limitations and risks

- Backend development-tooling advisories require a focused follow-up by the backend/CI maintainer. Do not apply the audit tool's suggested major downgrades blindly. Production dependency audits are clear.
- Hosted runtime-role acceptance, protected-browser CMS acceptance, recovery-mail provider qualification, restore/monitoring ownership and official data approval remain separate staging/production gates. No hosted success is inferred from local fixtures or deployment metadata.
- First-admin bootstrap is already consumed on the existing isolated staging database. The operator tools are not HTTP routes; do not rerun them against that database or remove the marker. See [operator runbook](FIRST_ADMIN_OPERATOR_RUNBOOK.md) and [acceptance boundaries](STAGING_ORIGIN_AND_ACCEPTANCE.md).
- Recovery is disabled by default while TOTP and backup-code authentication remain available. Enabling email recovery requires approved provider configuration and explicit backend/frontend flags.
- Text-content authoring now returns 410 before provider/database work. Existing approved informational reads remain available. Retired applications, status tracking and payments stay closed server-side.
- No schema migration is introduced by this stack. Runtime-role diagnostics preserve existing checks, and rollback must preserve staff bootstrap markers, audit history and private objects. Vercel Git deployment remains disabled; the production release workflow remains manually dispatched and qualification-gated.

Publication stops after creating the five PRs. GitHub checks/reviews are recorded as pending until GitHub evaluates them; local PASS results do not substitute for GitHub approval.
