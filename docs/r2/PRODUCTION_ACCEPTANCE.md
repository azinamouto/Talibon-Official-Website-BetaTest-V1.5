# Increment 1 acceptance update ? 2026-11-01

**Application scope reduction implemented and locally verified. NOT PRODUCTION-QUALIFIED.** Implementation SHA: `eee418dbb180aebd3766726e4ba65632c21b8c2b`, branch `feat/talgov-r2-increment-1`. Increment 0 was preserved in `cf3cd57fab1a90694d91d5f78d1e2ef62b750e94`. No Neon migration, hosted shutdown, production data operation or deployment ran. Increment 2 has not started.

| Current gate | Increment 1 evidence / result |
|---|---|
| Frontend/backend builds and lint | Passed using local synthetic/loopback configuration; production configuration remains unqualified |
| Backend tests | Jest 54/54 in 5 suites; Node 88 passed, 0 failed, 4 TODO (92 total). No skipped/cancelled tests |
| Production application retirement | 28/28 HTTP/worker/edge checks, included in Node total; actual AppModule with provider tripwires, all-method closures, malformed/oversized inputs, role claims, flags, aliases and retained-read checks |
| Frontend unit/React | 21/21 Node tests; 52/52 React tests across 2 files |
| Browser regression | 26/26 public/auth/scope, 22/22 E-services, 12/12 admin, 10/10 contract-browser tests: 70 passed, none failed or skipped |
| Production gates / OpenAPI | Ops 8/8; OpenAPI export/check pass; R1 official-data and static security-header gates preserved |
| Checkout baseline failure | Resolved by intentional 410 retirement contract; 5xx sanitizer unchanged. Original failing Increment 0 log preserved |
| Preservation / diff validation | R1 worktree, Increment 0 report/evidence, canonical migrations, manifests/locks and security guard/filter/data gate unchanged; diff checks pass |
| Dependencies | Audits still fail: root 10 (1 critical, 7 high, 2 moderate); backend 41 (1 critical, 7 high, 30 moderate, 3 low); frontend 4 high. Counts unchanged; no automatic fixes |
| Hosted/source-side closure | **Pending credentials and release evidence**: existing deployed workers/edge schedules, direct provider tables/RPC/storage and hosted signup are not verified disabled. Deny candidate prepared outside automatic migrations; not run or rehearsed |
| Later R2 release gates | **Not satisfied**: zero Supabase, verified Neon auth/MFA/storage, migrations/reconciliation, media CMS, durable audit, staging/performance/restore and municipal/DPO/operator approvals remain later work |

See the [full Increment 1 report](INCREMENT_1_REPORT.md), [endpoint/job contract and shutdown procedure](DEFERRED_WORKFLOW_SHUTDOWN.md), [machine-readable outcomes](evidence/increment-1/checks.json), and [preservation checks](evidence/increment-1/preservation-checks.json). Exact raw logs, changed files, screenshots, unresolved findings and test-boundary limitations are linked there. Application tests do not prove hosted shutdown or authorize a production release.

The following Increment 0 evidence is preserved as the historical baseline. Its "not implemented" states describe Increment 0 and are superseded only by the specific local results above; its unresolved production gates remain applicable.

# Production acceptance and Increment 0 evidence

**NOT PRODUCTION-QUALIFIED.** Increment 0 is documentation and baseline discovery. R2 runtime, authentication, storage and migrations are not implemented. No data migration or deployment was performed. All future gates apply to the exact candidate SHA and target account, not to a simulated provider.

## Executed baseline checks

Environment: Windows, Node 22.16.0, npm 10.9.2, isolated worktree at R1 `fd2fe689b2f442f22409ca9c7a2699e3cd0c25be`. Evidence date is 2026-11-01 Asia/Shanghai; raw logs may contain UTC or execution-host timestamps. Frontend/backend `npm ci --no-audit --no-fund` succeeded using unchanged locks. Root dependencies were not installed. No real `.env` files or credentials were copied.

| Command | Exact outcome | Evidence |
|---|---|---|
| `npm run lint --prefix backend` | Exit 0; ESLint and TypeScript passed | [log](evidence/backend-lint.txt) |
| `npm test --prefix backend` | Exit 1; TypeScript build succeeded; Jest 5 suites / 54 tests passed; Node runner 64 total: 59 passed, 1 failed, 4 TODO | [log](evidence/backend-test.txt) |
| `npm run test:ops` | Exit 0; 7/7 passed | [log](evidence/ops-test.txt) |
| `npm run lint --prefix frontend` | Exit 0; TypeScript passed | [log](evidence/frontend-lint.txt) |
| `npm test --prefix frontend` | Exit 0; 21/21 passed | [log](evidence/frontend-test.txt) |
| `npm run test:react --prefix frontend` | Exit 0; 2 files / 52 tests passed | [log](evidence/frontend-react.txt) |
| `npm run build --prefix frontend` without config | Exit 1; existing validator correctly refused missing public Supabase settings | [log](evidence/frontend-build.txt) |
| Same build with loopback test config | Exit 0; 2817 modules; large-chunk warning (JS 1639.01 kB, gzip 463.85 kB) | [log](evidence/frontend-build-test-config.txt) |
| `npm run test:browser --prefix frontend` | Exit 0; 21 passed, local Edge/Vite with network fixtures | [log](evidence/frontend-browser.txt) |
| `npm run test:eservices --prefix frontend` | Exit 0; 13 passed, 4 skipped; skipped payment scenarios are not passes | [log](evidence/frontend-eservices.txt) |
| Documentation links, scope and migration checksum checks | 11 R2 Markdown files; 0 broken local links, 0 changed canonical migrations, 0 unexpected tracked changes; environment values unchanged | [results](evidence/documentation-checks.json) |

