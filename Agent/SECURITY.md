# Credential protection

R2 status: the configuration below remains the current R1 runtime contract. See [R2 security model](../docs/r2/SECURITY_MODEL.md) and [provider gates](../docs/r2/AUTH_AND_STORAGE_CONTRACTS.md) for the proposed replacement. Do not remove working authentication before verification, weaken required MFA, or claim zero Supabase dependencies during discovery. R2 will use server-owned staff authorization and private media validation; no production migration or deployment is authorized here.

Never commit credentials. Keep frontend/.env and backend/.env separate and ignored by Git; examples contain placeholders only. All VITE_* values ship to browsers, so never use that prefix for secrets, service role keys, private keys, passwords, or admin credentials.

The frontend requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Only an anon key belongs in that public key variable. Configuration is validated before client initialization; there are no production fallbacks. Backend database operations require SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY at startup. The backend authentication client intentionally uses its separate public key to retain user-scoped authentication behavior.

Log only credential presence, never values or fragments. Do not return provider errors or secrets in API responses. Elevated operations must go through authenticated and authorized backend APIs. Vite must never inject server secrets through define or custom environment prefixes.

Gemini browser secret injection is disabled. AI features remain unavailable until they call a backend endpoint with appropriate authentication, validation, and rate limiting.

Before committing or deploying, scan tracked files for credential literals and sensitive VITE_* names, verify environment files remain ignored, and run:

- node --test frontend/test/environment.test.cjs
- npm run lint --prefix frontend
- npm run test:unit --prefix backend

Source cleanup does not remove Git history or revoke previously exposed credentials. Rotate any private key that was included in an earlier deployment or commit.
