# TAL.GOV R2 staging readiness

## Pre-apply qualification - 2026-11-09

**NO-GO for apply.** Supersedes historical five-migration and preflight-not-run summaries below. Operator reports successful hosted preflight: `{"mode":"preflight","applied":0,"pending":6}`. Actual execution timestamp, exit status and candidate/target evidence reference still need attaching; this session did not rerun hosted preflight.

Local candidate: branch `feat/talgov-r2-staging-qualification`, HEAD `2344709d6b1d721a27a95b66e14ec2fa184bea1d` plus existing uncommitted/untracked work. All six normalized-LF SQL checksums match the ordered manifest, including `content/001_content_policy.sql`. Current raw manifest SHA-256: `a1554cb00e1c48746c581fc1270df31bf8ec9d1312c198b26de174f2f46f9d41`. The historical manifest hash covers five files; no recorded six-file preflight hash was found to prove unchanged bytes since that run. No SQL, manifest, target or executable code was edited here.

Local target pins: project `misty-silence-69777617`, branch `br-steep-sea-ao0qw05a` (`staging-talgov-r2`), endpoint `ep-sparkling-bird-ao5precf`, database `neondb`, restricted login `talgov_staging_migrator`. Local assertions PASS: six checksums, three denied branches, off-target hosts, default branch and endpoint/branch mismatch rejection. The hosted entry point verifies metadata before connection and again within the transaction, with no target override. These guards constrain this runner; they do not establish credential-wide access restrictions. Live target was not reverified here: both required process credentials are absent (presence-only check).

Remaining gates:

1. Recovery: latest ALZA decision conditionally accepts disposable staging loss. Accepted DB/object/dependency inventory, baseline timestamp, isolated destination/recreation procedure, RPO/RTO, retention, recovery owner/independent-reviewer acceptance and escalation contact remain incomplete. No backup, restore or PITR verification is inferred.
2. Security: historical credential revocation/rotation, access-log review evidence, security-owner acceptance and existing dependency/install-scope disposition remain pending.
3. Review/freeze: both review columns remain PENDING. Accept exact six-file candidate and manifest/catalog/runner hashes, attach hosted preflight evidence, record named operator, enforcing owner, maintenance/write/control-plane freeze window and escalation contact.
4. Authorization: historical authority explicitly covered five migrations. Current request requires explicit deployment authorization after all gates; six-migration apply is not authorized by this qualification.

After records are accepted and credentials securely injected, safe next hosted command: `node backend/scripts/r2-staging-migrate.cjs --preflight`. Expected empty result: `{"mode":"preflight","applied":0,"pending":6}`. Do not run `--apply` until every gate and explicit deployment authorization are satisfied. No hosted operation or deployment occurred here.

## Final CMS database scope decision - 2026-11-09

**FINAL: retain the existing five-migration chain and all 20 application tables**, including `app.import_batches` and `app.content_asset_links`. Do not prepare an alternative 18-table baseline. The approved CMS/auth architecture and supporting tooling require this scope; the chain creates no deferred e-services, payments, permit-processing, chatbot or legacy Supabase tables. This decision does not activate page/news/service editing or authorize a new CMS architecture.

This is the current scope/readiness summary and supersedes conflicting historical scope or missing/expired owner-authorization language below. Reuse the existing staging runner, unchanged SQL, manifest checksums and catalog baseline, and the recorded validated 41-test suite (41 passed, no failures/skips). All five normalized-LF SQL checksums were rechecked for this documentation update; no new suite run or hosted result is claimed. Existing changes are preserved.

**Readiness: local qualification recorded; hosted preflight and apply BLOCKED.** The recorded ALZA owner authorization covers provisioning, inspection, preflight and the five-migration apply on the pinned staging target; do not request it again. It is not independent review, recovery acceptance or security evidence.

Remaining mandatory prerequisites:

1. Secure process injection of `R2_STAGING_DATABASE_URL` and `NEON_API_KEY` for the pinned restricted migrator/direct verified-TLS target; neither variable is present in this execution environment (presence-only check).
2. Accept protected target/role/ACL and empty database/object inventory evidence with its actual timestamp. Supplied observations are not independent verification; do not repeat provisioning just because signatures are pending.
3. Complete recovery-owner and independent-reviewer acceptance: empty baseline, isolated recovery destination, retention, RPO/RTO, failure-evidence preservation and escalation contact. Do not claim a restore rehearsal or incident closure.
4. Record historical credential revocation/rotation and access-log review evidence with security-owner acceptance, plus the existing dependency/install-scope disposition. No unrelated audit or production remediation is undertaken here.
5. Complete both existing review columns against the exact candidate/hashes, ordered manifest and catalog, and record named operator, escalation contact and maintenance/write/control-plane freeze window. Before apply, record successful preflight evidence and both apply reviews/window under the already granted owner authority.

**Exact next executable action:** complete the existing recovery and two-person review records with genuine protected evidence and securely inject the two credentials. Once all preflight gates above are satisfied, run from the repository root:

```powershell
node backend/scripts/r2-staging-migrate.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Staging preflight rejected' }
```

Expected empty-target result: `{"mode":"preflight","applied":0,"pending":5}`. Retain sanitized output, timestamp, exit status and candidate/target references. Only after successful preflight and the apply-specific gates use the existing acknowledgment/`--apply` procedure in `STAGING_MIGRATIONS.md`. No hosted preflight/apply, real LGU data, commit, push or deployment occurred in this scope-decision update.


