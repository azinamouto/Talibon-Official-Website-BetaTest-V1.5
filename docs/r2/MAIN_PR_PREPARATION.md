# R2 main PR preparation — 2026-11-10

Status: **local commits prepared; push and PR creation blocked by deployment safety**. No merge, deployment, production access, migration change or remote database/object write was performed.

## Proposed PR

Title: **Harden staging runtime, reduce transaction latency and decouple CMS source options**

Base: `azinamouto/Talibon-Official-Website-BetaTest-V1.5:main`.
Head: `feat/talgov-r2-staging-qualification` (not pushed by this task).
The existing `bc0a097` baseline is already included in main via merged PR #108; the new PR should contain only the follow-up commits below. Local branch configuration still names `origin`, while `canonical` explicitly identifies the target repository; verify push destination when the safety gate is resolved.

### Change

CMS source choices no longer initialize object storage, so missing S3 configuration does not block database-backed attribution selection. Staff authorization and file privacy checks remain enforced. Runtime connections reject ineffective role membership and database/relation ownership. Fixed transaction setup statements now use one exchange while preserving isolation, timeout values, rollback and no-retry behavior.

Staging qualification and benchmark tools preserve existing evidence and fail closed. The benchmark now validates the pinned staging endpoint/TLS/channel binding before bootstrap because even public requests write throttle/audit records. No benchmark was rerun remotely. Recovery documents retain pending owner decisions and distinguish operator-reported migration results from independently verified evidence.

### Commits

- `bad01ea`: runtime-role guard, local staging suites, rollback-only qualification and runtime handoff.
- `f5d73ac`: batched transaction setup, parameterized/rollback tests, guarded benchmark and sanitized before/after evidence.
- `12fc11e`: CMS/S3 decoupling, regression test and canonical reconciliation.
- `d6d3903`: recovery assumptions, evidence and outstanding acceptance decisions.

### Validation

- Current local run: backend TypeScript build and ESLint passed; Jest 3/3 and Node 80/80 passed, including the benchmark safety regression. OpenAPI check passed.
- Current local run: frontend TypeScript and Vite build passed; 1.31 MB bundle warning remains. Frontend Node suite: 11 passed, 1 failed at `frontend/test/contract-mock.test.cjs:39` (expects 410 for POST pages; mock returns 501 because staff writes are not mocked).
- Current local run: disposable PostgreSQL Better Auth/MFA suite 8/8 passed; ops 16/16 passed; runtime artifact exclusion passed for 409 files. Disposable server stopped, ignored fixture evidence retained.
- Same-session reconciliation evidence: local content HTTP/SQL suite 21/21, media HTTP/SQL suite 10/10, React CMS 2/2, mocked browser 9/9 passed. Content includes actual Better Auth password/TOTP cookies; media object storage is fake. These are not hosted E2E certification.
- Gitleaks scanned complete modified/untracked file contents with redaction and found no leaks; outgoing commits are separately scanned before handoff. Benchmark JSON contains 27 samples per file, all status 200, no credential-bearing URLs, raw SQL, content bodies or secret-key material found. Only reviewed source/tests/docs and these sanitized metrics are committed; no env files, dumps, screenshots, traces or generated bundles are included. Existing migrations/manifest are unchanged.

### Existing GitHub CI failures and requirements

At baseline `bc0a097`, backend and runtime checks passed; [frontend](https://github.com/azinamouto/Talibon-Official-Website-BetaTest-V1.5/actions/runs/42620828336) and [database](https://github.com/azinamouto/Talibon-Official-Website-BetaTest-V1.5/actions/runs/42620828341) jobs failed. Frontend has the reproduced 501-versus-410 mock assertion. Database logs identify the older public-read integration test expecting 410 where the now-active staff write route correctly rejects anonymous access with 401. These pre-existing expectations remain unresolved; this task does not change production behavior to satisfy them.

PR workflows require backend lint/tests/OpenAPI/ops, disposable R2/auth/media database suites, frontend typecheck/Node tests/coverage/build/browser/e-services suites, and runtime exclusion/build checks. No remote CI ran on these new commits because no push occurred. Full frontend coverage/browser and the older R2 database/restore workflow were not rerun in this commit-preparation task. No branch protection or repository rulesets were returned by GitHub, so configured workflow checks are not currently enforced required checks.

### Deployment safety — stop before push

The checked-in `production-release.yml` is manual (`workflow_dispatch`), gated by `R2_PRODUCTION_QUALIFIED` and the production environment. **That is not the only deployment mechanism.** GitHub shows `vercel[bot]` deploying two projects independently:

- Main merge commit `f88109a` (PR #108, 2026-11-09 12:56:55 UTC) was followed by successful deployments named `Production – talibon-official-website-beta-test-v1-7` and `Production – talibon-official-website-beta-test-v1-8` at 12:59:00 and 13:01:02 UTC (20:59 and 21:01 Asia/Shanghai).
- Feature commit `bc0a097` also produced Preview deployments for both projects. GitHub deployment IDs: production `7655288982`, `7655330421`; preview `7655234295`, `7655201635`.
- The API's generic `production_environment` flag is false even for the named Production records; their names/statuses and timing are observed, but current Vercel project settings and credential/database isolation were not available for verification. The repository has no `git.deploymentEnabled` safeguard. An empty repository webhook list does not disable a GitHub App integration.

Treat merges to main as production-deploying, and pushes as preview-deploying, until an authorized owner verifies the actual Vercel Git integration settings and environment isolation. No automatic deployment settings were changed. Per the user's explicit stop rule, **do not push or create the remote PR** until deployment safety is resolved; do not merge this candidate while release blockers remain.

### API contract and release blockers

- No API path/schema or security-contract changes in these commits; OpenAPI remains unchanged. Better Auth/MFA, restricted grants, private storage, disabled e-services and server-only secrets are preserved.
- Hosted authorized admin/editor login/MFA, real TalGov content/media workflows and public readback remain unqualified. Approved identities, sources/categories and matching staging runtime configuration remain prerequisites.
- Intermittent staging 503 remains an unresolved release blocker. The earlier 47% median latency improvement and zero errors in 54 benchmark requests do not establish its cause or resolution.
- Resolve stale CI expectations and rerun all required workflows; obtain deployment-isolation evidence and recovery/security/official-data sign-offs before release. No approval or team acknowledgment is fabricated here.
