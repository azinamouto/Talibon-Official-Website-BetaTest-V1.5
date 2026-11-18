# TalGov R2.1 hosted inline upload investigation

Source-only branch: `fix/r21-upload-dependency-diagnostics-20261119`. Base: `8e32c388b9b1f33bf9084e367c5d405f133b67a0`. Source/test commit: `60e307161fa94fb31a3485a22aae595eb822c500`. Documentation is committed separately. Existing worktrees and edits are preserved.

## Confirmed findings and correlation limit

The inspected staging database still cannot support the deployed direct upload workflow. Both approved defaults, `website-photos` and `website-documents`, are absent. The only category is the unapproved historical `r2-qualification` document category. An inline upload omits a category ID and the server resolves the default using the verified file type. The existing repair correctly converts an unavailable default into 503. A valid PNG close to the reported size reproduces that failure locally, before reservation or object PUT.

**The exact reported POST /api/admin/media/uploads is unverified.** Its response request ID, timestamp and Vercel runtime entry are unavailable. No Vercel connector or local credentials were available, and a secure credential request received no response. The current database defect is sufficient to produce this response, but it does not prove which dependency failed in the existing request. Neither the earlier 42501 nor a storage failure can be attributed to that request.

The [sanitized read-only evidence](HOSTED_UPLOAD_READ_ONLY_EVIDENCE_2026-11-19.json) records observations in UTC, corresponding to November 19 in Asia/Shanghai (UTC+08:00).

| Dependency | Read-only finding |
| --- | --- |
| Intended target | Project `misty-silence-69777617`, branch `br-steep-sea-ao0qw05a` / `staging-talgov-r2`, database `neondb`, endpoint `ep-sparkling-bird-ao5precf` |
| Media database | Required media INSERT/UPDATE column privileges, throttle permissions, revision INSERT, audit INSERT and authorization row-lock privileges are present for `talgov_staging_runtime`. Whole-table media INSERT/UPDATE false is expected because grants are scoped to columns. |
| Runtime safeguards | Restricted runtime membership, no elevated role flags or database/schema CREATE/TEMP rights. RLS is disabled on the inspected upload tables; backend authorization remains required. No permissions or policies were changed. |
| Schema | Media source remains NOT NULL; publisher columns, publication receipts and functions are absent. The ledger contains the six original foundation/auth/media/content files. Municipal 003 and direct publication 004 are absent. |
| Separate publishing defect | Runtime lacks SELECT/INSERT/DELETE on `content_asset_links`. Inline upload does not query that table. Its grant alone cannot fix upload or the missing direct publication schema. |
| Neon Storage | Enabled in ap-southeast-1 with private bucket `talgov-staging-media`. Existing storage credential metadata has read/write scopes. Actual Vercel credential and database bindings remain unverified. |
| Existing storage logs | Eighteen records show GET 200/404 pairs, with no PUT in the returned window. Operation details needed to distinguish ACL/policy calls are unavailable. NoSuchBucketPolicy normally returns 404 and is accepted by the adapter. These are not matched Vercel upload logs. The empty pg_endpoint lookup is not evidence that PostgreSQL errors were absent. |
| Deployment | GitHub associates current main with a successful Vercel status at 2026-11-18T20:22:51Z. Canonical alias assignment and environment bindings were not independently verified. |
| Read-only controls | One new GET liveness returned 200 and one GET readiness returned 503. Their IDs and timestamps are separately labelled in evidence; neither belongs to the failed upload. |

