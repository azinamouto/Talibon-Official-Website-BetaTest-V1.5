# S7-BE-01 production environment

Status: implementation prepared; production setup and hosted verification pending.
S6-INT-01 (#62) is OPEN with all acceptance boxes unchecked as of 2026-09-28.
Do not close this ticket or launch until integration evidence is recorded.

## Project configuration

Use separate staging and production Supabase projects. Confirm project references,
regions, current schema and migration history before linking either project. The
connected Supabase account currently exposes only inactive `TAGAD`; no Talibon
target has been confirmed. The connected Vercel account returns no teams.

Vercel root directory is the repository root, build command `npm run build`, output
directory `frontend/dist`, Node.js 22. `vercel.json` installs all three lockfiles;
the Nest function loads compiled CommonJS from `backend/dist` so DTO metadata is
preserved. Verify this with a Vercel preview build, not only the local TypeScript build.
Keep `.vercel/` ignored. Disable automatic production deployment during the launch
window so a Git push cannot bypass database verification.

## Environment inventory

Set values in the Vercel dashboard with separate Production and Preview scopes.
Never copy production credentials into Preview. Local `.env` files stay ignored.

| Name | Scope / purpose |
| --- | --- |
| NODE_ENV | `production` for hosted backend |
| SUPABASE_URL | Target project's HTTPS API origin |
| SUPABASE_SERVICE_ROLE_KEY | Backend secret; service role only |
| SUPABASE_PUBLISHABLE_KEY or SUPABASE_ANON_KEY | Backend authentication client, same project |
| ALLOWED_ORIGINS | Exact comma-separated frontend HTTPS origins |
| ENABLE_MOCK_DATA | `false` |
| VITE_SUPABASE_URL | Public frontend API origin, matching backend project |
| VITE_SUPABASE_ANON_KEY | Public **anon** key, never a service role key |
| APP_URL | Public site URL for email links |
| PAYMENT_RETURN_ORIGIN | Exact frontend HTTPS origin |
| XENDIT_SECRET_KEY | Backend secret, only when payment acceptance is ready |
| RESEND_API_KEY, EMAIL_FROM_ADDRESS, EMAIL_FROM_NAME | Verified sender and backend mail secret |
| TRUSTED_PROXIES | Only verified ingress addresses/CIDRs; never blanket trust |

Check frontend/.env.example for optional public feature configuration. Browser
VITE variables are embedded at build time; changing them requires rebuilding.
Record key names/presence and project identity, never values, in release evidence.
Configure Supabase Auth site/redirect URLs and SMTP for each environment. Confirm
the email worker has a scheduler; the HTTP function alone does not run it.
Payment settlement remains blocked by S3-BE-02 (#31), documented in security-qa.md.

## Health contract

* `GET /api/health`: 200 `{"status":"ok"}` when the Nest application is running.
* `GET /api/health/ready`: queries canonical `roles` through the backend Supabase
  client; returns 200 with `checks.database=ok`, or sanitized 503 on error/3s timeout.
* Both are public, rate limited and `Cache-Control: no-store`. Neither returns
  database records, credentials or provider messages. Readiness checks connectivity
  and this table only; migration/data verification remains a separate release gate.

Verify the deployed URL, JSON body, status and no-store header, then record commit,
timestamp and result. A static SPA returning HTTP 200 is not a passing health check.

## Release ordering

Required order: DB migration and data verification -> backend -> frontend -> smoke.
The existing Vercel project packages backend and frontend in a single deployment,
so their promotion is atomic. Strict separate BE/FE deployments require two confirmed
Vercel projects and frontend API routing configuration before release. Do not claim
the sequential requirement is satisfied by a combined deployment. Prepare environment
configuration first (BE-01), apply and verify DB (BE-02), then deploy applications.

References: [Vercel builds](https://vercel.com/docs/builds/configure-a-build),
[Supabase environments](https://supabase.com/docs/guides/deployment/managing-environments).
