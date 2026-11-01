# Increment 1 delivery report

Evidence date: **2026-11-01, Asia/Shanghai**. **Application scope reduction implemented and locally verified. NOT PRODUCTION-QUALIFIED.** Hosted direct-provider restrictions and worker shutdown remain unverified. Increment 2 has not started.

## Preservation, branch and commits

- Working directory: `C:/Users/admin/Documents/TalGov-R2-Increment-0`.
- Branch: `feat/talgov-r2-increment-1`.
- R1 baseline: `fd2fe689b2f442f22409ca9c7a2699e3cd0c25be`.
- Increment 0 preservation commit: `cf3cd57fab1a90694d91d5f78d1e2ef62b750e94` on `docs/talgov-r2-increment-0`.
- Verified implementation commit: **`eee418dbb180aebd3766726e4ba65632c21b8c2b`**. All runtime, test, contract and shutdown-procedure changes are in this commit. The following evidence/report commit changes documentation only; obtain its SHA with `git log -1 --format=%H -- docs/r2/INCREMENT_1_REPORT.md`.

The starting worktree contained exactly the six modified documentation/example-environment files and the untracked `docs/r2/` handoff described in Increment 0. Their diff and file inventory were reviewed, then preserved in their own commit before branching or changing runtime code. The original R1 worktree remains clean and unchanged. No reset, stash, history rewrite, push, merge, deployment, production data operation, production migration or Neon migration occurred. No real environment files or credentials were copied.

## Delivered behavior

The E-services page displays the four approved text blocks, with one H1 and responsive spacing. Navigation remains available without an account. `/e-services/*`, every direct `/forms/*` path, and every `/payment/*` return render that same information page. Query parameters cannot select a wizard, show application status, confirm payment or generate a receipt. Homepage transaction prompts, signup controls, notification subscriptions, the chatbot, broad content editor tabs, and GAD profiling/portal actions are removed from the routed experience.

The backend returns **410 Gone** with the documented non-sensitive error envelope before body parsing, authentication, audit writes or workflow providers. Forms, payments, notifications and chat providers are unbound from `AppModule`. The standalone email worker exits 1 immediately, including `--watch`; the edge function source returns 410 without initializing providers. Existing deployed copies and schedules were not changed.

Public content/search, staff login/recovery/logout, user administration and security activity reporting remain. `/services` and `/services/:slug` were inspected and are already informational; retaining them preserves existing office guidance. The four public form-metadata GET/HEAD endpoints remain under their original URLs and have `/api/public-forms/*` aliases, owned by a separate controller with no writable forms service. Existing `#` download metadata is preserved, not certified as an approved downloadable form. These are documented refinements to Increment 0's tentative route plan.

The complete affected endpoint list, method/version/encoding contract, public-read exceptions, job inventory, direct-provider bypasses and release procedure are in [DEFERRED_WORKFLOW_SHUTDOWN.md](DEFERRED_WORKFLOW_SHUTDOWN.md). OpenAPI, local contract mocks, smoke probes and R1 regression expectations now describe retirement. No runtime dependency was added or upgraded; all three manifests/locks and canonical migrations remain unchanged.

## Exact validation results

Local Windows environment, Node 22.16.0, npm 10.9.2, local Edge/Playwright. Synthetic loopback provider configuration only; external browser requests are intercepted or blocked. These results apply to implementation commit `eee418dbb180aebd3766726e4ba65632c21b8c2b`, whose source matches the tested worktree. Documentation-only changes follow it.

