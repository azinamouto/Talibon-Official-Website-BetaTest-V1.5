# R2 security model and risk register

Increment 3 update (2026-11-02): the branch now wires staff-only Better Auth 1.7.15 sessions, TOTP/backup-code MFA, active app-owned roles, a fail-closed staff guard, five-minute step-up for account changes, session revocation, and transactional staff audit. Legacy Supabase login/session and admin-user/report routes return 410. Local disposable-PostgreSQL and isolated Neon development-branch qualification are separate evidence; see [the Increment 3 report](INCREMENT_3_REPORT.md). This does not qualify production or retire Supabase from unrelated legacy/public-read or storage dependencies.

The following paragraphs describe the Increment 2 baseline. Increment 2 adds locally tested parameterized repositories, strict TLS configuration, bounded transactions, app-owned active-staff RBAC, optimistic versions/last-admin protection, public visibility views, narrow database grants and atomic mutation auditing. [Implementation boundaries](DATABASE_OPERATIONS.md) and [test/audit evidence](INCREMENT_2_REPORT.md) define that baseline. At that checkpoint, the module was unmounted and no Neon identity/session/MFA claim was made. Dependency advisories, hosted source closure and release gates remain open. R2-08's metadata-write atomicity is locally tested; existing async request telemetry remains unchanged.

Status: proposed controls; R1 remains implemented. See [execution evidence](PRODUCTION_ACCEPTANCE.md) for what was actually tested.

## Preserve existing protections

Keep deny-by-default Nest guard metadata precedence, provider identity verification, active-session and verified/nondeleted-profile checks, input DTO allowlists, 1 MB JSON bound, sanitized exception responses, request IDs, route-template audit logging, CORS allowlist, explicit proxy trust, security headers, production mock rejection and official-data release sign-off. Replace provider-specific mechanisms only with tested equivalents.

R1 payment gates remain until Increment 1 closes the whole namespace. Do not weaken role restrictions on forms while deferring them. The current process-local rate-limit Map needs a shared enforcement design for scale-out; deploying more Vercel instances must not multiply an assumed global quota.

## Application role matrix

| Action | Anonymous / inactive / unknown | Editor | Admin |
|---|---|---|---|
| Read approved published information/assets | Public subset only | Yes | Yes |
| List/preview unpublished media | Deny | Yes, active session + required assurance | Yes, same checks |
| Upload/categories/title/metadata edits | Deny | Yes | Yes |
| Publish/unpublish approved photos/documents | Deny | Yes | Yes |
| Delete/recover media | Deny | Deny | Yes, audited and retention-controlled |
| Staff activation/deactivation/role changes | Deny | Deny | Yes, fresh assurance, no last-admin removal |
| Read security audit | Deny | Deny | Yes, redacted and bounded |
| Citizen submissions/payments/workflow reports | Deny | Deny | Deny |
| News/page/service editing | Deny | Deny | Deny in R2 CMS |

Role is loaded from an app-owned record, not from client metadata. Category IDs, file IDs, revisions and optimistic versions are validated server-side. No account role automatically maps from `super_admin`, `municipal_admin` or other R1 labels; approved roster mapping is mandatory. Provider-management privileges stay outside normal CMS authorization.

## Boundaries and failure behavior

- Browser to API: untrusted input, CSRF/origin defense for cookies, no raw SQL, no browser database credentials. Route guards only improve UX.
- API to auth: live verification and required assurance; provider failure denies privileged access. Do not degrade to decoded claims.
- API to database: separate least-privilege runtime role; values parameterized, identifiers allowlisted; mutation and audit atomic. Runtime cannot edit/delete audit events or schema.
- API to storage: private objects, random immutable keys, quarantine, server content validation, expiring access, controlled deletion. Unpublished content is not public merely because a URL is known.
- Public content/search/cache: explicit publication/deletion/source predicates on every repository query and cache fill. No private records in facets, counts, snippets, sitemaps or previews. Invalidate publication caches and delivery keys during unpublish.
- Operations: no provider secrets in browser/logs/docs. Never log passwords, auth headers, cookie values, signed URLs or full uploaded content. Failed operations use correlation IDs and sanitized error codes.

The response-finish `AuditMiddleware` currently persists asynchronously. Preserve it as request telemetry, but add transaction-coupled upload-finalization/edit/publication/deletion/staff-change audit events. If the durable mutation audit fails, roll back the database mutation and reconcile object side effects. Store redacted field changes, actor/resource/request IDs and outcomes, not full sensitive snapshots. An append-only table is not a cryptographic tamper-proof ledger; independent protected exports/retention need operational verification.

## Risk register

| ID | Severity / state | Finding and required action | Owner / exit evidence |
|---|---|---|---|
| R2-01 | P0 Qualification only | Staff MFA is implemented with pinned upstream Better Auth on PostgreSQL, not Neon Managed Auth; local and isolated dev-branch test results do not authorize production | Security + provider; repeatable bypass/recovery and target-specific production approval |
| R2-02 | P0 Qualification only | Closed registration and the Nest cookie-session bridge have local/isolated dev evidence; production identity, mail, recovery and session operations remain unqualified | Backend/security; direct-signup denial, expiry/revocation tests and approved production evidence |
| R2-03 | P0 Pending credentials | Actual schema/auth/buckets/jobs differ potentially from canonical source | DBA/ops; read-only catalog + reconciled manifest |
| R2-04 | P0 Pending approval | Placeholder seeds and hardcoded civic claims lack complete official provenance | Municipal content owners; signed approved content manifest |
| R2-05 | P0 Locally implemented; hosted closure pending | Increment 1 retires app routes and local worker/edge entry points; direct hosted grants/signup/jobs remain unverified | [Shutdown evidence and release procedure](DEFERRED_WORKFLOW_SHUTDOWN.md); clone rehearsal and operator shutdown evidence required |
| R2-06 | P0 Planned | Broad public buckets cannot enforce draft privacy by metadata alone | CMS/security; private access and unpublish tests |
| R2-07 | P1 Pending credentials | Lifecycle/versioning limitations require independent recovery; hosted controls untested | Ops; object and DB restore rehearsal |
| R2-08 | P1 Planned | Async request audit is not atomic with CMS writes | Backend; injected audit failure rollback test |
| R2-09 | P1 Not yet verified | Per-instance quotas, cold starts, pool contention and Vercel upload limits | Ops/backend; bounded-load and upload tests |
| R2-10 | P1 Tested findings | Lockfile audits contain advisories; no automatic remediation in discovery | Maintainers; reviewed dependency changes and repeat audit |
| R2-11 | P1 Pending approval | Private preview signed URLs survive revocation until expiry; data retention unspecified | Security/municipal owner; accepted bound or verified alternative |
| R2-12 | P1 Not yet verified | Legacy environment-backup file may contain sensitive material; encoding drift exists in `NewsCategoryPage.tsx` | Security/content; private secret scan and source review before release |

Privacy/DPO approval, accessibility assessment and production ownership in the R1 readiness register remain open. This design does not claim legal compliance or an approved retention policy.
