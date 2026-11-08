# TAL.GOV R2 staging readiness

**Result: FAIL - staging qualification is not authorized or verified.**
**Scope:** backend and deployment readiness only. No database or object-storage
connection, migration, production write, deployment, secret inspection, or
credential value was used for this audit.

The current worktree is `feat/talgov-r2-staging-qualification` at `194c338`.
The available [final migration report](FINAL_BACKEND_MIGRATION_REPORT.md) is
dated 2026-11-07 and identifies `feat/talgov-final-backend-migration`; its
results are useful prior evidence, but are not qualification of this exact
branch/revision or of a hosted staging target.

## Gate summary

| Prerequisite | Status | Evidence / remaining work |
|---|---|---|
| Approved staging Neon project, branch, endpoint, region and owner | NOT VERIFIED | No staging identity or authorization was supplied. The checked-in `r2-neon-target.cjs` pins a development project/branch; it is not a staging selector. |
| PostgreSQL isolation and least privilege | NOT VERIFIED | Prior development testing covers synthetic data and separate roles. Confirm a fresh LGU-approved target, non-production data, independent secrets, direct migration and pooled runtime identities, and role grants before connecting. |
| Object storage isolated from production | NOT VERIFIED | The app checks HTTPS endpoint shape and private ACL/policy. That does not prove which project/branch owns the bucket or credential. Verify bucket ownership, branch, private policy, credential scope and anonymous denial out of band. |
| Backend environment-variable names inventoried | PASS | Names and production requirements are listed below. Secret values and local/operator env files were not inspected; actual staging configuration is unverified. |
| Migration and rollback safety reviewed | PASS (static review) | Migration SQL is additive; the general migration CLI is loopback-only, dry-run by default, transactional, and checksum-guarded. Batch rollback deletes only unchanged rows in its own import receipt. These safeguards do not authorize a hosted target. |
| Staging-target migration path | FAIL | No staging-specific target guard or authorized migration procedure is evidenced. Existing Neon qualification scripts are pinned to the development target and can create databases or objects. Do not repoint or run them for staging. |
| Better Auth, MFA and staff RBAC | NOT VERIFIED (staging) | Local and isolated-development integration evidence exists. No end-to-end run against the authorized staging origin, roster, recovery mail or deployed cookie/proxy behavior is recorded. |
| Backup and restore | NOT VERIFIED (hosted) | Final-migration local restore covers 9 tables / 21 synthetic rows; Increment 2.1 also records development Neon logical DB restore. Staging encrypted DB/object restore, cross-project recovery, PITR and approved RPO/RTO remain unverified. |
| Startup and deployment packaging | NOT VERIFIED (hosted) | Runtime validation and `/api/health/ready` exist. Vercel packaging/native `sharp` and PDF-worker behavior, platform limits, real client-IP behavior and a staging smoke are outstanding. |
| Known security incident | FAIL | The final report records a production service-role JWT exposed in historical commit `356e294`, to be treated as compromised. Rotation/revocation and access-log review are not evidenced. Removing runtime references is not remediation. |
| Dependency security | NOT VERIFIED (current audit); FAIL (root lock against saved advisory) | Backend lock now pins `multer` 2.5.0 via scoped override; the saved 2-high audit predates this fix. Root lock still resolves 2.4.0. See reconciliation below; no current zero-finding audit or risk acceptance is claimed. |
| External approvals and operational controls | FAIL | Municipal content/hosting decisions, DPO privacy/retention approval, LGU IT/security recovery and monitoring approval, and dated release/rollback ownership remain outstanding. |

## Backend environment inventory

Names only; no values are reproduced here.

**Production runtime requirements** (`backend/.env.example` and
`backend/src/config/environment.ts`):

