# TALGOV R2 Increment 4 report

## Result

Increment 4 is complete on `feat/talgov-r2-increment-4`. The implementation commit is `54b6f961f4f65e7c16850d28958639c4be68c679`; work began at `901066f7f6eedc27087634e5cc8a0fd6ad2bd37f`. No production migration, source export, push, merge, or deployment was performed. No Increment 5 work was started.

The application now uses private Neon Object Storage through the AWS S3 SDK, with PostgreSQL metadata, upload recovery state, checksums, immutable revisions and audit events. The staff CMS supports photo/document upload, metadata editing, publication controls, preview, download and logical deletion. Better Auth, live session checks, role enforcement and MFA remain required for privileged operations; deletion requires a freshly verified administrator session. Public reads are limited to approved, published, ready records and proxy verified bytes without issuing storage URLs.

Files are validated server-side. Images must fully decode within the pixel/frame limits; PDFs are parsed in a resource-limited worker and active content is rejected. Downloads verify size and SHA-256 and use safe attachment/no-store/nosniff headers. Upload retry is bound to the same staff/upload UUID and exact content. Pending rows preserve recovery state; unpublish blocks subsequent public reads, and logical deletion retains the private object for operator recovery.

The implementation adds an additive, checksum-tracked media policy and isolated tooling for schema application, provider qualification, reconciliation and source-transfer validation. Existing reviewed category/source records are used; no municipal seed data or source approvals were fabricated. The details and operator procedures are in [MEDIA_OPERATIONS.md](./MEDIA_OPERATIONS.md).

## Verification evidence

All commands below completed successfully unless an audit reports remaining advisories. Database/browser checks use disposable or mocked integrations unless explicitly identified as live development storage; they are not production qualification.

| Command / check | Result |
|---|---|
| `npm --prefix backend test` | 54 Jest tests passed; Node suite: 101 passed, 0 failed, 4 existing TODOs. |
| `npm --prefix backend run test:media:db` | 8 passed, 0 failed, including the PDF-specific HTTP API test. Disposable PostgreSQL and mocked object-store I/O. |
| R2 disposable database suite (`npm --prefix backend run test:r2:db`) | 12 passed, 0 failed; logical backup/restore evidence covers 9 tables and 21 rows. |
| Isolated Neon development-branch qualification | 4 checks passed: private ACL/policy, SDK upload/read SHA-256 round trip, anonymous read denied (403), and synthetic object deletion/absence. |
| `npm --prefix backend run lint` | Passed. |
| `npm --prefix backend run contracts:check` | Passed. |
| `npm --prefix frontend run build` | Passed; Vite emitted a large-chunk advisory only. |
| `npm --prefix frontend run lint` | Passed. |
| `npm --prefix frontend run test:react` | 52 passed. |
| `npm --prefix frontend test` | 21 passed, 0 failed. |
| `npm --prefix frontend run test:browser` | 25 passed. |
| `npm --prefix frontend run test:admin` | 5 passed. |
| Targeted media browser suite | 2 passed. |
| `npm run test:ops` | 9 passed, 0 failed. |
| `git diff --check` | Passed before commits. |

Primary logs are in [evidence/increment-4/](./evidence/increment-4/), including `backend-tests-final.log`, `media-api-pdf-final.log`, `r2-db.log`, `storage-live.log`, `backend-lint-final.log`, `contracts-final.log`, `frontend-build-final.log`, `frontend-lint-final.log`, `frontend-react-final.log`, `frontend-node.log`, `browser-final.log`, `admin-browser.log`, `media-browser-final.log`, and `ops.log`. Current production-only audit JSON is recorded in `audit-root-prod-final.json`, `audit-backend-prod-current.json`, and `audit-frontend-prod-final.json`.

The PDF API test exercises rejected active PDF content, valid PDF upload, draft privacy, unauthenticated denial, storage privacy failure, safe verified private/public downloads, and publish/unpublish behavior. It passed as part of the final 8-test media API run.

## Dependency advisories

Compatible dependency updates were applied without force-upgrading major versions. A fresh production-only audit after the updates reports:

| Manifest | Remaining advisories | Notes |
|---|---:|---|
| Root | 3 (2 high, 1 moderate) | `@nestjs/platform-express`/transitive `multer` and `esbuild`; npm's suggested fixes require a major version change. |
| Backend | 4 (2 high, 2 moderate) | `@nestjs/platform-express`/`multer` and `@nestjs/swagger`/`js-yaml`; suggested fixes require major version changes. |
| Frontend | 0 | No production advisories. |

The root and backend totals are separate dependency trees and overlap; do not add them together as unique findings. Audit commands were `npm audit --omit=dev` at the repository root, `npm audit --omit=dev` in `backend`, and `npm audit --omit=dev` in `frontend`. The first two exit nonzero because advisories remain. Major upgrades were not attempted because they are not compatible, low-risk lockfile-only fixes.

## Production blockers and qualification boundary

- No combined hosted staging qualification of the Better Auth/MFA flow, backend, browser CMS and Neon Storage has been completed.
- No production source export/import, metadata cutover, production credentials change, production migration or deployment was run.
- Hosting still needs verification for packaging `sharp` and the PDF worker/parser, plus resource limits under the target runtime.
- Operations must approve and test backups/restores, retention and purge, malware scanning, credential scope/rotation/revocation, budget limits and incident procedures.
- The remaining major-version dependency upgrades need a separately tested compatibility effort.
- Four existing payment/webhook TODO tests remain deferred; payment and e-services are outside Increment 4 and remain inactive.

The live storage checks used an isolated development branch and synthetic data; browser suites intercept API responses. Neither is evidence of production readiness. Production qualification requires the blockers above to be resolved and an explicitly approved release process.
