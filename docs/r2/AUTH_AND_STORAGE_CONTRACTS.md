# Auth and storage contracts and provider gates

Checked 2026-11-01 using official provider documentation. These are application-owned proposed interfaces, **not invented Neon SDK method names**. No account, credential, hosted API or integration was exercised. No Neon SDK is present in the three baseline lockfiles.

## Capability evidence

| Requirement | Evidence | Decision |
|---|---|---|
| Managed authentication / React | Neon documents managed Better Auth and `@neon/neon-js` React integration | Documented; exact package pin and Nest integration not verified ([React guide](https://neon.com/docs/auth/quick-start/react)) |
| MFA | Provider roadmap lists MFA as coming soon | **Blocked** for required-MFA cutover. Proposed R2 policy requires privileged-staff MFA; policy approval is pending. Do not replace MFA with email verification ([roadmap](https://neon.com/docs/auth/roadmap)) |
| Nest session verification | Roadmap cautions that separate frontend/backend deployments are unsupported; current project has a combined Vercel origin | **Blocked pending proof** of a supported same-origin Nest flow, live session validation and revocation; combined hosting alone is not proof |
| Closed registration | No verified provider-side setting/flow established by the inspected guides | **Blocked pending verification**; hiding registration or denying CMS roles does not prevent public account creation |
| Recovery | Password-reset flow documented | Pending credentials and delivery/expiry/reuse tests ([reset guide](https://neon.com/docs/auth/guides/password-reset)) |
| Ban/revoke/account controls | Admin plugin documents user banning and session revocation; requires authenticated cookie session | Pending account-specific authorization tests; provider admin power is separate from app CMS admin ([Admin plugin](https://neon.com/docs/auth/guides/plugins/admin)) |
| Production auth settings | Trusted domains, custom email delivery and localhost restrictions documented | Pending configuration and approval; default settings are not production evidence ([checklist](https://neon.com/docs/auth/production-checklist)) |
| Supabase passwords | Migration guide says password users must create new accounts or reauthenticate with OAuth | Plan approved staff re-enrollment; no password, session or MFA-secret export ([migration guide](https://neon.com/docs/auth/migrate/from-supabase)) |
| Object Storage availability | Current docs describe S3-style storage; GA announcement dated 2026-09-17 | Documented available; actual account eligibility **pending credentials** ([GA](https://neon.com/blog/neon-backend-is-ga), [storage](https://neon.com/docs/storage/overview)) |
| Storage SDK/access | S3 subset, path-style addressing, SigV4, presigned GET/PUT, private/public access; S3 ACL/policy mutations unsupported | Candidate `@aws-sdk/client-s3` + presigner; not installed/tested. Configure access through Neon controls ([compatibility](https://neon.com/docs/storage/s3-compatibility)) |
| Storage recovery | Lifecycle rules and versioning configuration are stored but not enforced | Use immutable keys, app-owned revision/deletion workflow and tested backups; do not claim native lifecycle/WORM protection |
| Storage credentials | Scoped Neon credentials map to S3 keys; read/write scopes documented | Server secrets only; verify branch scope, expiry, rotation and revocation in the target account ([authentication](https://neon.com/docs/storage/authentication)) |

The supported-plugin list is narrower than upstream Better Auth; upstream features are not proof of Neon support. No authentication migration component proceeds beyond design/test scaffolding until the blockers above are resolved. Keep the existing R1 authentication working during discovery. Do not silently choose another auth provider or self-host Better Auth. [Neon plugins](https://neon.com/docs/auth/guides/plugins).

## Availability, limits and costs

Storage documentation currently lists Ohio, N. Virginia, Frankfurt and Singapore; 5 GiB single-request/10 GiB multipart object limits and 5 GB Free storage. Heavy load may return `503 SlowDown`. Verify the municipal project's region and paid entitlements before selecting it; the application's limits will be much smaller. [Storage limits](https://neon.com/docs/storage/overview).

Pricing checked on this date: Free includes 1 GB database storage, 100 CU-hours/project and 5 GB objects. Launch lists $0.106/CU-hour, $0.35/GB-month database, $0.023/GB-month objects, and 500 GB included project egress then $0.10/GB. Restore history and snapshots add cost. These are published rates, not a quote or approved municipal budget; verify account terms/taxes and Vercel/email costs. [Pricing](https://neon.com/pricing).

Budget model: compute hours × rate + DB GB-month + changed-history GB-month + object GB-month + excess transfer + retained backups + Vercel + recovery email. Measure public image/document traffic and set spending alerts. A low staff MAU count does not bound anonymous download/egress cost. No claim of affordability is made without usage and retention estimates.

Vercel documents a 4.5 MB function request/response payload limit. Do not route 10 MB document bodies through an ordinary function upload endpoint. Proposed uploads use private quarantine presigning and a small finalize request; validation reads bytes from storage server-side. Confirm execution/memory limits with representative PDFs/images in staging. [Vercel limits](https://vercel.com/docs/functions/limitations).

## Authentication application contract

`AuthenticationAdapter.verifyRequest(request)` returns verified opaque subject, issuer, live session identity, expiry, and verified assurance metadata, or denies. `revokeSession` / `revokeAccountSessions` return confirmed provider outcomes. Login/recovery initiation/completion use only documented provider capabilities; exact transport remains blocked, not guessed.

The service then loads `staff_accounts` on every privileged request: active must be true; role must be admin/editor; assurance must meet policy. Unknown subjects, provider outage, stale sessions, revoked/deactivated accounts and unknown roles deny access. Never authorize from JWT decoding alone. Cache identity keys only according to verified provider rules; do not cache active-account authorization past revocation.

Proposed browser contract: same-origin secure HttpOnly session cookie, SameSite policy appropriate to the verified flow, explicit Origin/CSRF checks on state-changing requests, bounded lifetime, no durable browser token storage. If the verified provider cannot support this Nest integration, stop the component. Do not expose refresh tokens, cookie secrets, recovery tokens or MFA seeds to logs or local storage.

Proposed staff lifecycle: municipal approver supplies a roster; operator verifies old identity and target account ownership; staff is inactive until enrollment/recovery and required MFA succeed; create a reviewed old/new ID mapping. Do not auto-link by unverified email. Existing citizen accounts stay outside R2. Invalidate old sessions during an approved cutover. MFA re-enrollment and recovery must be demonstrated; password compatibility is not assumed.

Mandatory negative tests: direct provider signup rejected, wrong issuer/audience, tampered/expired session, revoked session replay, cross-origin mutation, editor role escalation, deactivated admin, reset-token reuse/expiry, open redirects, recovery enumeration and MFA bypass. Existing R1 logout/session tests define behavior to preserve, not target-provider evidence.

## ObjectStore application contract

Propose `createUploadIntent`, `head`, `read`, `writeImmutable`, `signRead`, `delete`, and `verifyAbsent`, with opaque generated keys and bounded operations. Adapter configuration uses a verified endpoint/region/private bucket and scoped server credentials. No component accepts an arbitrary client bucket/key/URL or fetches an untrusted URL to import content.

Keys: `quarantine/<intent-uuid>/<object-uuid>` and `assets/<asset-uuid>/<revision-uuid>.<validated-extension>`. Use random IDs, no original filename, email or citizen ID. Original filename is bounded display metadata only; reject path segments, separators, control characters, CR/LF, NUL and ambiguous extensions. Store key/checksum/size/type, not expiring URLs. Credentials never reach React; a short-lived upload URL grants one quarantine object only.

Initial allowlist proposal: JPEG/PNG/WebP photos up to 5 MiB, PDF documents up to 10 MiB; configurable lower limits approved before launch. Reject SVG, HTML, scripts, executables and office macro/archive formats. Additional document formats need explicit signature/parser and threat review. Server checks extension, declared MIME, detected magic/signature, measured bytes, image decode/pixel budget and PDF structure; scan/quarantine active content as required. Browser validation is only a convenience.

Upload sequence: authorize staff → create expiring intent → sign short-lived private upload → browser uploads → finalize rechecks current staff access → stream/validate/hash bytes → copy verified bytes to a new immutable revision key → verify final checksum → transactionally persist metadata/audit and complete intent. Prevent overwrite/replay/races by making final keys never writable through an upload intent. Failed validation leaves no published asset; retries reconcile intent state rather than create duplicates. Expired abandoned quarantine objects are cleaned by an explicit bounded app maintenance operation; provider lifecycle settings are insufficient.

Preview/download: authorize current metadata before issuing an expiring private GET, proposed 60-second TTL. Set no-store for privileged metadata/URLs and `X-Robots-Tag: noindex, nofollow`; never put private URLs in sitemap/search/HTML. Documents use sanitized attachment disposition and nosniff. Signed URLs are bearer capabilities until expiry; do not log them. Public reads require ready/published/approved/not-deleted metadata.

Unpublication stops new read grants immediately. To prevent previously issued public links reading the original private revision, use a separate immutable delivery key for published downloads and remove/verify absence of that delivery key before reporting unpublication complete; retain private revision for authorized preview/recovery. Failure remains a visible pending operation and blocks new grants. Test cache behavior; downloaded copies cannot be recalled. Privileged preview grants have a bounded residual TTL after account revocation, which must be accepted in the security review or replaced with per-request authorized delivery within hosting constraints.

Delete: admin only, fresh authorization, optimistic version and durable deletion intent/audit. Stop publication, delete delivery key, verify absence, then mark metadata deleted. Keep restricted original revisions through the approved recovery window; physical purge requires retention approval and a verified backup. No false success if either store fails. Data retention and preview-URL residual access are **pending approval**, not silently selected compliance guarantees.