Test-build configuration is `VITE_SUPABASE_URL=http://127.0.0.1:54321`, synthetic `sb_publishable_browser_test_only` public key and mocks disabled. It verifies compilation, not a real provider connection, production environment or deployed behavior. Browser command outcomes are also in [machine-readable results](evidence/browser-checks.json). The application's mock-data flag is false, but tests intercept provider/API calls with fixtures; these are baseline browser regressions, not live E2E qualification. Separate admin and contract-browser configurations were not run.

The backend failure is `backend/test/payments-security.test.cjs:37`: expected response text matching `/unavailable/i`, but `AllExceptionsFilter` sanitizes every 5xx message to generic internal-server-error text. The endpoint still returned 503; this result is not evidence checkout succeeded. Resolve deliberately with Increment 1's documented disabled-route contract, not by exposing raw provider errors. Four Node TODO tests are not passes.

## Dependency audits

Executed `npm audit --package-lock-only --audit-level=high --json` at root and with `--prefix backend` / `--prefix frontend`; all exit 1. These include development dependencies. No `npm audit fix`, lockfile upgrade or forced remediation was performed.

| Tree | Critical | High | Moderate | Low | Total |
|---|---:|---:|---:|---:|---:|
| Root | 1 | 7 | 2 | 0 | 10 |
| Backend | 1 | 7 | 30 | 3 | 41 |
| Frontend | 0 | 4 | 0 | 0 | 4 |

The reported critical package is `proxy-addr` in root/backend. High findings include `axios`, `follow-redirects`, `source-map-js`, `vite` and backend/root Express-related dependencies. Use [audit JSON](evidence/dependency-audits.json) for advisory detail, affected paths and available fixes. Counts are per tree and overlap; do not sum them as unique vulnerabilities. Production exploitability and remediation compatibility need review, followed by full and production-only audits against the replacement dependency graph.

## R2 release gates

| Gate | Required evidence | Current R2 state |
|---|---|---|
| Frontend/backend build and lint | Clean exact-SHA builds with approved production config; package/runtime compatibility | Not yet verified; baseline build only |
| Unit/API integration | Retained behavior, validation/errors/headers, real HTTP role checks | Not yet verified; baseline failure open |
| Disabled endpoints | Every alias/method/version/role/flag; no DB/provider side effects; no external jobs | Not implemented |
| Browser E2E | Public navigation/search, exact placeholder, legacy deep links, auth recovery, media lifecycle | Not yet verified on R2 |
| RBAC/session security | Admin/editor allowlist, CSRF, escalation denial, revocation/deactivation, expiry, recovery, MFA | Blocked by provider gates |
| No Supabase | All production dependency graphs/artifacts/env/workflows plus browser traffic and stored URLs | Fails by design on current R1 baseline |
| Database migration | Fresh/upgrade/rollback/checksum tests; direct/pooled role verification | Not run in Increment 0; no migration permitted |
| Reconciliation | Approved row counts, hashes, nullability, FK checks, official-content comparisons | Pending source/target credentials and municipal approval |
| CMS file security | MIME/signature/extension/size, quarantine/overwrite, private access, publication/revocation, deletion failures | Not implemented; pending storage account validation |
| Audit integrity | Mutation rolls back when audit fails; protected retention/export and read permissions | Not yet verified for R2 |
| Dependency/secret security | Remediated high/critical advisories, production-tree audit, private credential scan/rotation proof | Baseline audit fails; secret-history review pending |
| Accessibility/mobile | Keyboard/focus, labels/announcements, contrast, automated checks, narrow viewport + real-device review | Not yet verified for R2 |
| Performance/monitoring | Cold/warm p95 budgets, image/download behavior, quotas, alert delivery/acknowledgment | Pending staging; baseline bundle warning |
| Staging smoke | Real Neon/Vercel configuration and content/auth/storage calls with approved test accounts | Pending credentials |
| DB/object restoration | Independent encrypted backup restore, complete reconciliation, measured approved RPO/RTO | Pending credentials and approval |
| Rollback | Exact-artifact compatibility, new-write reconciliation, auth/session handling rehearsal | Not yet verified |
| Production release | Municipal data/DPO sign-off, operator approval and postrelease smoke evidence | Pending approval; no deployment authorized |

## Unexecuted checks and limitations

No database runner, migration/import/reconciliation, live CMS upload/download, live Neon Auth, account recovery/MFA, hosted staging smoke, load test, secret rotation, backup/restore or rollback rehearsal ran. PostgreSQL tools were found locally, but their presence does not authorize migration during discovery. Browser network stubs and local unit mocks are never live-provider verification. Automated browser coverage alone does not certify accessibility or real mobile devices.

Read [R1 readiness register](../production/READINESS_REGISTER.md) together with this matrix. R1 municipal content, privacy, monitoring and operational sign-offs remain unresolved. Required approvals identify a later production decision; they do not prevent completing the current authorized discovery work.
