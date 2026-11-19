# Fix CMS dependency errors and attachment recovery

CMS uploads and publication exposed the same ambiguous 503 for missing dependencies and uncertain results. Preserve trusted failure classifications through the HTTP boundary, show fixed recovery guidance and request references, and normalize lost or malformed responses into the existing retry flow. Reject malformed upload metadata and mismatched attachment IDs before constructing publication requests.

Existing module forms retain inline uploads, preview and one Publish action. File/submission identities, MFA, RBAC, private storage, file validation, atomic audits and publishing authorization are preserved. No migrations or hosted configuration are changed.

Validation: focused runtime/editor checks, disposable PostgreSQL CMS lifecycle tests, all CMS browser lifecycle tests, builds, lint and API contract verification. Detailed results and hosted limitations: `docs/r2/CMS_RUNTIME_FIX_HANDOFF_2026-11-19.md`.

Hosted acceptance remains pending. Earlier read-only evidence identifies missing 003/004 CMS dependencies and attachment grants; current catalog refresh and exact POST 503 log correlation remain unavailable. This source patch cannot provision those dependencies. Any staging SQL, configuration update, merge or deployment requires separate approval.
