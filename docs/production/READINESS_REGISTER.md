# TAL.GOV production qualification — Increment R1

**Source audited:** `main` at `da4ef44b0684d48a6bf01f5d21b171a2780f4ab5` (2026-10-31).
**Status:** **NOT PRODUCTION-QUALIFIED**. This increment is a reversible release safety gate, not evidence of deployment. All changes require normal PR review and CI.

## Implemented safety gates (review before merge)

| ID | Scope | Change | Verification |
|---|---|---|---|
| R1-01 | Payment | Retired unauthenticated client-amount checkout; both public and submission payment UI remain inert | `backend/test/payments-security.test.cjs`, frontend browser tests |
| R1-02 | E-Cedula | No unverified fee calculation, direct database writes, or locally fabricated official slips | Static regression test, manual public-page review |
| R1-03 | PII / RBAC | Staff role denied all-site application list/read/status mutation until scoped access is designed; admins retain elevated access | `backend/test/forms.test.cjs` |
| R1-04 | Data governance | Read-only release SQL blocks specific known fictitious municipal seed values; release requires official-data sign-off URL | `ops/verify-official-data.sql`, `npm run test:ops` |
| R1-05 | Static frontend | Vercel headers for MIME sniffing, HTTPS, framing, referrer, minimal CSP | `ops/test/production-gates.test.mjs` and browser inspection |
| R1-06 | Policy | Removed unverified privacy effective-date and compliance claims; DPO must provide final notice | Manual DPO approval |

## Critical P0 still open — DO NOT enable these features

1. **Official data migration:** Existing baseline contains sample barangays/departments. Historical migration is intentionally not rewritten, and this increment does not overwrite/delete municipal records. Review all official content, then apply an explicitly approved correction migration with staging backup/rollback proof. The SQL gate covers *known* placeholders only, not every unverified claim.
2. **Payments:** Build a server-owned fee schedule and assessment ledger, owner-authorized checkout, verified provider webhooks, immutable provider transaction references, idempotent settlement/reconciliation, signed municipal receipt rules, refund/reversal handling and end-to-end sandbox tests. Remove hard gate only after Treasury and technical sign-off; refs #31/#33.
3. **Scoped workflow administration:** Implement department/barangay authorization in *backend queries and mutation guards*, accounting for cross-office assignments. Until then staff/department roles cannot manage all applications through this endpoint.
4. **E-Cedula:** Establish an approved Treasury form schema, tax calculation and receipt policy; integrate with canonical NestJS forms and testing before unblocking. Never issue browser-generated "official" slips.
5. **Staging/production:** Verify real Supabase project refs, migration history, Storage policies, auth redirects, Vercel settings, secret rotation history and restore. Run signed staging and launch E2E. No production writes are performed by this patch.
6. **Operating monitoring and backups:** Existing scheduled workflows are gated by repository variables. Configure secrets, turn them on *after testing*, verify external alert delivery and decrypt/restore into isolated hosted staging. Do not claim scheduled skipped jobs as success.

## P1 engineering queue

- **Dependency security:** Rebase and review PR #83 (open); current lockfile risk must be independently audited; no blind `npm audit fix --force`.
- **Distributed rate limiting:** Current NestJS `Map` is per-instance and unsuitable for Vercel scale-out. Use shared atomic quota/RPC or a supported edge WAF with verified client IP configuration, failure policy and tests.
- **Storage:** For citizen files, private bucket, user-owned names, MIME/file-signature limits, signed short-lived downloads, malware scan/quarantine, lifecycle deletion and audit trail.
- **Monitoring:** Error and p95 dashboards, external synthetic probes, alert acknowledgments and written incident response.
- **Content:** Remove remaining fictional/hardcoded civic facts; each datum must have source, owner, review date and publish permission. Resolve insecure `http://talibon.gov.ph` media references and verify all forms.
- **Privacy and accessibility:** DPO-reviewed RA 10173 compliance program; publication approval, WCAG 2.2 AA and performance budget verified on real devices.

## Required qualification commands (Windows PowerShell)

```powershell
npm ci
npm ci --prefix backend
npm ci --prefix frontend
npm run lint
npm test --prefix backend
npm test --prefix frontend
npm run test:react --prefix frontend
npm run test:ops
npm run build
npm audit --audit-level=high
npm audit --prefix backend --audit-level=high
npm audit --prefix frontend --audit-level=high
npm run test:browser --prefix frontend
npm run test:eservices --prefix frontend
```

Also run `npm run test:db --prefix backend` using a disposable PostgreSQL instance. Database and browser end-to-end checks require local tooling and test infrastructure and must not target citizen production data. Record pass/fail, commit SHA and environment. An ignored/unrun command is **not** a pass.

## Go/no-go ownership

| Acceptance | Owner | Status |
|---|---|---|
| Production data sources and official fees signed | Municipality / relevant departments | PENDING |
| Data protection impact assessment and public notice | LGU DPO | PENDING |
| FE/BE role and workflow contract acceptance | Technical leads | PENDING |
| Hosted staging full-stack tests and payment sandbox | Technical / QA | PENDING |
| Encrypted backup tested and recovered with timing evidence | Ops / LGU IT | PENDING |
| Monitoring, security alerts and incident contacts live | Ops / LGU IT | PENDING |
| Production release approval and post-deploy smoke results | Release operator + LGU | PENDING |

**Rule:** no production enablement, migration or deployment from this patch. Merge only after reviewing CI and the described regressions. Keep unverified service links informational or disabled.