| Command | Result | Evidence |
|---|---|---|
| `npm run build --prefix backend` | Exit 0 | [log](evidence/increment-1/backend-build.txt) |
| `npm run build --prefix frontend` with test configuration | Exit 0; 2,796 modules; JS 1,535.18 kB / gzip 438.39 kB; large-chunk warning remains | [log](evidence/increment-1/frontend-build.txt) |
| `npm run lint --prefix backend` | Exit 0; ESLint and TypeScript | [log](evidence/increment-1/backend-lint.txt) |
| `npm run lint --prefix frontend` | Exit 0; TypeScript | [log](evidence/increment-1/frontend-lint.txt) |
| `npm test --prefix backend` | Exit 0; Jest **54/54**, **5/5 suites**; Node **92 total: 88 passed, 0 failed, 4 TODO**, no skips/cancellations | [log](evidence/increment-1/backend-test.txt) |
| `node --test --test-timeout=20000 backend/test/r2-disabled-routes.test.cjs` | Exit 0; **28/28** (also included in the 88 Node passes above; do not double-count) | [log](evidence/increment-1/r2-http.txt) |
| `npm test --prefix frontend` | Exit 0; **21/21** | [log](evidence/increment-1/frontend-test.txt) |
| `npm run test:react --prefix frontend` | Exit 0; **52/52**, **2/2 files** | [log](evidence/increment-1/frontend-react.txt) |
| `npm run test:browser --prefix frontend` | Exit 0; **26/26** (21 retained public/auth/map regressions + 5 R2 scope tests) | [log](evidence/increment-1/browser-public.txt) |
| `npm run test:eservices --prefix frontend` | Exit 0; **22/22**, no skips; legacy payment feature flag set true by this configuration | [log](evidence/increment-1/browser-eservices.txt) |
| `npm run test:admin --prefix frontend` | Exit 0; **12/12** | [log](evidence/increment-1/browser-admin.txt) |
| `npm run test:contracts:browser --prefix frontend` | Exit 0; **10/10** | [log](evidence/increment-1/browser-contracts.txt) |
| `npm run test:ops` | Exit 0; **8/8**, including production gates | [log](evidence/increment-1/ops-test.txt) |
| `npm run contracts:export --prefix backend`, `npm run contracts:check --prefix backend` | Both exit 0; current 410 contracts and snapshot agree | [export](evidence/increment-1/contracts-export.txt), [check](evidence/increment-1/contracts-check.txt) |
| `git diff --check` and staged diff check | Exit 0 after whitespace cleanup | [preservation/documentation checks](evidence/increment-1/preservation-checks.json) |

Frontend build configuration: `VITE_SUPABASE_URL=http://127.0.0.1:54321`, `VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_browser_test_only`, `VITE_ENABLE_MOCK_DATA=false`. It verifies compilation, not a live provider or approved production configuration. Logs retain command output; Windows UTF-16 redirection, line endings and trailing whitespace were normalized to UTF-8 text for review. PowerShell's captured native-stderr formatting and Vite/color warnings are not command failures. [Machine-readable outcomes](evidence/increment-1/checks.json).

Browser total: **70 passed, 0 failed, 0 skipped**. [Mobile screenshot](evidence/increment-1/placeholder-mobile.png) and [desktop screenshot](evidence/increment-1/placeholder-desktop.png) were visually reviewed. External seals/assets are deliberately blocked by the browser fixtures; these screenshots do not certify live asset loading or existing municipal claims. Automated viewport/focus coverage is not a real-device accessibility sign-off.

## Fail-closed evidence and regression preservation

The new HTTP suite boots the actual `AppModule` and production `configureApp`, not only a detached controller or middleware function. It exercises 21 retired paths with GET, HEAD, POST, PUT, PATCH, DELETE and OPTIONS; body-bearing requests contain malformed JSON. It also checks role claims from anonymous/citizen/editor/admin and legacy privileged/inactive/unknown categories, version headers, enable flags, oversized bodies, case/slash/query/encoding variants, content mutation routes, absence of workflow providers, retained public reads, staff authorization routing and OpenAPI retirement. Provider acquisition tripwires remain at zero during disabled requests: no database/audit write, invoice provider or queue service can run. Role claims are intentionally never verified because retirement precedes authentication.

The actual serverless entry test still checks concurrent boot, public profile reads, security headers, DTO overposting, malformed bodies and body-size rejection on retained login; it now expects 410 for retired certificate access. Worker tests launch the compiled CLI with `--watch` and verify immediate nonzero termination. Edge handler tests execute the provider-free response function and inspect the source; a hosted Deno deployment was not tested.

