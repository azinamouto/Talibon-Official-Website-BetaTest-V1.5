# Protected staging origins and acceptance boundaries

`STAFF_AUTH_DEPLOYMENT_ORIGIN_ENABLED=true` is supported only in the isolated Vercel staging project's Production environment. The implementation requires `NODE_ENV=production`, `VERCEL=1`, project `prj_bi8GqnCkvRLBz850HiJKU5RRhXq8`, both Vercel environment identifiers equal to `production`, and the attested `VERCEL_URL` matching the project's unique deployment hostname pattern.

Better Auth and mutation CSRF checks use one exact HTTPS origin from this validated platform configuration. They do not trust request Host, Origin or forwarded headers to construct it. Cookies remain host-scoped; moving to another deployment hostname requires a fresh session. Ordinary production keeps the configured hostname restrictions. Password email recovery stays disabled unless an approved provider and both explicit recovery flags are configured; TOTP and backup-code authentication remain available.

Preserve Vercel Authentication and zero bypass tokens. Acceptance needs a browser that has passed Vercel Authentication for the unique deployment URL, then website staff authentication and MFA separately. A plain automated client cannot establish application qualification through deployment metadata or a protection response. Never disable protection or create a bypass token for a test.

No hosted application requests, account writes, storage writes or configuration changes were performed for this GitHub integration. READY and a successful build are not runtime-role proof. The existing staging administrator and consumed bootstrap marker must remain untouched.

Future hosted acceptance requires separate approval for each bounded scope:

| Scope | Required evidence and effects |
| --- | --- |
| Runtime role | One approved clean public GET, with automatic throttle cleanup and UPSERT acknowledged; collect a fresh sanitized `runtime_role_guard_accepted` event, correct effective/session roles, all nine predicates PASS, `safe_result=true`, `decision=accepted`, `result_status=complete`, `pool_observation=on_connect`. Pool-cached checks and HTTP 200 alone are insufficient. |
| Public APIs | Exact query-free URLs for health, readiness, profile, news, pages and services; status/schema/pagination and private-data exclusion. Throttle persistence and audit-on-error effects need approval. Empty verified content is valid. |
| Staff auth | Authorized protected browser, existing test staff identity, MFA/session/RBAC and sign-out checks. Enumerate throttle, assurance, session and audit writes before approval. No password recovery mail without an approved provider. |
| Photos/documents | Small synthetic approved files, private bucket binding, metadata, upload validation, authorized download, publication restrictions and object/database consistency; approve exact object/record scope and supported cleanup beforehand. Do not invent official municipal records or delete audit history. |

The guard still enforces the existing nine privilege predicates rather than a new literal-role policy. Acceptance must observe `talgov_staging_runtime`; any exact-name enforcement proposal remains a separate security change.
