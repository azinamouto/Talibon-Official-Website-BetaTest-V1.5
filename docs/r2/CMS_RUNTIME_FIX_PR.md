# Fix CMS dependency errors and attachment recovery

CMS uploads and publication exposed the same ambiguous 503 for missing dependencies and uncertain results. Preserve trusted failure classifications through the HTTP boundary, show fixed recovery guidance and request references, and normalize lost or malformed responses into the existing retry flow. Reject malformed upload metadata and mismatched attachment IDs before constructing publication requests.

Existing module forms retain inline uploads, preview and one Publish action. File/submission identities, MFA, RBAC, private storage, file validation, atomic audits and publishing authorization are preserved. No migrations or hosted configuration are changed.

| Validation | Result |
| --- | --- |
| Backend and disposable PostgreSQL evidence carried forward for unchanged runtime source at `c094008` | 284 Node tests, four Jest tests in one suite, 40 database tests passed; builds/lint passed |
| Fresh frontend Node / React checks | 17 / 163 tests passed; existing coverage thresholds passed |
| Fresh strict browser gates | 200 release tests including 42 CMS cases; admin 10, contracts 10, login/recovery 21, e-services 23 plus one explicit disabled-payments check; zero skips/issues |
| Fresh integration checks | 17 operations tests, OpenAPI snapshot, runtime exclusion across 526 source/build files, whitespace check passed |
| Dependency audit | Root/frontend and backend production: zero vulnerabilities; unchanged backend development tree: 25 moderate package findings, zero high/critical |

Unchanged layout tests initially hit local deadlines under concurrent verification. Focused/serial verification and the final full coverage run passed without removing assertions or changing repository test settings. Detailed commands, results and hosted limitations: `docs/r2/CMS_RUNTIME_FIX_HANDOFF_2026-11-19.md`.

Hosted acceptance remains pending. Earlier read-only evidence identifies missing 003/004 CMS dependencies and attachment grants; current catalog refresh and exact POST 503 log correlation remain unavailable. This source patch cannot provision those dependencies. Any staging SQL, configuration update, merge or deployment requires separate approval.