## Owner-authorized execution assessment - 2026-11-09

**Authorization recorded / execution assessment timestamp: 2026-11-09 01:51:47 Asia/Shanghai (UTC+08:00), 2026-11-08 17:51:47 UTC.** This is the actual agent recording timestamp, not a claimed time of owner signature, hosted inspection or migration execution.

**Owner authorization: GRANTED. Hosted preflight/apply: BLOCKED by unsatisfied prerequisites.** This section supersedes historical statements that owner staging provisioning, inspection, preflight or apply permission is missing or expired. It does not supersede security, recovery, independent-review or target guards.

Authority and source: AJ Rienze Josol, ALZA CTO, repository owner and Neon project owner; explicit directive in this session, titled TALGOV R2 - OWNER-AUTHORIZED STAGING EXECUTION. Codex is authorized to perform technical staging provisioning, hosted inspection, migration preflight and the five existing schema migrations against the ALZA-owned target below, and to prepare focused synthetic Better Auth/photo/document CMS tests; hosted-write tests remain conditional on authorization and technical safety. The directive covers this execution task and specifies no separate clock expiry. No additional permission for these same actions is required.

Exact scope: project misty-silence-69777617; staging-talgov-r2 / br-steep-sea-ao0qw05a; endpoint ep-sparkling-bird-ao5precf; database neondb; restricted migration login talgov_staging_migrator. Never use neondb_owner as the migration login. Excluded: main, development, production, actual LGU records, deployments, external integrations, unrelated refactors, commits and pushes. Target guards, verified TLS and checksum protections remain mandatory. Existing edits are preserved.

Candidate inspected: feat/talgov-r2-staging-qualification, HEAD 2344709d6b1d721a27a95b66e14ec2fa184bea1d plus existing uncommitted/untracked work. Local target pins match the directive. All five SQL checksums recomputed over UTF-8 normalized to LF match the ordered manifest. No SQL, target, runner or catalog was changed by this assessment. Hashes below identify inspected bytes; they are not independent review signatures.

| Gate | Current result |
|---|---|
| Owner provisioning / inspection / preflight / five-migration apply authority | GRANTED by the explicit directive above; separate operations are expressly covered |
| Hosted access | BLOCKED: presence-only checks found both R2_STAGING_DATABASE_URL and NEON_API_KEY absent; no Neon connector exposed. No secret files/stores read, no credential values printed |
| Live identity, roles, ACLs, empty baseline | NOT REVERIFIED: supplied owner observations retained as supplied evidence; no hosted request or database connection made |
| Recovery acceptance | PENDING: owner/reviewer acceptance, complete DB/object inventory, baseline timestamp, isolated destination, retention and RPO/RTO not established |
| Security incident | PENDING: FINAL_BACKEND_MIGRATION_REPORT.md identifies historical production service-role JWT exposure at commit 356e294; no revocation/rotation, access-log review or ALZA security-owner acceptance evidenced. Remediation of production is outside this directive |
| Dependency/install-scope disposition | PENDING reviewer acceptance; historical root cleanup is not a fresh child dependency audit |
| Independent review | PENDING: both review columns in STAGING_MIGRATIONS.md are unsigned; owner execution authorization is not a second person's checksum/candidate review |
| Freeze / escalation | PENDING: enforcing owner, maintenance/write and control-plane freeze window and escalation contact are not recorded; no freeze inferred from this directive |
| Hosted runner | --preflight NOT RUN; --apply NOT RUN; zero migrations applied by this session. Live history/catalog/ownership/permissions remain unverified |

The existing runbook explicitly requires recovery, incident and two-person review before preflight even though the CLI does not enforce those external records. No approval variable was generated and no gate was weakened. To resume, securely inject the two required process variables and supply the outstanding recovery, incident/dependency disposition, review and freeze evidence. Owner permission need not be requested again. Additional provisioning is not justified solely by an unsigned record.

### Local validation in this execution

- Backend TypeScript build: exit 0.
- Disposable PostgreSQL staging suite: exit 0; 41 passed, 0 failed, 0 skipped. This is local migration/guard evidence, not hosted apply or recovery qualification.
- Retained disposable evidence: backend/node_modules/.cache/talgov-staging-7b3f5ac2be8e48918b049e4e1dccd899. Server log confirms shutdown at 2026-11-09 01:52:04.626 UTC+08:00; postmaster.pid is absent.
- node --test backend/test/media.test.cjs backend/test/local-staging-fixture.test.cjs: exit 0; 6 passed, 0 failed, 0 skipped (4 synthetic media checks plus 2 fixture guards). No hosted storage used.
- Better Auth and CMS workflow integration: prepared in STAGING_MIGRATIONS.md, not executed in this session. Hosted auth/CMS writes remain blocked.
- git diff --check reports existing Markdown hard-break trailing spaces in historical owner records. Those pre-existing bytes were preserved; newly inserted sections add no trailing whitespace.

### Inspected candidate SHA-256 (raw file bytes)

