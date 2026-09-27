# S6-BE-03 security QA

Reviewed 2026-09-27 from `bdd8942`. Parent: [#55](https://github.com/rynzz22/Talibon-Official-Website-BetaTest-V1.5/issues/55).

Both branches subsequently integrate `main` at `0442bd6`. Remote CI exposed an inherited middleware registration regression there (missing import, lost audit registration and old Express wildcard). Both branches restore audit/cache middleware with `{*path}`; headers already run in `configureApp`. Backend lint and full tests pass again after integration. See [#84](https://github.com/rynzz22/Talibon-Official-Website-BetaTest-V1.5/issues/84).

## Result

Auth, RBAC, input validation and checkout regression checks pass locally. No critical dependency advisories were reported. **Payment webhook acceptance remains blocked by [S3-BE-02 / #31](https://github.com/rynzz22/Talibon-Official-Website-BetaTest-V1.5/issues/31): no webhook handler or verified settlement flow exists. Do not close #55 or approve production payment settlement based on these results.**

| Boundary | Evidence | Result |
| --- | --- | --- |
| Auth | `auth-guard.spec.cjs`, `foundation.test.cjs`, signup tests: invalid/expired bearer tokens, revoked sessions, logout, provider failure, public-route overrides, rate limiting | Pass |
| RBAC | Auth guard, admin users/reports, content and forms tests: forged metadata, unverified/deactivated accounts, stale roles, super-admin-only role assignment, ownership | Pass |
| Input validation | HTTP tests use production `configureApp`: unknown properties, invalid types/ranges, invalid JSON and body-size limits; checkout adds money precision and redirect checks | Pass |
| Checkout | `payments-security.test.cjs`: real controller, service, DTOs and HTTP pipeline with only the external Xendit SDK mocked | 6 groups pass; all 6 failed before fixes |
| Webhook | Four explicit TODOs in the payment test file; they execute no assertions and are not passing coverage | Blocked on #31 |
| Database | Disposable PostgreSQL 18: fresh/canonical migrations plus archived V4 security regression; RLS, ownership, privilege checks, audit rollback, deactivation | Pass; Supabase Auth is stubbed locally |
| Credentials | Tracked-file literal-pattern scan, ignored backend/frontend `.env`, frontend environment tests | No candidate literals found; 5 tests pass; Git history/live credentials not audited |

The full backend run passes **54 Jest tests + 57 Node HTTP/integration tests**, with **4 webhook TODOs**. Backend and frontend lint pass. No live Supabase or payment provider was contacted by the security fixtures. Browser E2E/provider sandbox verification remains separate from these API checks.

## Findings and branches

- [#80: checkout hardening](https://github.com/rynzz22/Talibon-Official-Website-BetaTest-V1.5/issues/80), medium: unchecked redirects/Host defaults, raw provider error logging, timestamp invoice collisions, excess decimal precision. Fixed on `fix/s6-be-03-security-qa`; close after merge.
- [#81: dependency advisories](https://github.com/rynzz22/Talibon-Official-Website-BetaTest-V1.5/issues/81), high: patched on separate branch `fix/s6-be-03-dependencies`. Root and backend locks update Nest platform-express, multer, express/body-parser, qs and esbuild; all three full npm audits report zero findings there. The checkout branch alone still has the old dependency locks. CI gains a critical-advisory gate for root, backend and frontend.
- [#31: payment integration](https://github.com/rynzz22/Talibon-Official-Website-BetaTest-V1.5/issues/31), high release blocker: authenticate callbacks, persist invoices linked to submissions, determine prices server-side, and settle atomically/idempotently. The current public checkout accepts client-provided item/amount and creates only a provider invoice. The success page renders success/receipt text from a browser visit; this is not proof of payment. These integration gaps remain open, not mitigated by redirect validation.

## Required checkout configuration

Set backend `PAYMENT_RETURN_ORIGIN` to the **frontend origin**, e.g. `https://talibon.gov.ph` (no path, query, fragment or credentials). The service returns 503 before provider access if this is missing/invalid. Production requires HTTPS; development permits HTTP only on loopback hosts. Defaults are `/payment/success` and `/payment/cancel`. Optional return URLs must have exactly the configured origin, including port, and contain no credentials. Request Host/forwarded headers never determine the origin.

## Reproduce

```powershell
npm test --prefix backend
npm run lint --prefix backend
npm run lint --prefix frontend
node --test frontend/test/environment.test.cjs
# Requires PostgreSQL tools on PATH; creates only disposable local databases.
npm run test:db --prefix backend
npm audit
npm audit --prefix backend
npm audit --prefix frontend
```

For focused payment checks, build first, then run `node --test --test-timeout=120000 backend/test/payments-security.test.cjs`. Keep the four TODOs visible until actual webhook code is available; a mock callback receiver cannot validate a missing production handler.

## Webhook handoff acceptance

1. Choose/configure the provider contract (#31 currently mentions Stripe; existing checkout uses Xendit), then reject absent/forged callback credentials and payload tampering before any database write.
2. Match provider invoice, submission owner, server-calculated amount and currency; do not trust redirect URLs or browser status.
3. Verify duplicate/concurrent deliveries and out-of-order terminal events change the ledger exactly once; unknown invoices cannot create paid records.
4. Inject persistence failures: return a retryable failure without acknowledging settlement, then verify recovery.
5. Run those assertions against the real handler with provider/database fixtures, followed by provider test-mode and frontend E2E. Replace the TODOs with executable tests and update #55 only after they pass.