Official Neon documentation confirms [GetBucketAcl and GetBucketPolicy support](https://neon.com/docs/storage/s3-compatibility) and [branch-scoped storage credentials](https://neon.com/docs/storage/authentication). No storage SDK replacement or permission relaxation is justified by this evidence.

## Source repair and transaction behavior

MediaService now records the request-local upload stage and dependency, server UTC timestamp, request ID, and deployment ID when available. SQLSTATE and confirmed database transaction outcomes remain intact. Known storage denial, authentication, missing bucket/object, timeout and unsupported-operation errors receive fixed classifications only in storage upload stages. Other authentication/database diagnostics retain their existing classification behavior.

Storage configuration 503 exceptions are logged before being rethrown. Malformed endpoint URLs become sanitized configuration failures. Private ACL/policy checks, byte limits, full MIME/signature/parser validation, SHA256 verification, rate limiting, Better Auth, MFA, RBAC and immutable audits remain enforced. Ordinary forms retain one Publish action and the existing recovery messages.

Upload phases remain: database/storage configuration → live authorization/throttle → file validation → private bucket verification → durable reservation with creation audit → PUT → readback/checksum → readiness with revision/update audit. No transaction boundary was changed.

A reservation failure confirms rollback and occurs before PUT. A PUT/read/checksum failure can leave a pending reservation and an object; attached count 0 does not establish absence of either. Readiness failure rolls completion, revision and update audit back while preserving the earlier reservation. An uncertain commit outcome remains unknown. Retrying identical metadata/bytes with the same upload ID preserves one file, revision and readiness audit; changed input conflicts.

## Exact minimal hosted repair proposed

For the confirmed six-file baseline, apply the unchanged [003_municipal_content_foundation.sql](../../backend/database/migrations/003_municipal_content_foundation.sql), then [004_direct_staff_publication.sql](../../backend/database/migrations/004_direct_staff_publication.sql), in one reviewed transaction using the direct endpoint and `talgov_staging_migrator`.

003 adds municipal schema and scoped link rights. 004 supplies the approved photo/PDF defaults, optional supporting evidence, protected publisher authority, receipts, functions and public visibility rules. A category-only insertion leaves the required source constraint in place. No historical qualification category, source, audit or content record needs deletion or approval.

Normalized LF SHA256:

- 003: `455c81c7d511c2bf0bdbc45b3bf2ff9d78c5e180fc4ee9b150d05f5fc056a0b7`
- 004: `755577d2f635f2c6eebb8a08c2a6c859664cc8ef24f968e421a092ad0165a411`

Proposed command only; **not executed**:

```powershell
# First verify this private in-memory URL identifies only the pinned target,
# migration login, direct endpoint, verify-full TLS and required channel binding.
psql -X -v ON_ERROR_STOP=1 --single-transaction --dbname="$taskCmsMigrationUrl" -f backend/database/migrations/003_municipal_content_foundation.sql -f backend/database/migrations/004_direct_staff_publication.sql
if ($LASTEXITCODE) { throw 'Upgrade failed; inspect transaction outcome before retrying.' }
```

Before approval, confirm the deployed bindings, refresh catalog drift and establish approved backup/restore readiness. Keep the existing six-file ledger intact and record the reviewed CMS files, digests and operation result separately. These SQL files are not a replayable patch; do not rerun them on an upgraded schema.

Hosted actions requiring separate approval:

1. Apply 003/004 to the verified staging target after the backup/preflight checks.
2. Correct Vercel database/storage variables only if binding inspection proves a mismatch. Expected storage region is ap-southeast-1 and the bucket is the existing private staging bucket. No storage credential change is currently justified.
3. Merge and deploy the source diagnostic repair to staging. Git deployments are disabled in repository configuration; PR creation performs no deployment.
4. Perform acceptance using an approved real file/content and genuine staff MFA session, verifying upload, one Publish action, public visibility and retry identity. No hosted upload retry or fabricated official content was used here.

## Local verification

| Check | Final result |
| --- | --- |
| Backend build/lint | Passed |
| Backend Node / Jest | 280 / 4 passed |
| Disposable PostgreSQL direct publishing/upload suite | 40 passed, zero skipped |
| Focused editor React tests | 18 passed |
| Frontend typecheck / production build | Passed; existing chunk-size/mixed-import warnings remain |
| OpenAPI snapshot | Passed; API contract unchanged |
| Operations / runtime exclusion | 17 passed / 526 files checked |

The new diagnostic suite has 16 checks, included in the 280 Node total. Nine failed against the original source, confirming missing stages/configuration diagnostics. Final tests distinguish category configuration from injected 42501, storage denial/timeout/missing-object and checksum failures. They verify no later effects after failure, redaction, concurrent trace isolation, expected no-policy 404 and unchanged validation/throttle statuses.

The database regression uses a valid synthetic PNG close to the reported size and passive PDF/JPEG fixtures. It verifies missing defaults, migration rollback/history preservation, an injected readiness INSERT denial with rollback, identical recovery, one revision/audit, PNG publication with news and public download, all module lifecycles, immutable audits/receipts, MFA/RBAC and retired API boundaries. All writes use fresh loopback PostgreSQL and fake storage. Editor checks preserve form content, files and the same retry UUID.

Commands: `npm --prefix backend run build`; `npm --prefix backend run lint`; `node --test --test-timeout=120000 backend/test/*.test.cjs`; `node backend/node_modules/jest/bin/jest.js --config backend/jest.config.cjs --runInBand`; `powershell -NoProfile -File backend/test/run-staging-database-tests.ps1 -TestFile direct-publication.integration.cjs`; `npm --prefix frontend run test:react -- test/react/cms-upload.test.tsx`; frontend lint/build; OpenAPI check; operations tests and `node ops/check-runtime.mjs --artifacts`.

Changed files: media.service.ts, failure-diagnostics.ts, neon-object-store.ts; media-upload-diagnostics.test.cjs and direct-publication.integration.cjs; this report and the sanitized evidence JSON. No migration, frontend, environment, deployment or permission definition was modified.

## Minimum evidence still needed

Recover the existing upload response X-Request-Id/JSON requestId and timestamp with timezone, plus a matching sanitized Vercel entry containing method/path/status, deployment ID, failure classification/phase and transaction outcome. If the response is no longer retained, an operator can search existing deployment logs with an approximate failure-time window and the confirmed POST path. No new upload is necessary. Do not substitute the health-check IDs, storage-log timestamps or the earlier 42501 for that evidence.