| File | SHA-256 |
|---|---|
| backend/scripts/r2-staging-migrate.cjs | c496b0aac80746a851605d432e45c06adedee1fe0da2926b76c87699a5b660ae |
| backend/scripts/staging/target.cjs | 27dc20130e0e2b04863c21fb5be49c7910990cc3d5fffa776cf496d4f037a68e |
| backend/scripts/staging/runner.cjs | cf000d75ed6967fadb9c89fecef66eeb7c3f3e614bd71b00e68566bae8dedda7 |
| backend/scripts/staging/catalog.cjs | 380493cdd853ec0397f46e96ea0ff39729f3320501974e5a5c967a23733063ea |
| backend/scripts/staging/target.json | 0aebfad186d737cdca3560767ac7af063f2eb91f5d1f8a2e144933c7facec856 |
| backend/scripts/staging/manifest.json | 1c5b6b19c7f61181e9627cf630aebae065ec8d9ca5b82ca5603f019123f58064 |
| backend/scripts/staging/catalog.json | 4689f00f3d6eab0ed894a258a62cc98d768ca991ed5e0bd7ea2807660175b5ff |
| backend/test/staging-database.integration.cjs | 75cb4e247b2272b7a94c791081bcab13b9b028483b4dad9571254dbd6a479c52 |
| backend/test/local-staging-fixture.cjs | e72ddaba3877bfdc85f314f8850e60a3c93e7df11ccec547dd76f45cbb7f7c4e |
| backend/test/local-staging-fixture.test.cjs | 851a2c3140ce9719b16782156e69417656e4b8aa52009d4e692ad9d7e9c66eed |
| backend/test/run-staging-database-tests.ps1 | 6ea6afd6691d592d2bb19e5ebb63d600c05d7ea841f16f8fd96fc2e95459605a |
| backend/test/staff-auth.integration.cjs | c427f6b8b44b1f28bdedaf75ab94da0b7c61959510036701705fc9b5347fda55 |
| backend/test/media.integration.cjs | 3b05005d631dcd4967bee21fd1930bab36e09a0baf466613448a21d504da73f6 |
| backend/test/media.test.cjs | 2477d4ef415a81864a3bdcb8db3f9cf34cea9270100cf47cb06c94c98f590edf |


## Final preflight preparation - 2026-11-09 (Asia/Shanghai, UTC+08:00)

**BLOCKED for the first hosted preflight. Preparation only; no hosted run.**
This dated assessment supersedes earlier outstanding-prerequisite summaries
where they still describe the supplied observations as missing. Historical
records and all unsigned approval gates remain intact.

### Supplied operator observations

Source: operator evidence supplied in the November 9, 2026 preparation request.
This is the date of receipt/recording, not an independently established inspection
timestamp. These observations were **not independently verified by this agent**.

| Observation | Operator-supplied result |
|---|---|
| Neon branch | `staging-talgov-r2` |
| Branch ID | `br-steep-sea-ao0qw05a` |
| Direct endpoint | `ep-sparkling-bird-ao5precf` |
| Database | `neondb` |
| Database owner | `neondb_owner` |
| Public schema owner | `pg_database_owner` |
| Migrator CREATE | `true` |
| Runtime CREATE | `false` |
| Restricted migrator TLS connection | Passed |
| Application tables | `0` |
| Global default PUBLIC function EXECUTE | Revoked |

The supplied CREATE observations do not specify every database/schema privilege
checked by the runner. They do not establish all role flags, memberships, TEMP,
grant options, other default ACLs, absence of TalGov schemas/history, or object
inventory. No new provisioning or ACL change is requested on the strength of
this documentation review. Attach protected source evidence and its actual
inspection timestamp to the existing authorization/review records.

### Local inspection and outstanding preflight prerequisites

Inspected the actual `backend/scripts/r2-staging-migrate.cjs`, staging
`target.cjs`, `runner.cjs`, `target.json` and `manifest.json` at HEAD
`2344709d6b1d721a27a95b66e14ec2fa184bea1d` plus the existing uncommitted work.
Target pins agree with the supplied branch, endpoint, database and database
owner. All five ordered migration SHA-256 values independently recomputed
locally over UTF-8 SQL normalized to LF match the existing manifest. This is
local integrity evidence, not either person's approval or a hosted result.

Only the following remain prerequisites for the first hosted preflight:

1. Complete the existing ALZA authorization record: project control/reuse,
   provisioning and empty-only isolation/scope acceptance with protected
   evidence; acceptance of the remaining exact metadata and role/ACL inventory
   required by the runner. Record any necessary renewed inspection authority
   before gathering missing hosted evidence. Do not repeat already reported
   provisioning merely because approval/evidence acceptance is pending.
2. Recovery owner and independent reviewer accept the empty baseline in
   `ROLLBACK_AND_RECOVERY.md`: authorized database/object inventory (including
   no TalGov schemas/history or staff state), baseline timestamp, retention,
   RPO/RTO, isolated recovery destination, failure-evidence preservation and
   escalation owner. Zero application tables alone does not close this gate.
3. Record affected-system-owner revocation/rotation and access-log review
   evidence for the historical credential incident, with ALZA security-owner
   acceptance; record the existing dependency/install-scope review disposition.
   Neither incident closure nor a fresh dependency audit is claimed here.
4. Two distinct people complete the preflight review rows in
   `STAGING_MIGRATIONS.md`, accepting the same candidate including hashes of
   uncommitted/untracked runner, test, target, manifest and catalog content,
   the five ordered SQL checksums, catalog baseline and existing local results.
5. Record named operator, escalation contact, maintenance/write and
   control-plane freeze windows, and separate dated hosted-read approval for
   this exact candidate/target (Neon metadata GETs and read-only PostgreSQL
   preflight with advisory lock). The November 8 inspection window has expired.
