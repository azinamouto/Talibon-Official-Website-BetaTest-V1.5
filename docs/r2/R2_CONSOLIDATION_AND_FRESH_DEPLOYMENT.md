# R2 consolidation and fresh deployment — 2026-11-11

Status: **local verification in progress; hosted acceptance and deployment isolation blocked**.
Canonical checkout: `TalGov-Final-Backend-Migration`; branch:
`feat/talgov-r2-staging-qualification`; starting HEAD `261a8d2`.
Preserve all five commits and append repairs; never reset, rebase or force-push them.
This report supersedes the old combined-project release destination and the
uncommitted-change instructions in `DEPLOYMENT_ISOLATION_CI_REPAIR.md`.

## Migration audit and acceptance boundary

- `ops/check-runtime.mjs --artifacts` checks active frontend/backend/API source,
  scripts, mocks, package manifests/locks, environment examples, workflows,
  Vercel configuration and generated JS/CSS. No active Supabase dependency was
  found. Do not delete historical SQL, archived R1 source or exclusion tests.
- Runtime uses `pg` with certificate verification/channel binding and restricted
  role checks; Better Auth on Neon PostgreSQL enforces closed registration, staff
  roles, MFA and session revocation. Private S3-compatible Neon storage rejects
  public grants and unverified bucket policy. No security control was weakened.
- The tracked historical `BACKUPENVSUPA.txt` is now explicitly excluded from
  Vercel uploads. Its contents were not opened or printed. Its historical
  credential status still requires owner review; exclusion is not rotation.
- CMS authoring/publication/readback and media privacy are exercised against
  disposable local databases. Fake object storage is not hosted Neon storage
  certification. No hosted migrations, data transfers or production writes ran.
- Deferred e-services, submissions, payment and notification routes remain
  disabled. No government records or approval status were fabricated.
- **Migration completion is not claimed:** hosted admin/editor MFA, permitted
  CMS workflows, actual private storage ACL/policy support, upload/download,
  publication/unpublication and public readback still need approved staging
  acceptance. Existing staging 503 remains a release blocker; R3 may investigate
  performance, but unresolved availability cannot be relabeled production-ready.

## Legacy deployments: owner-only disconnect procedure

GitHub deployment records rechecked November 11 still identify:

| Legacy project | Preview record | Production record |
| --- | --- | --- |
| `talibon-official-website-beta-test-v1-7` | `7655234295` at `bc0a097` | `7655288982` at main merge `f88109a` |
| `talibon-official-website-beta-test-v1-8` | `7655201635` at `bc0a097` | `7655330421` at main merge `f88109a` |

These prove prior independent Git App triggers, not current disconnection.
Current dashboard linkage, hooks, queued jobs and credential scopes remain
unverified. The owner's submitted evidence fields were placeholders.

Before any push, an authorized owner should:

1. Inventory all projects/teams linked to the canonical GitHub repository, not
   only these two. Record project IDs, domains, root/config path and Git branch
   metadata without secret values.
2. For each legacy project, use **Settings → Git → Connected Git Repository →
   Disconnect**. Review/remove legacy Deploy Hooks and their external callers;
   cancel queued candidate deployments and disable old CLI/release automation.
   Keep `R2_PRODUCTION_QUALIFIED` false/unset. Do not delete live projects,
   change production data or move domains during this safety step.
3. Save sanitized evidence of disconnection, absent automatic triggers and no
   queued candidate deployment. Verify no other connected project remains.
   An empty GitHub webhook list and environment names are not sufficient proof.