Historical form/auth/chat/content/report controller tests still execute through an explicitly **test-only** harness which omits retirement while mounting isolated controllers. This retains R1 ownership, RBAC, DTO, rate-limit and sanitized-provider-failure coverage for preserved source. It is not evidence of production exposure. Production-app tests never import that harness. Browser tests replace active workflow expectations with denial/no-request assertions for the same service types, direct URLs, tracking and payment-return cases. Retained auth, public information, pagination/search, account controls and report security tests continue to run. Four payment webhook/settlement TODOs remain explicit future blockers, not passes.

## Pre-existing checkout failure, separately accounted for

Increment 0 recorded one failing Node test: `/api/payments/create-checkout-session` returned 503, but the test expected the word `unavailable`; R1's global filter correctly replaced the 5xx body with a generic message. There was no evidence of successful checkout. The original failing output remains unchanged in [Increment 0 backend evidence](evidence/backend-test.txt).

Increment 1 deliberately changes the endpoint to unconditional 410 before parsing or provider access. Its tests now assert 410 and the approved message, including invalid/overposted amounts, malicious return URLs and preserved security headers. **`AllExceptionsFilter` and authorization hardening were not weakened.** Final suites have no new failing tests. During implementation, stale R1 smoke/deployment/mock expectations, a test-harness interception issue, a static-check substring match, and browser fixture/encoding mistakes were corrected; final evidence above supersedes those development runs.

## Dependency audits and unresolved findings

`npm audit --package-lock-only --audit-level=high --json` ran at root, backend and frontend. Each exited **1**; no automatic audit fix or lockfile edit was performed.

| Tree | Critical | High | Moderate | Low | Total | Evidence |
|---|---:|---:|---:|---:|---:|---|
| Root | 1 | 7 | 2 | 0 | 10 | [JSON](evidence/increment-1/audit-root.json) |
| Backend | 1 | 7 | 30 | 3 | 41 | [JSON](evidence/increment-1/audit-backend.json) |
| Frontend | 0 | 4 | 0 | 0 | 4 | [JSON](evidence/increment-1/audit-frontend.json) |

Counts match Increment 0, include development dependencies and overlap across trees; they are not additive unique vulnerabilities. The critical `proxy-addr` findings remain. Review/remediation and repeat qualification remain necessary.

Other release blockers remain: actual hosted grants/RPCs/storage/public registration and deployed jobs are unverified; the deny-policy candidate was prepared but not executed or rehearsed; retained runtime still uses Supabase; Neon auth/session/MFA and storage capability gates remain; official-content/DPO/operational sign-offs, secret-history review, distributed rate limiting, live staging, backup/restore and rollback qualification remain open. Existing hardcoded/source-held civic information and download placeholders have not been newly verified. No database integration runner, live provider test, load test or hosted release smoke ran in this increment.

## Changed files and qualification

[Exact changed-file manifest](evidence/increment-1/changed-files.txt) lists all **74** implementation and report/evidence files relative to preserved Increment 0. Runtime commit contains **44 files**: backend retirement/public metadata/worker boundaries, HTTP tests and historical harness; frontend routing, placeholder and workflow entry removal; browser/mock regressions; OpenAPI; smoke/production gates; edge tombstone; example-environment comments; and the shutdown procedure/SQL review candidate. The documentation commit adds this report, acceptance/register/architecture/security/scope/README updates and raw evidence. Original Increment 0 report/evidence, package/lock files, R1 guards/filter/official-data gate and canonical migrations remain unchanged.

**Increment 1 application delivery is complete and locally verified. Production qualification is blocked.** WP1's hosted/source-side closure exit remains pending the separately approved procedure and evidence described in the shutdown contract. No claim is made that existing production deployments or direct provider endpoints have been shut down. Do not begin Increment 2, push, merge, deploy or run migrations automatically.