- `NODE_ENV` - set to `production`.
- `PORT` - optional platform port; application defaults to `3000`.
- `ALLOWED_ORIGINS` - non-empty, exact HTTPS origin allowlist.
- `TRUSTED_PROXIES` - optional explicit trusted proxy IP/CIDRs; never `*`.
- `ENABLE_MOCK_DATA` - must not be `true`.
- `DATABASE_URL` - runtime PostgreSQL URL with verified TLS; pooled endpoint.
- `STAFF_AUTH_DATABASE_URL` - staff auth/session PostgreSQL runtime URL.
- `MEDIA_DATABASE_URL` - media metadata PostgreSQL runtime URL.
- `STAFF_AUTH_ORIGIN` - HTTPS origin also present in `ALLOWED_ORIGINS`.
- `STAFF_AUTH_SECRET` - at least 43 characters; secret manager only.
- `STAFF_MAIL_API_KEY`, `STAFF_MAIL_FROM` - staff recovery delivery.
- `MEDIA_BUCKET`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION`,
  `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` - server-side private media
  access. Use stage-only credentials and verify the bucket's actual branch.

The three database runtime URLs must address the same approved schema set and
least-privilege runtime role. `VERCEL=1` is platform-provided when applicable;
do not manually set it on another public host.

**Operator/rehearsal only; never put in the web runtime environment:**

- `R2_MIGRATION_DATABASE_URL` - current general migration CLI accepts only
  loopback `r2_*` databases.
- `R2_SOURCE_DATABASE_URL` - archival/export source URL; use a read-only
  account and verified TLS if separately authorized. It is not a staging
  runtime variable.
- `R2_SOURCE_LOCAL_TEST` - local test-only switch; `true` is restricted to
  loopback `r2_*` databases.

No values, presence states or credential-file contents were inspected.

## Existing migration, rollback and storage boundaries

- `backend/database/migrations/001_foundation.sql`,
  `002_privileges.sql`, `backend/database/auth/001_provider.sql`,
  `002_staff_policy.sql`, and `backend/database/media/001_media_policy.sql`
  create/add schema objects, constraints, triggers and grants. No destructive
  down migration is provided.
- `backend/scripts/r2-migrate.cjs` and `r2-media-schema.cjs` default to a
  transaction rolled back after dry-run. `--apply` commits, but their shared
  guard accepts only loopback `r2_*` databases.
- `backend/scripts/r2-transfer.cjs` exports in a read-only transaction;
  import is rollback-only unless `--apply` is passed. Its explicit rollback
  deletes only receipt-listed rows whose digests still match, in reverse
  dependency order, then records an audit event. It is not a general schema,
  staff, media or post-cutover rollback.
- The dedicated Neon qualification and media qualification tools are remote
  write paths for the hard-coded development branch. They create synthetic
  database/object state; auth qualification drops its generated temporary
  database, and media qualification deletes its generated test object. Review
  their target guards and cleanup before any authorized use. Do not execute
  them against an unidentified target.
- The final-migration logical restore is local evidence. Increment 2.1 separately records a hosted development logical DB restore; neither qualifies staging DB/object recovery.
  Object bytes need a separate private backup, manifest and hash verification.
  Neon PITR/branch restore, cross-project disaster recovery, retention, and
  measured recovery objectives remain unverified.

## Required qualification steps

### Safe local checks

These are the existing local/disposable checks. Prior results are in the
[final migration evidence](evidence/final-migration/) and apply to that
reported revision, not automatically to this branch's HEAD.

```powershell
npm --prefix backend run lint
npm --prefix backend test
npm --prefix backend run test:r2:db
npm --prefix backend run test:auth:db
npm --prefix backend run test:media:db
npm --prefix backend run contracts:check
npm run test:ops
```

The final migration report records backend lint/build and tests passing
(3 Jest suites and 56 Node tests), R2 database 13/13, auth database 8/8,
media database 10/10, contract check passing and ops 16/16. It also records
four existing emergency-theme browser assertions failing; no all-browser pass
is claimed.

### Only after staging identity and written authorization are verified

1. Record the approved project, branch, region, endpoint, bucket and owner.
   Reuse the documented project only after ownership approval; verify the staging branch/endpoint and credentials differ from production and the pinned development target. A second project is not inherently required.
   Confirm the stage contains only authorized/sanitized data and has separate
   credentials, mail, storage and disabled external jobs.
2. Resolve/contain the exposed production credential and obtain evidence of
   revocation/rotation and access-log review. Resolve or formally accept the
   backend advisories before considering release.
3. Obtain signed municipal content/hosting approval, DPO privacy/retention
   approval, LGU IT/security backup and incident-response approval, and named
   release and rollback operators.
4. Re-run the local checks above at the exact candidate SHA. Build the backend
   with `npm --prefix backend run build`; verify Node `>=22.16.0 <23`, the
   `api/index.js` to `backend/dist/serverless.js` packaging, native `sharp`
   and PDF-worker dependencies, runtime memory/timeout limits, and platform
   client-IP behavior.
5. Before any hosted DDL, have an authorized operator independently verify the
   target and migration checksums. The current general migration command is
   **not** a Neon staging command. Do not substitute the pinned development
   qualification scripts. No hosted migration command is approved by this
   checklist.
6. Exercise deployed `/api/health` and `/api/health/ready`. Readiness must
   prove the content, auth, media and private-storage dependencies; verify
   expected failure is closed (503) when a dependency/privacy check fails.
7. With approved synthetic staff accounts, verify closed signup, verified
   email, sign-in, MFA enrollment/challenge, TOTP replay rejection, single-use
   backup codes, recovery delivery/expiry/non-enumeration, session expiry and
   revocation, origin/CSRF checks, and admin/editor permission boundaries.
   Verify password-only, inactive, unknown-role, revoked and missing-MFA
   sessions cannot reach staff APIs. Confirm admin step-up and last-admin
   protection.
8. Verify private storage by checking owner-only ACL, no nonempty bucket
   policy (the current verifier fails closed on any policy statement),
   anonymous read denial, authenticated upload/read integrity, and
   unpublish/revoke behavior. Confirm stage credentials cannot access
   production buckets or databases.
9. Perform encrypted DB and object restores into a second isolated target;
   reconcile table/object counts and SHA-256 digests, record measured RPO/RTO,
   log delivery and alert acknowledgment, and obtain a second-operator signoff.
10. Preserve sanitized command output, candidate SHA, target IDs (not URLs or
    credentials), approvals and failure evidence. No production migration,
    deployment, or readiness claim follows automatically from staging success.

**Do not run now:** `npm --prefix backend run test:r2:neon`,
`npm --prefix backend run test:auth:neon`, `npm --prefix backend run test:media:neon`,
or any `--apply`, transfer, provisioning, restore or remote-storage command.
The existing Neon qualification paths target development resources and may
write or delete synthetic state.

## Outstanding blockers and next action

1. Obtain written authorization and a verifiable LGU-owned staging project/
   branch/bucket identity plus stage-only access process. No live connection
   is allowed before this.
2. Have the authorized security owner remediate the historical credential
   exposure and review access logs; close or formally disposition dependency
   advisories.
3. Obtain the municipal, DPO and IT/security approvals listed above.
4. Add or approve a staging-specific migration/qualification procedure whose
   target guard checks the approved staging identities and refuses production.
   Then qualify the exact candidate revision using the steps above.

Until these are complete, staging prerequisites are not met; production
readiness is not asserted.


## Isolation preparation reconciliation ? 2026-11-08

Documentation-only review at starting/ending SHA
`194c338ccdca37e2ecfe58f9432acd07d8996ead`, branch
`feat/talgov-r2-staging-qualification`, worktree
`C:/Users/admin/Documents/TalGov-Final-Backend-Migration`.
The pre-existing untracked checklist was updated in place; no commit or push.
No secret files were opened, provider/registry requests made, migrations run,
or application/dependency files edited. Historical reports remain historical.

### Dependency evidence and corrected prerequisites

Saved JSON was parsed locally from `evidence/final-migration/`:

| Evidence | Verified saved counts | Applicability now |
|---|---|---|
| `audit-backend-prod.json` | 2 high, total 2 | Predates backend override; not a current backend audit |
| `audit-backend-all.json` | 3 low, 23 moderate, 2 high, total 28 | Historical full-tree result; do not infer a new total by subtraction |
| `audit-root-prod.json` | 1 moderate, 2 high, total 3 | Root still locks the affected Multer version; fresh advisory coverage unverified |
| `audit-frontend-prod.json` | total 0 | Historical only; frontend not changed or requalified here |

**PASS (static fix evidence):** commit `17e1feb` adds the backend-only
`@nestjs/platform-express` override to `multer: 2.5.0`; the backend lock resolves
2.5.0. Saved advisory `GHSA-q7qp-rjg7-q26m` identifies `>=2.0.0 <2.5.0` as
affected. The Nest finding is a transitive consequence of that Multer advisory,
not evidence of a second independent vulnerability. This supports correction
of the stale claim, not a current clean audit.

**FAIL (root lock vs saved advisory):** root still resolves Multer 2.4.0;
root and backend both resolve `@nestjs/platform-express` 11.2.8. Deployment
must explicitly identify its install directory/lockfile; a backend override
does not repair root installs. Root remediation requires a separate code task.

Lockfile SHA-256 values checked locally:
- Backend: `65A1312E07928FB313795389C94545CA3622CF21C278ECC9B7AE419B87C05B82`
- Root: `08D0A257E032B3510494956D91BABDDABE27E813FFC9CB1374C31DF696FBC3AE`

**NOT VERIFIED:** fresh registry audit of this revision. Once external access
is authorized, the operator must record timestamp, SHA, lock hashes, Node/npm
versions, exit codes and sanitized JSON for `npm audit --package-lock-only
--omit=dev --json` and `npm audit --package-lock-only --json`, separately from
repository root and `backend/`. An audit transport/error response is not a
zero-finding result. Review residual tooling risk and installation scope;
no `npm audit fix`, dependency upgrade or risk acceptance is authorized here.

### Existing project and required staging identity

[Setup evidence](NEON_SETUP_REPORT.md) and
`backend/scripts/r2-neon-target.cjs` identify **talgov-r2**,
project `misty-silence-69777617`, organization **Akei**
`org-patient-mud-50407342`, region `aws-ap-southeast-1`, PostgreSQL 18.
This is repository evidence, not a current ownership/entitlement check.
The pinned development branch is `dev-talgov-r2-foundation`
(`br-bitter-fire-aouffr8u`), endpoint `ep-bold-bread-aof0cgtb`;
its parent `main` is `br-flat-shape-aoyf83yq`. Neither is an approved staging
branch. Do not assume `main` is production or that its historical empty state
still holds. Production identity must be independently inventoried.

The authorized operator must inspect this existing project first, confirm LGU
permission to use it, and record a dedicated non-default staging branch
(proposed name `staging-talgov-r2`, not yet created/verified), parent, endpoint,
database, region, owner and expiry. Prefer a fresh empty/schema-only target
with reviewed schema and synthetic fixtures. A copied branch can carry roles,
credentials, staff/session records and object access; branch naming alone is
not isolation. Do not copy live data or sessions. Any approved copy must stay
quarantined until sanitization, session invalidation and credential separation
are demonstrated. Confirm actual storage entitlement and branch behavior with
the provider before provisioning; no current provider capability is asserted
by this offline review.

### Operator verification gates (not executed)

1. **Roles:** provision separate staging migration and runtime LOGIN identities
   with unique secret-manager credentials; the runtime inherits only the
   reviewed `talgov_runtime` NOLOGIN group. Both must lack SUPERUSER, CREATEDB,
   CREATEROLE, REPLICATION and BYPASSRLS. Inspect `pg_roles`, transitive
   `pg_auth_members`, database/schema ownership, ACLs and default privileges.
   Runtime must not own schema/ledger, create schema objects/temp tables,
   alter grants or modify migration history. Verify intended grants across
   foundation, auth and media schemas using `has_*_privilege` checks and
   transactional synthetic positive/negative tests. The migration owner needs
   approved DDL rights; role creation in `002_privileges.sql` needs separate
   provisioning authority if the group does not exist. Do not grant CREATEROLE
   to the deployed login to make migration succeed.
2. **Connections:** independently bind project/branch/endpoint metadata to
   database and `current_user` for direct migration and pooled runtime access;
   enforce certificate/hostname verification and required channel binding.
   Verify all three runtime DB variables target the intended staging database.
   Confirm stage identities cannot authenticate to development/production via
   approved policy evidence; active negative probes require explicit scope.
   Never print connection URLs. Do not deploy provisioning/migration secrets.
3. **Storage:** record staging project/branch/bucket ownership, credential scope
   and private ACL/policy. Separate keys and bucket access from development and
   production; prove no cross-environment read/list/write/delete permission.
   Use policy review first; cross-environment probes need explicit approval.
   On staging only, use synthetic bytes to test authenticated upload/read/hash,
   anonymous and unauthorized denial, publish/unpublish/revoke, and approved
   cleanup. Verify copied objects/public URLs cannot bypass authorization.
   A successful database branch check does not prove storage isolation.
4. **Migration preflight:** require a separately reviewed staging runner/runbook
   with an allowlist of project, branch, endpoint and database, rejection of
   default/development/production targets, and explicit apply approval. Keep
   existing guards intact. Record normalized-LF SHA-256 for the ordered chain:
   `migrations/001_foundation.sql`, `migrations/002_privileges.sql`,
   `auth/001_provider.sql`, `auth/002_staff_policy.sql`, then
   `media/001_media_policy.sql` (under `backend/database/`). Review ownership,
   ledger/history and existing catalog drift, prerequisites, bounded lock and
   statement timeouts, concurrent writers and failure behavior. Rehearse the
   complete chain on disposable local PostgreSQL first. A rollback-only hosted
   dry run still executes SQL/acquires locks and needs hosted authorization.
   Require direct connection, maintenance/write freeze, protected recovery set
   and two-person target/checksum check before approved staging DDL. Abort on
   mismatch; never edit applied SQL or mark failed migrations as applied.
5. **Recovery:** before apply, capture protected DB backup, role/grant inventory,
   independent object manifest/bytes/hashes and compatible artifact/config
   references. For an empty target, record that baseline explicitly. Verify
   encryption, access control, retention and key recovery. Restore into another
   isolated target and reconcile schema/history/grants, table counts/digests,
   object counts/hashes and auth revocation. Measure against owner-approved
   RPO/RTO and obtain second-operator signoff. Provider PITR/history window and
   object recovery guarantees remain NOT VERIFIED until demonstrated.
   On failure freeze writes and preserve evidence; transaction rollback covers
   uncommitted SQL only. Committed schema changes require reviewed roll-forward
   or restore to a new target. Batch rollback is limited to unchanged receipt
   rows; it cannot reverse staff/media activity. Never overwrite the live DB,
   reset a shared branch, or reactivate the exposed legacy stack automatically.

### Approval sequence and exact external handoff

All approvals below are **NOT VERIFIED**; this document grants none.

1. LGU infrastructure owner authorizes dated, scoped control-plane inspection
   of the existing project and identifies production resources. Security owner
   separately authorizes credential revocation/rotation and log review for the
   historical exposure; retain sanitized incident closure evidence.
2. Infrastructure owner approves branch/endpoint and private storage creation,
   cost/expiry, role provisioning and secret distribution. DPO/data owner
   approves permitted synthetic/sanitized data, retention and mail recipients.
   Operator then creates the isolated resources and records IDs plus ownership
   and negative-access evidence from the gates above. No live imports assumed.
3. Backend/security reviewer verifies current audits, install scope, candidate
   checks and the staging-specific migration procedure. LGU IT/recovery owner
   approves backup/restore targets and RPO/RTO; named migration operator and
   independent reviewer approve exact target/checksums, rehearsal and apply
   window. Only then execute staging preflight and approved migration/recovery
   rehearsal. Any failed gate blocks progression.
4. Hosting/release owner separately approves staging deployment, configuration,
   synthetic staff/mail tests and scoped smoke tests. Capture readiness, MFA,
   storage isolation, recovery and monitoring evidence at the deployed SHA.
   Municipal content approval is required before using official content.
   Production cutover, imports, source shutdown and rollback are separate
   approvals and remain outside this preparation task.

Remaining blockers: unapproved staging identities/resources; no staging-safe
migration path; unverified role/storage separation, recovery and deployed
behavior; current audits/install-scope disposition; historical credential
incident closure; and missing named approvals. Staging remains **FAIL**.

## Root dependency ownership audit - 2026-11-08

Scope: requested branch `feat/talgov-r2-staging-qualification`, HEAD
`194c338ccdca37e2ecfe58f9432acd07d8996ead`, worktree
`C:/Users/admin/Documents/TalGov-Final-Backend-Migration`. The IDE's original
worktree is a different branch; conclusions below were rechecked here.
This addendum supersedes earlier statements that current audits were not run.
Existing checklist content is preserved. Node 22.16.0 / npm 10.9.2.
Registry audit requests and public advisory reads only; no hosted database,
deployment, secret-file inspection, manifest edits, commit or push.

### Ownership evidence

- Root `package.json` is an orchestration manifest, with no npm workspaces.
  Dev/build/start/preview/lint delegate using `--prefix`; ops commands run Node.
  `ops/*.mjs` imports built-ins/local files, not root third-party packages.
  `clean` invokes unpinned `npx rimraf`, absent from the root manifest; this is
  a separate reproducibility issue, not a reason to retain the current tree.
- `api/index.js` only imports `../backend/dist/serverless.js`.
  Backend builds with its TypeScript compiler and emits CommonJS metadata.
  Resolution probes from that location select backend-local Nest and Multer;
  frontend probes select frontend-local React/Vite. Root copies are redundant
  when child installs are complete. A missing child install must fail, not be
  silently masked by a root fallback.
- `vercel.json` installs all three locks, runs the delegated build, publishes
  `frontend/dist`, and includes `backend/dist/**` for `api/index.js`.
  Production-release and runtime-exclusion workflows also install all three.
  Backend/frontend CI install in their respective working directories.
  Monitoring/social scripts run Node directly. Vercel CLI is invoked by npx,
  not supplied by any root dependency. No active root bundler config found.
- `.vercelignore` excludes archive, docs, tests and env globs. Actual hosted
  function tracing, inclusion of backend node_modules/native assets, and
  deployment behavior remain unverified; includeFiles alone is not proof.

| Root packages | Active owner / disposition |
|---|---|
| @nestjs/common, @nestjs/core, @nestjs/platform-express | Backend owns active Nest runtime. All root copies are cleanup candidates. |
| react, react-dom, routers, leaflet/react-leaflet, lucide-react, motion, recharts | Frontend owns UI runtime; root copies have no active consumer. |
| stripe, @stripe/stripe-js, xendit-node | Child manifests retain these; Xendit import exists in deferred payment service, absent from active AppModule providers. No Stripe SDK import found in active src. Root copies unnecessary; do not equate child installation with an enabled payment workflow. |
| @google/genai | Frontend declares it, but no active src import found. Root copy unnecessary; child cleanup is outside this audit. |
| esbuild | Root direct 0.24.2 has no identified build/serve consumer. Backend build uses tsc; frontend owns Vite and its esbuild 0.25.12. |
| axios, dotenv, express, class-transformer, class-validator, reflect-metadata, rxjs | Child-owned libraries; no independent root consumer found. |
| Root Vite (duplicated in dependencies/devDependencies), React/Tailwind Vite plugins, Tailwind, autoprefixer, tsx, TypeScript and all @types entries | Child-owned build/type tooling; no root tooling consumer found. |

Thus no root third-party dependency is established as necessary for the active
workflows. Archive files (including the IDE's legacy Login.tsx) do not establish
production ownership. All existing root dependency/devDependency entries are
potentially obsolete; child dependencies remain unchanged.

### Security relevance and current evidence

`npm audit --json` returned exit 1: **2 high, 1 moderate, total 3**.
`npm audit --omit=dev --prefix backend --json` returned exit 0: **zero**.
`npm run test:ops` passed **16/16**. These do not qualify a deployed artifact.

- Root Nest platform-express 11.2.8 pulls Multer 2.4.0. The two high package
  findings are one underlying advisory plus its parent dependency effect:
  [GHSA-q7qp-rjg7-q26m](https://github.com/advisories/GHSA-q7qp-rjg7-q26m).
  It affects Multer >=2.0.0 <2.5.0 with asynchronous fileFilter callbacks after
  request teardown and can crash the process. No Multer/FileInterceptor/
  FilesInterceptor/fileFilter usage was found in backend/src; active media
  uploads require JSON. Root installation is real supply-chain surface, but
  an exploitable R2 request path was not established. Backend already has a
  scoped override and lock entry for Multer 2.5.0. Root cleanup does not replace
  that backend fix, and the backend override does not repair the root tree.
- Root direct esbuild 0.24.2 is affected by
  [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99),
  fixed in 0.25.0. This concerns cross-origin reads from esbuild's development
  server, not static bundles merely built with esbuild. No active root serve
  invocation was found. Root Vite's nested esbuild is 0.25.12 and tsx's is
  0.28.2; backend still declares direct 0.24.2 as a devDependency, a separate
  unresolved child tooling finding outside this root-only change.
- npm suggests Nest 12.4.0 / esbuild 0.28.2 changes; neither is required for
  root remediation. Do not run audit fix --force or upgrade Nest's major.

### Exact proposed changes - NOT APPLIED

**Recommended ownership cleanup:** set root `dependencies` and
`devDependencies` to empty objects (remove every current entry in both), retain
all scripts, engines and other metadata, and regenerate only root
`package-lock.json` using `npm install --package-lock-only --ignore-scripts`.
This leaves the root as an orchestration package, removing both vulnerable
root paths without changing child packages or framework versions. Keep the
root lock and existing CI/Vercel install commands. Review that regeneration
removes all root package nodes and does not alter either child lock.
This is the smallest coherent ownership solution, not the smallest line diff.

**Narrow advisory-only alternative:** remove only root `dependencies.esbuild`
and add `overrides: { "@nestjs/platform-express": { "multer": "2.5.0" } }`,
then regenerate the root lock. This preserves redundant packages but fixes the
known advisory paths without a Nest major upgrade. Nested Vite/tsx esbuild
versions are already above the fix boundary. Validate the resulting audit;
this alternative has not been applied or tested.

### Required validation after authorized cleanup

Run in a disposable, secret-free checkout of this branch, using pinned Node,
with complete child installs and no inherited root node_modules fallback:

```powershell
npm install --package-lock-only --ignore-scripts
npm ci
npm ci --prefix backend
npm ci --prefix frontend
npm audit --json
npm audit --omit=dev --json
npm audit --omit=dev --prefix backend --json
npm audit --omit=dev --prefix frontend --json
npm run lint
npm run build
npm run test:ops
npm test --prefix frontend
npm run test:react --prefix frontend
node --test backend/test/deployment.test.cjs
node ops/check-runtime.mjs --artifacts
npm ls --all
npm ls --prefix backend @nestjs/platform-express multer
npm ls --prefix frontend react vite esbuild
git diff --check
git diff -- package.json package-lock.json
git diff --exit-code -- frontend backend
```

The deployment test uses synthetic fixture configuration and loopback services.
Do not run hosted qualification, migration, smoke, promotion or deployment
commands as part of this validation. Separately authorized artifact tracing
must confirm backend-local dependencies, sharp and PDF assets before release.
No post-cleanup validation result is claimed by this audit.

### Filename-only sensitive-file review

Tracked `BACKUPENVSUPA.txt` is potentially sensitive and was not opened.
Tracked `.env.example`, `backend/.env.example`, `frontend/.env.example`,
`.codex/config.toml` and `.vscode/settings.json` merit owner-controlled hygiene
review; filenames alone do not establish their contents or a leak. No tracked
*.pem/*.key or credential/secret-named files were found by the filename query.
Legacy SQL and Supabase paths remain tracked; classification is not secret
scanning. `.vercelignore` does not explicitly exclude BACKUPENVSUPA.txt: package
upload exposure needs separate disposition. Recommend excluding/removing that
file from deployable source after owner review; deletion alone would not revoke
any historical credential. No such edits or history rewriting were performed.
The previously documented credential incident remains unresolved.

**Decision:** STOP pending explicit dependency-cleanup authorization. Staging
remains FAIL for the other recorded gates. Root/child manifests and locks,
frontend/backend implementations, and all pre-existing checklist bytes remain
unchanged by this audit; this section was appended to the untracked document.

## Authorized root cleanup result - 2026-11-08

**Cleanup acceptance: PASS. Overall staging readiness: still FAIL.**
This section supersedes the earlier pending-authorization decision for root
cleanup only. User explicitly authorized these three files on
`feat/talgov-r2-staging-qualification` at unchanged HEAD
`194c338ccdca37e2ecfe58f9432acd07d8996ead`.

Changed files only:
- `package.json`: emptied dependencies and devDependencies. Programmatic
  comparison against HEAD confirms all other metadata, identity, scripts and
  engines are unchanged.
- `package-lock.json`: regenerated with
  `npm install --package-lock-only --ignore-scripts`; lockfileVersion 3 now
  contains only the root package, retaining its name/version/engine metadata.
- `docs/r2/STAGING_READINESS.md`: appended evidence; remains untracked.
  SHA-256 verification confirms all 32,040 pre-existing bytes are preserved.

Actual checks, Node 22.16.0 / npm 10.9.2:

| Check | Result |
|---|---|
| Branch and initial status | Correct branch; only pre-existing untracked readiness document |
| Before: npm audit --omit=dev --json | Exit 1; 2 high, 1 moderate, 0 critical (3 total) |
| Root lock regeneration | Exit 0; audited root only, zero vulnerabilities |
| Root clean install: npm ci | Exit 0; no root third-party dependency tree required |
| After: npm audit --omit=dev --json | Exit 0; zero findings at every severity |
| npm run test:ops | Exit 0; 16/16 passed |
| npm run lint:backend | Exit 0; ESLint and TypeScript passed |
| npm run build:backend | Exit 0; clean TypeScript build passed |
| npm run test:unit --prefix backend | Exit 0; rebuild and Jest passed: 1 suite, 3 tests |
| Orchestration/ownership assertions | All delegated dev/build/lint/start/preview script targets exist; backend TypeScript/ESLint/Jest/Nest and frontend Vite/TypeScript/React resolve in their own node_modules |
| Manifest/lock consistency assertions | Empty declarations, only root lock entry, matching identity/version/engines |
| Child dependency preservation | SHA-256 matches for frontend/backend package.json and package-lock.json |
| git diff --check | Passed |
| Final scope | Only two authorized root files modified plus this untracked document |

No broken orchestration command was identified. Backend build/lint and ops
were executed through root scripts after root clean install. Frontend commands
were checked for target/tool resolution, not re-run. Dev/start/preview servers,
install:all, clean, hosted smoke and monitoring were not invoked. The existing
unpinned npx rimraf in clean remains a reproducibility issue; it was not changed.
The backend unit result is the actual current Jest selection (1 suite/3 tests),
not the broader historical test count. Full backend integration/database suites
were not requested or run, and no test was weakened or skipped within test:unit.
An initial inline manifest-edit command failed to parse before writing; it was
corrected and the required installation and verification commands then passed.

Remaining staging blockers are unchanged: approved isolated staging identities,
staging-safe migration procedure, least-privilege/storage separation and recovery
proof, credential-incident closure, deployment/native asset packaging validation,
and named municipal/DPO/IT approvals. Backend dev-only esbuild and broader child
advisories remain outside this root-only cleanup; no new child audit result is
claimed. BACKUPENVSUPA.txt remains a filename-only unresolved hygiene concern.

No source or child dependency edits, hosted connections, database writes,
migrations, deployments, commits, pushes, rebases or merges were performed.
No environment values or BACKUPENVSUPA.txt contents were inspected or printed.
