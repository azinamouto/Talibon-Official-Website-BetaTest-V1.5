# Workflow: Security, privacy, and secrets
**When:** Auth, uploads, CMS, deployment, user records and dependencies.

- Never output or commit credentials. `VITE_*` is public; no service role, DB URL with password, signing key or admin secret in frontend.
- Access must fail closed server-side; validate all inputs; rate-limit sensitive endpoints across instances if deployed serverlessly.
- Maintain secure headers/CSP at Vercel frontend boundary and secure CORS, session cookie options and API cache headers.
- Restrict object visibility and metadata leakage. Keep citizen legacy information out of new R2 logs and fixtures.
- Scan staged files and history exposures; credential removal does not revoke leaked secrets. Rotate compromised keys explicitly under approval.
- Do not assert RA 10173 compliance without governance review, approved privacy notices, retention/erasure and incident procedures.
- Remediate known critical/high dependency vulnerabilities with pin/lockfile verification and regression tests; document residual risk with owner.
**Done:** threat surface and security test evidence recorded, not merely checklist claims.