6. Arrange secure process injection of `R2_STAGING_DATABASE_URL` and
   `NEON_API_KEY`; current presence/values were not inspected. Use the pinned
   restricted migrator/direct host, `neondb`, port 5432 (explicit or default),
   `sslmode=verify-full` and `channel_binding=require`. No dotenv loading occurs.

| Existing gate | Satisfied? | Current evidence |
|---|---|---|
| Recovery | No - PENDING | Empty-table observation supplied; owner/reviewer acceptance and recovery checklist incomplete |
| Incident | No - PENDING | No recorded closure evidence and security-owner acceptance |
| Authorization | No - PENDING for preflight | Historical inspection approval expired; separate hosted-read decision and freeze records pending |
| Two-person review | No - PENDING | Both preflight review columns remain unsigned |

**Next exact operator action:** the ALZA owner and named reviewers complete the
existing records above and link the supplied observations to protected evidence.
Only after those gates are accepted, the named operator securely injects the two
variables and runs the [exact preflight command](STAGING_MIGRATIONS.md#exact-commands-repository-root-powershell).
Retain sanitized output, timestamp, exit status and reviewed candidate/target
references; expected empty-target result is
`{"mode":"preflight","applied":0,"pending":5}`. A failed check stops the handoff.
Successful preflight and separate apply approval/reviews are later apply gates,
not prerequisites for this first preflight. Runtime/storage qualification, real
LGU data and deployment remain outside this preparation.

No hosted connection/write, schema apply, migration SQL edit, secret read,
commit, push or deployment occurred. Existing work was preserved.

## Canonical continuation - 2026-11-09 (UTC+08:00)

**Local qualification PASS; hosted preflight/apply remain blocked.** This update
supersedes stale target/runner availability statements below, not historical
evidence or approval records. Canonical repository:
`C:\Users\admin\Documents\TalGov-Final-Backend-Migration`, branch
`feat/talgov-r2-staging-qualification`, HEAD
`2344709d6b1d721a27a95b66e14ec2fa184bea1d`, with uncommitted work.

The owner supplied verified project `misty-silence-69777617`, branch
`staging-talgov-r2` / `br-steep-sea-ao0qw05a`, endpoint
`ep-sparkling-bird-ao5precf`, database `neondb`, restricted migrator
`talgov_staging_migrator` and TLS 1.3 login verification. Local `target.json`
matches these identifiers; this continuation did not independently contact Neon
or reverify TLS, ownership, grants or empty state. Link the protected verification
evidence in the existing review record before hosted work.

The actual staging entry point is `backend/scripts/r2-staging-migrate.cjs`, with
`backend/scripts/staging/{target,runner,catalog}.cjs` and
`{target,manifest,catalog}.json`. The separate `r2-neon-target.cjs` is the
development selector, not this staging runner. Existing uncommitted target,
runner, manifest, catalog and recovery/runbook work was preserved.

Confirmed pilot fixes ported only to local test support:

- F-002: replace the assumption that the real target is unconfigured with an
  explicit null-field fixture, including individual missing-field rejection.
- F-003: stop accepting an arbitrary caller URL; bind the generated fixture to
  its local PID file, data directory, random cluster name and port. Verify live
  loopback server/database/session identity before test DDL. Start test processes
  with an allowlisted environment, excluding inherited database/Neon/Node settings.
  Test scratch files stay within the disposable cluster's cache directory.

Focused results from this candidate:

- `npm.cmd run build:tsc --prefix backend`: exit 0.
- `node --test backend/test/local-staging-fixture.test.cjs`: 2 passed, 0 failed.
- `backend/test/run-staging-database-tests.ps1`: exit 0; 41 passed, 0 failed,
  0 skipped (40 subtests plus the parent). Ran with synthetic hostile PG settings,
  hosted-looking test URLs, API token and Node preload setting in the parent;
  the test child confirmed their exclusion.
- PostgreSQL 18.6, fresh cluster `talgov-staging-96d6bba4fc104c9fa2de0b76ebedc9af`,
  bound only to `127.0.0.1:64706`; server log records clean shutdown and the PID
  file is absent. Local logs/data retained under `backend/node_modules/.cache/`
  for that cluster; no pilot caches or reports were copied.
- An initial integration invocation overlapped the unfinished build and failed
  before test execution with a missing compiled module. That cluster also stopped;
  the successful rerun above followed build completion.

No hosted Neon API or SQL access occurred during this continuation. Tests call
the core runner with verified local pools; metadata checks are pure fixtures,
and the CLI rejection test exits at its missing-approval guard before networking.
No credential inspection, migration SQL edits, hosted apply, harness execution,
commit, push or deployment occurred. Local synthetic migration replay is test
evidence only. The ALZA engineering harness was neither used nor modified.

Remaining prerequisites, in the existing authorization/recovery/review records:

1. Authorized administrator evidence of the migrator's **global** default
   function ACL revoking PUBLIC EXECUTE (no `IN SCHEMA` substitute), plus exact
   database/public ownership, restricted roles/memberships and grants required
   by the runner. TLS login success does not establish these ACL prerequisites.
2. Recovery-owner and reviewer acceptance of the empty staging baseline, with
   authorized inventory evidence, timestamp, retention, RPO/RTO, isolated recovery
   destination and failure-evidence preservation. Unexpected nonempty state stops
   this path; the protected-set path requires separate scope and restore evidence.
3. Historical credential incident disposition: affected-system owner evidence
   of revocation/rotation and access-log review, accepted by the ALZA security
   owner. No closure or waiver is inferred from staging isolation. Record the
   required dependency/install-scope review disposition without claiming a new audit.
4. Two distinct reviewers accept the exact candidate (including hashes of all
   uncommitted/untracked runner/test/target/manifest/catalog content), five ordered
   normalized-LF migration checksums, catalog baseline and these local results.
5. Dated ALZA decisions and evidence for any remaining provisioning, maintenance/
   write and control-plane freeze, named operators and escalation owner; renewed
   scoped inspection authority where needed and separate hosted-read preflight
   approval. The November 8 inspection window expired and was not apply approval.
6. Successful separately authorized preflight evidence; then separate written
   candidate/target/manifest-bound apply approval, window and both apply reviews.
   Runtime, storage, real LGU data and deployment retain their later scope gates.

**Next operator action:** have the ALZA owner/reviewers attach the supplied target
verification evidence and complete the missing ACL, recovery and incident records;
renew the necessary scoped authorization before any hosted inspection or ACL work.
After all preflight gates are accepted, the named operator may securely inject
credentials and run the documented `--preflight` under separate hosted-read
approval. Do not run `--apply` based on these local results.

## Historical readiness assessment

**Result: FAIL - staging qualification is not authorized or verified.**
**Scope:** backend and deployment readiness only. No database or object-storage
connection, migration, production write, deployment, secret inspection, or
credential value was used for this audit.

The current worktree is `feat/talgov-r2-staging-qualification` at `194c338`.
The available [final migration report](FINAL_BACKEND_MIGRATION_REPORT.md) is
dated 2026-11-07 and identifies `feat/talgov-final-backend-migration`; its
results are useful prior evidence, but are not qualification of this exact
branch/revision or of a hosted staging target.

## ALZA-owned empty staging scope

The project `talgov-r2` is owned and controlled by ALZA, as clarified by the
project owner for this documentation review. This is not live verification of
provider ownership, target identity, or authorization to connect or apply SQL.
For empty schema-only staging, ALZA's infrastructure owner authorizes inspection
and provisioning, ALZA's security/recovery owner accepts the empty baseline and
incident-closure evidence, and a named migration operator plus independent
reviewer review the exact candidate, target and checksums. Separate written
hosted-read and schema-apply decisions remain required; all records below remain
PENDING until supported by evidence.

This scope permits no real LGU records, official content, staff/session imports,
mail delivery, external integrations or deployment. Municipal/DPO/LGU IT
approvals apply separately to real LGU data, official content, production and
other work under their authority; they are not ownership prerequisites for
ALZA's independent empty staging infrastructure. Runtime/storage, deployment
and restore qualification remain open for their respective later stages. This
scope clarification governs the earlier broad qualification gates and historical
blocker summaries below; it waives no technical gate for schema apply.

## Gate summary

| Prerequisite | Status | Evidence / remaining work |
|---|---|---|
| Approved staging Neon project, branch, endpoint, region and owner | NOT VERIFIED | No staging identity or authorization was supplied. The checked-in `r2-neon-target.cjs` pins a development project/branch; it is not a staging selector. |
| PostgreSQL isolation and least privilege | NOT VERIFIED | Prior development testing covers synthetic data and separate roles. Confirm a fresh ALZA-approved empty schema-only target, non-production data, independent secrets, direct migration and pooled runtime identities, and role grants before connecting. |
| Object storage isolated from production | NOT VERIFIED | The app checks HTTPS endpoint shape and private ACL/policy. That does not prove which project/branch owns the bucket or credential. Verify bucket ownership, branch, private policy, credential scope and anonymous denial out of band. |
| Backend environment-variable names inventoried | PASS | Names and production requirements are listed below. Secret values and local/operator env files were not inspected; actual staging configuration is unverified. |
| Migration and rollback safety reviewed | PASS (static review) | Migration SQL is additive; the general migration CLI is loopback-only, dry-run by default, transactional, and checksum-guarded. Batch rollback deletes only unchanged rows in its own import receipt. These safeguards do not authorize a hosted target. |
| Staging-target migration path | FAIL | No staging-specific target guard or authorized migration procedure is evidenced. Existing Neon qualification scripts are pinned to the development target and can create databases or objects. Do not repoint or run them for staging. |
| Better Auth, MFA and staff RBAC | NOT VERIFIED (staging) | Local and isolated-development integration evidence exists. No end-to-end run against the authorized staging origin, roster, recovery mail or deployed cookie/proxy behavior is recorded. |
| Backup and restore | NOT VERIFIED (hosted) | Final-migration local restore covers 9 tables / 21 synthetic rows; Increment 2.1 also records development Neon logical DB restore. Staging encrypted DB/object restore, cross-project recovery, PITR and approved RPO/RTO remain unverified. |
| Startup and deployment packaging | NOT VERIFIED (hosted) | Runtime validation and `/api/health/ready` exist. Vercel packaging/native `sharp` and PDF-worker behavior, platform limits, real client-IP behavior and a staging smoke are outstanding. |
| Known security incident | FAIL | The final report records a production service-role JWT exposed in historical commit `356e294`, to be treated as compromised. Rotation/revocation and access-log review are not evidenced. Removing runtime references is not remediation. |
| Dependency security | NOT VERIFIED (current audit); FAIL (root lock against saved advisory) | Backend lock now pins `multer` 2.5.0 via scoped override; the saved 2-high audit predates this fix. Root lock still resolves 2.4.0. See reconciliation below; no current zero-finding audit or risk acceptance is claimed. |
| External approvals and operational controls (broader qualification/release) | FAIL | Municipal content/hosting decisions, DPO privacy/retention approval, LGU IT/security recovery and monitoring approval, and dated release/rollback ownership remain outstanding. |

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
3. For empty schema-only qualification, obtain the ALZA decisions in the
   authorization record below and name migration/recovery operators. Obtain
   municipal content/hosting, DPO privacy/retention and LGU IT/security approvals
   separately before work within their applicable data, deployment or release scope.
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

1. Obtain written authorization and a verifiable ALZA-owned staging project/
   branch/bucket identity plus stage-only access process. No live connection
   is allowed before this.
2. Have the authorized security owner remediate the historical credential
   exposure and review access logs; close or formally disposition dependency
   advisories.
3. Obtain the scoped ALZA staging approvals below; retain municipal, DPO and
   LGU IT/security approvals for their separately applicable scope.
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

The authorized operator must inspect this existing project first, confirm ALZA
authority and permission to use it, and record a dedicated non-default staging branch
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

1. ALZA infrastructure owner authorizes dated, scoped control-plane inspection
   of the existing project and identifies production resources. Security owner
   separately authorizes credential revocation/rotation and log review for the
   historical exposure; retain sanitized incident closure evidence.
2. ALZA infrastructure owner approves branch/endpoint creation, cost/expiry,
   role provisioning and secret distribution for empty schema-only staging.
   Private storage, data use and mail tests require separate applicable approvals;
   no real LGU data or external integrations are included in this path.
   Operator then creates the isolated resources and records IDs plus ownership
   and negative-access evidence from the gates above. No live imports assumed.
3. Backend/security reviewer verifies current audits, install scope, candidate
   checks and the staging-specific migration procedure. ALZA recovery owner
   approves the empty baseline, recovery target and RPO/RTO for this scope; named migration operator and
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


## Staging migration runner implementation - 2026-11-08

Local implementation and disposable PostgreSQL 18 safety tests: PASS. Hosted
staging readiness remains FAIL; no hosted migration or connection was performed.

Added a dedicated staging-only CLI, immutable ordered SHA-256 manifest, live
Neon API target verification, explicit apply acknowledgment, advisory locking,
atomic five-migration/history transaction and catalog/privilege drift checks.
Preflight defaults to a read-only transaction. Existing SQL, development runners,
production source and frontend are unchanged. The staging branch/endpoint/owner
allowlist remains unset because no approved staging identity was supplied; the
CLI fails closed before connecting. See [operator instructions](STAGING_MIGRATIONS.md)
for prerequisites, exact commands, approval boundaries and nondestructive recovery.

Validation: backend TypeScript build and 12/12 local Node tests passed (11 safety
subtests plus suite). Coverage includes ordered success, repeat execution, changed
file/history rejection, concurrency, late metadata and fifth-migration SQL failure
rollback, wrong target/owner, missing approval, drift, unsafe roles and fixed-log
redaction. No synthetic LGU records were inserted. Hosted qualification, external
authorization, recovery proof and all other readiness blockers remain outstanding.

All 35769 pre-existing report bytes preserved (SHA-256
2118e601fc685157261501446d2314ca28447c666f452c42a52c39462a045ebf).

## Neon restricted migrator compatibility - 2026-11-08

Local verification: **PASS, 39 tests passed / 0 failed / 0 skipped** (38
subtests plus parent), disposable loopback PostgreSQL 18.6. Hosted readiness
remains **FAIL / NOT VERIFIED**. This supersedes the previous database-owner
migration model only; previous audit evidence and other blockers remain intact.

`databaseOwner` is pinned to `neondb_owner`; `migrationLogin` is separately
pinned and must match URL username, session_user and current_user. Public schema
ownership must remain `pg_database_owner`. The restricted migrator receives
CONNECT/CREATE on the database and USAGE/CREATE on public without grant options,
and owns the TalGov objects. Elevated flags, memberships, unsafe database/schema
grants and non-owner default ACL recipients are rejected. Missing global
function ACL rows are evaluated through PostgreSQL's built-in defaults; PUBLIC
EXECUTE must be revoked globally, not merely per schema.

All five unchanged migrations apply and repeat idempotently against the unchanged
catalog baseline. Tests cover ownership and session substitution, URL username,
all elevated migrator flags, memberships, CREATE/TEMP and grant-option drift,
missing global defaults (including ineffective schema-local revoke), runtime SQL
permission denials, catalog drift, checksum/history protection, advisory locking,
late verification failure and fifth-migration SQL failure atomic rollback.
Node syntax checks and git diff --check also passed. An initial expanded test
fixture failed after ownership transfer removed explicit grants; its restoration
was corrected, and the final complete suite passed without weakened assertions.

Changed in this increment only: staging `runner.cjs`, `target.cjs`, `target.json`,
`backend/test/staging-database.integration.cjs`, `STAGING_MIGRATIONS.md`, and this
appendix. Existing work was retained. No frontend, production backend, migration
SQL, manifest, or catalog baseline edits were made. No hosted connections, hosted
role provisioning/SQL, commits, pushes or deployments were performed. Role and
SQL writes occurred only within the explicitly requested disposable local tests.

Next manual steps are specified in [STAGING_MIGRATIONS.md](STAGING_MIGRATIONS.md):
obtain approvals, pin the isolated staging identity/migrator, verify managed
ownership, provision restricted roles/grants, globally revoke migrator default
PUBLIC function EXECUTE, inject secrets securely, then obtain hosted preflight
and separate apply authorization. No hosted step was performed here. Target
branch/endpoint/host/migrationLogin remain unset and fail closed. Recovery proof,
storage/runtime isolation, incident closure, packaging and municipal/DPO/IT
approval gates remain outstanding.

## Staging authorization record - preparation 2026-11-08

**INSPECTION ONLY AUTHORIZED.** All provisioning, credential changes, hosted preflight, migration apply and deployment approvals remain PENDING. This is the non-secret index of
external written decisions, not a signature or approval. Record evidence IDs or
access-controlled references, approver name/role, decision, date/time with timezone,
scope and expiry for every approval. Never store credentials, connection URLs or
secret-manager values here. Unverified entries remain PENDING.

| Required decision / evidence | Record |
|---|---|
| ALZA infrastructure-owner authority and named infrastructure operator; authorization for scoped control-plane inspection and identification of production/development resources | APPROVED — See "ALZA — Neon Staging Inspection Authorization" below. |
| Existing project `misty-silence-69777617`, organization `org-patient-mud-50407342`, region `aws-ap-southeast-1`: ALZA control, entitlement and reuse approval (repository pins only; live evidence still required) | PENDING |
| Provisioning approval: exact `staging-talgov-r2` branch, direct endpoint, restricted roles/grants, cost, expiry/cleanup owner and secret-distribution process | PENDING |
| Approved/created branch ID, non-default status, direct endpoint ID/hostname, migrationLogin and ownership/isolation evidence; distinct from production and development | PENDING |
| ALZA scope acceptance: empty schema only, no real LGU data or official content, no staff/session imports, no mail or external integrations; independent staging secrets and disabled external jobs | PENDING |
| ALZA security owner: acceptance of historical credential incident closure, with revocation/rotation and access-log review evidence from the authorized affected-system owner; reviewer disposition of current dependency audits/install scope and candidate checks | PENDING |

### ALZA Staging Security Disposition — November 9, 2026

**Security owner:** AJ Rienze Josol — ALZA CTO

#### Neon staging administrator credential

- **Affected role:** `neondb_owner`
- **Affected environment:** `staging-talgov-r2`
- **Issue:** Previous connection credential was exposed during development assistance.
- **Action:** Infrastructure owner reports that the password was rotated.
- **Verification:** A subsequent TLS-verified administrator login was successful.
- **Evidence:** Owner confirmation and sanitized PostgreSQL connection results.
- **Status:** ROTATION REPORTED — provider-side revocation timing and access-log review not independently verified.

No credentials or connection strings are retained in this document.


#### Dependency and installation-scope disposition

**Available evidence:**
- Root dependency cleanup completed in the staging qualification branch.
- Root production dependency audit previously reported zero findings.
- Backend production dependency audit previously reported zero findings.
- Existing staging integration tests passed 41/41.
- Backend build passed.

**Scope limitations:** These results are historical verification evidence for the recorded candidate. They do not establish that all development dependencies, deployment artifacts or future package versions are vulnerability-free.

**Decision:** PENDING — security owner must review the existing audit results, exact candidate revision and deployment installation scope before acceptance.

**Production security qualification:** NOT CLAIMED.

| ALZA recovery owner: verified empty baseline, protected failure/recovery evidence, approved RPO/RTO and isolated recovery target; see recovery checklist below | PENDING |
| Maintenance/write-freeze and control-plane-freeze window: start/end with timezone, enforcing owner, affected resources, stop/escalation contact | PENDING |
| ALZA separate hosted-read approval: named operator, exact target/candidate, validity window, fixed-origin Neon metadata GETs and direct PostgreSQL read-only preflight including advisory lock | PENDING |
| ALZA separate migration apply approval: exact reviewed target/manifest/candidate and execution window; never implied by provisioning or hosted-read approval | PENDING |

Use [the recovery-baseline checklist](ROLLBACK_AND_RECOVERY.md#staging-recovery-baseline-checklist)
and [the two-person migration review](STAGING_MIGRATIONS.md#two-person-staging-migration-review)
as the records for those gates; do not create duplicate approval files.

**Provisioning handoff:** obtain the scoped inspection authorization first, then
ownership/isolation evidence and explicit ALZA provisioning, empty-scope and
security decisions above. Incident closure remains required; ALZA cannot sign
for remediation on systems it does not control. Only an authorized administrator may create resources or roles.
Record the resulting non-secret IDs and provisioning evidence here. This task
does not perform or authorize that handoff.

**Hosted-read handoff:** complete the recovery baseline, freeze and two-person
review; verify provisioning/least-privilege evidence; have the authorized operator
pin the approved identity in `backend/scripts/staging/target.json`; inject
`R2_STAGING_DATABASE_URL` and `NEON_API_KEY` through the approved secret manager.
Obtain the separate hosted-read decision above before running the runbook's
`--preflight`. Retain sanitized output, timestamp, exit status and exact candidate/
target references here: **PENDING**. An empty target must report five pending
migrations; this is not permission to apply. Any failed/missing gate stops work.
Broader staging qualification and release blockers in this report remain open.

**Exact next operator action:** the ALZA infrastructure owner records a dated,
scoped inspection authorization in the first PENDING row above, naming the
operator, existing project/organization, permitted metadata/database inventory,
validity window and protected evidence reference. This permits only the stated
inspection, not provisioning or schema apply. Then follow the provisioning and
hosted-read handoffs in order, preserving incident closure, empty-baseline and
two-person checksum gates. After successful authorized preflight, obtain the
separate target/manifest/candidate-bound ALZA apply decision and both apply
reviews before invoking `--apply`. No approval is supplied by this document.


## ALZA — Neon Staging Inspection Authorization

**Date:** November 8, 2026 (Asia/Manila)<br>
**Authorizing authority:** ALZA Infrastructure Owner<br>
**Owner:** AJ Rienze Josol<br>
**Authorized operator:** AJ Rienze Josol / Codex under owner supervision

**Project:** `misty-silence-69777617`<br>
**Organization:** `org-patient-mud-50407342`<br>
**Branch:** `staging-talgov-r2`<br>
**Expected branch ID:** `br-steep-sea-ao0qw05a` (subject to verification)<br>
**Database:** `neondb`

**Authorization window:** November 8, 2026, 22:00–23:59 PHT (UTC+08:00), subject to confirmation that the window is still active.

**Permitted operations:** Authenticated Neon project/branch/endpoint metadata inspection, read-only PostgreSQL role and grant inspection, schema inventory and empty-baseline verification.

**Prohibited operations:** Database writes, password changes, DDL, schema migrations, accessing or importing real LGU records, deployment and production changes.

**Evidence reference:** `docs/r2/STAGING_READINESS.md` — owner-authorized staging inspection record.

**Approval status:** APPROVED — explicitly authorized by AJ Rienze Josol, ALZA Infrastructure Owner, on November 8, 2026.
## Read-only staging inspection attempt - 2026-11-08

**Result: STOP - missing access. No hosted inspection performed.**

Authorization checked at 2026-11-08 23:19:45 PHT (15:19:45 UTC).
The ALZA inspection record explicitly names AJ Rienze Josol as infrastructure
owner and AJ Rienze Josol / Codex under owner supervision as operator, specifies
metadata, role/grant, schema and empty-baseline inspection, and limits validity
to 2026-11-08 22:00-23:59 PHT. The window was active at verification. This agrees
with the authorization table's APPROVED inspection row. The separate hosted-read
preflight, provisioning and apply decisions remain PENDING; none was inferred.

Document-authorized identifiers (not live-verified): project
`misty-silence-69777617`, organization `org-patient-mud-50407342`, branch name
`staging-talgov-r2`, expected branch ID `br-steep-sea-ao0qw05a`, database `neondb`.
The local target.json agrees on project, organization, branch name and database;
branch ID, endpoint ID, host and migrationLogin remain null. No target pins changed.

Presence-only process-environment checks found NEON_API_KEY and
R2_STAGING_DATABASE_URL both absent. No Neon connector was exposed in this session.
The installed Neon CLI and psql do not establish authenticated access. No credential
values, local credential stores or environment-file contents were inspected.
Stopped before any hosted API request or PostgreSQL connection.

Verified hosted target identifiers: none. Project/organization ownership, branch
identity/isolation, direct endpoint, database/schema ownership, roles/grants and
empty-data baseline all remain NOT VERIFIED. Required access must be supplied
through the approved secure mechanism and authorization must still be active
before another attempt. No credential changes, provisioning, DDL, migrations,
deployments, commits or pushes were performed. This appendix records only local
checks and does not advance any pending authorization or readiness gate.


### Neon staging empty-baseline inspection — November 9, 2026

**Project:** misty-silence-69777617<br>
**Branch:** staging-talgov-r2<br>
**Branch ID:** br-steep-sea-ao0qw05a<br>
**Endpoint ID:** ep-sparkling-bird-ao5precf<br>
**Database:** neondb<br>
**Inspection account:** talgov_staging_migrator

**Observed results:**
- Secure PostgreSQL connection established using TLS 1.3.
- Current database and migrator identity verified.
- Application tables found: 0.
- Global default function EXECUTE privileges revoked from PUBLIC for migrator-created functions.

**Recovery status:** PENDING — empty-table inspection completed, but protected recovery baseline, recovery destination, retention and RPO/RTO still require verification and acceptance.

**Schema migration status:** NOT STARTED.

**Scope:** ALZA-owned staging only. No production changes or real LGU data.


### Legacy Supabase Decommissioning — November 9, 2026

**System:** TalGov legacy Supabase project<br>
**Security owner:** AJ Rienze Josol — ALZA CTO

**Owner-reported action:** The legacy TalGov Supabase project has been deleted.

**Credential disposition:** The historical Supabase service-role credential is expected to be unusable following completed project deletion. Provider-side deletion confirmation and credential invalidation have not been independently verified.

**Historical exposure:** A previously exposed service-role credential was documented in the repository history. Historical unauthorized access has not been ruled out.

**Access-log review:** NOT VERIFIED — historical logs may no longer be accessible after project deletion.

**Evidence:** Owner confirmation. Supabase project-deletion confirmation or provider record to be attached if available.

**Security decision:** PENDING — ALZA security owner to accept the documented residual risk after reviewing available evidence.

**Production readiness:** NOT CLAIMED.`