The root `git.deploymentEnabled: false` remains defense in depth for all branches.
It does not block manual CLI/API redeployments or promotions. No dashboard setting
was changed by this work. See [Vercel Git settings](https://vercel.com/docs/project-configuration/git-settings)
and [Git deployment configuration](https://vercel.com/docs/project-configuration/git-configuration).

## Fresh architecture (proposed, not provisioned)

Create two new projects after approval: `talgov-r2-preview` and
`talgov-r2-production`. Each deploys the **same combined repository root**:

```text
Browser → same-origin Vercel project
          ├─ React/Vite static frontend/dist
          └─ /api/* → api/index.js → compiled NestJS Express function
                                      ├─ Neon PostgreSQL + Better Auth MFA
                                      └─ private Neon Object Storage
```

Separate projects provide a credential boundary while same-origin frontend/API
preserves host-scoped cookies, CORS, CSRF/origin checks and current rewrites.
Do not point Preview at a production backend or reuse an old project ID.

| Setting | Preview project | Production project |
| --- | --- | --- |
| Git auto-deployment | Disabled; approved manual Preview target only | Disabled; approved manual Production target only |
| Domains | Dedicated staging hostname; never official production domain | Official hostname only after hosted acceptance/cutover approval |
| Database | Isolated Neon staging branch/database and staging runtime login | Separate production database/branch and runtime login |
| Auth | Staging-only staff accounts/sessions/MFA, independent secret and recovery-mail sandbox | Production-only accounts, new independent secret, verified production mail |
| Storage | Private staging bucket/endpoint, staging-only access key | Separate private production bucket/endpoint and production-only key |
| Vercel credentials | Separate staging project ID/token scoped as narrowly as available | Dedicated production project ID/token behind protected GitHub environment |

Never copy staging secrets or cloned staging identities into Production. Never
place Production secrets in Preview, Development or all-environment scopes.
Leave unused target environments unconfigured. Verify project IDs and target
before any `pull`, build or deploy; repo Git blocking does not constrain CLI.
Use a fixed approved staging hostname for auth acceptance; random PR origins
must not be wildcard-trusted. Preview deployments should be access protected.

Both projects use root `vercel.json`, root install/build commands, output
`frontend/dist`, and Node **22.x** (repo engines `>=22.16.0 <23`). Do not use
the provider's default major or Edge runtime. The build compiles decorators/DTO
metadata with `tsc`, emits CommonJS Nest output, and the ESM API entry imports it.
The function caches initialization and resets after failed bootstrap. Native
`sharp` dependencies must be installed/built on Vercel Linux; do not upload
Windows `node_modules` or locally built native artifacts.

[Vercel supports Node 22](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).
The current 2 MiB media cap must stay below the platform's
[4.5 MB buffered request/response limit](https://vercel.com/docs/functions/limitations),
including encoding/envelope overhead. Validate actual API payloads on hosted
Preview. No filesystem persistence or background worker is assumed. Qualify
function duration/memory, native bundle size, region proximity and cold starts
in staging before choosing production limits.

### Environment contract (names only)

Server-only per project/target: `DATABASE_URL`, `STAFF_AUTH_DATABASE_URL`,
`MEDIA_DATABASE_URL` (same environment's schema set and restricted runtime roles),
`STAFF_AUTH_SECRET` (independent, at least 43 characters), `STAFF_AUTH_ORIGIN`,
`ALLOWED_ORIGINS`, `STAFF_MAIL_API_KEY`, `STAFF_MAIL_FROM`, `MEDIA_BUCKET`,
`AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`.
Use verified TLS/channel binding and pooled runtime URLs; never runtime owner
or migration credentials. Offline migration/source/Neon API keys do not belong
in either runtime environment. Preview also runs with `NODE_ENV=production` so
strict validation applies, but uses staging resources exclusively.

Frontend: `VITE_ENABLE_MOCK_DATA=false`, same-origin API default. No database,
auth signing, storage or mail secrets may have a `VITE_` prefix. Preserve CSP,
security/cache headers, exact trusted origins and platform client-IP handling.
Do not set `VERCEL=1` outside Vercel or broaden `TRUSTED_PROXIES`.

Existing `production-release.yml` remains gated and must not be dispatched with
legacy bindings. After approval, bind reviewed fresh production IDs/credentials
only in a protected production environment with required reviewers and branch
restrictions. Stage with a separate approved Preview process; do not reuse
`--prod --skip-domain` as staging (it loads Production configuration).

## Main consolidation gates and R3

1. Commit reviewed local CI repairs and these reports; preserve `261a8d2` as ancestor.
2. Obtain legacy-trigger disconnection evidence and deployment-readiness approval.
3. Only then push explicitly to `canonical`:
   `git push canonical HEAD:refs/heads/feat/talgov-r2-staging-qualification`.
4. Open the PR against canonical `main`; require backend, database, frontend and
   runtime checks on its merge result, reviewed migration/secret diff, and no
   unexpected Vercel deployment. Protect main/environments; current GitHub
   inspection found no branch protection/rulesets or required-reviewer rules.
5. Merge only when all gates are verified. If main advances, integrate with a
   reviewed merge, not a rewrite of the five commits. No remote writes yet.
6. After merge, fetch updated canonical main and create
   `hardening/talgov-r3-performance-security` from that verified merged SHA.
   Do not create it prematurely from this feature branch or stale local main.

R3 scope only: API latency and intermittent 503 diagnosis, aggregate connection
pooling, security/dependency remediation, monitoring/alert delivery and load
tests. No R3 implementation is included here. Hosted release acceptance,
official-data and recovery signoffs cannot be postponed merely by opening R3.
The already-preserved `f5d73ac` transaction batching and benchmark evidence remain
part of the five existing commits as instructed; no new performance changes were
added. Canonical main was fetched read-only at `f88109a`; it contains the prior
baseline through PR #108, not these five follow-up commits.

## Verification and blockers

Local results (Windows, Node 22.16.0; GitHub Linux execution remains a PR gate):

| Check | Result |
| --- | --- |
| Frontend/backend lint and builds | Passed; existing frontend bundle-size warning |
| Backend unit tests | 3 Jest + 80 Node passed |
| Disposable PostgreSQL | R2 13, auth/MFA 8, private media 10, CMS 21, staging safety 60 passed |
| Backup/restore rehearsal | 9 tables / 21 rows; checksums, constraints and grants verified |
| Frontend Node tests | 12 passed |
| React coverage | 102 passed; 98.94% statements, 96.06% branches, 100% functions/lines; thresholds unchanged |
| Operations tests | 17 passed |
| OpenAPI / runtime exclusion | Passed; 409 runtime/artifact files checked |
| Full Chromium browser suite | 142/142 passed locally (14.4 minutes); hosted acceptance remains pending |
| Changed workflow YAML | Parsed successfully |

The two verified stale contract assertions now expect anonymous CMS rejection
(401, no database write) and unsupported mock writes (501). Browser fixtures
follow the active media API; theme assertions match the already-shipped design.
Vitest concurrency is bounded at two workers after reproducing a keyboard-test
timeout under excessive concurrency. No failing test was disabled or threshold
lowered. Database CI now also runs the verified CMS suite and propagates failure.

Chromium e-services 23 + payments-disabled 1 passed. The first full Edge run
had 110 passes/16 failures; those failures were retained as evidence and repaired,
not skipped. Targeted Chromium rerun: 32/32 passed after splitting each news
state into its own test with unchanged default timeouts and assertions.

Dependency audits: root/frontend zero; backend full 3 low + 23 moderate;
backend/frontend production-only zero. No blind dependency updates. Hosted
credentials, real ACL/readiness, authorized content acceptance, recovery,
official-data signoff, legacy triggers and fresh project configuration remain
external blockers. No push, PR, merge, deployment or R3 branch is yet authorized
to proceed past these unverified gates.
