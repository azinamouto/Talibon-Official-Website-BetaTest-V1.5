# S1-INT-01: development and staging handoff

Status as of 2026-10-07: **pending remote provisioning and FE/BE sign-off**.
The frontend implementation is ready for separate projects. No remote project,
auth configuration, migration or user was changed in this task.

## Project inventory and creation plan

The connected account lists organization **Alza Solutions** and one inactive project
named **TAGAD**. It does not list identifiable Talibon dev or staging projects.
Do not repurpose TAGAD or treat it as either environment without owner confirmation.

Proposed new projects: `talibon-dev` and `talibon-staging`, region Singapore
(`ap-southeast-1`). Organization selection is awaiting the owner. Supabase project
creation tools require an explicit organization choice and confirmation of the
quoted project cost before provisioning. Record references and URLs below only
after successful creation; never record credentials here.

| Setting | Development | Staging |
| --- | --- | --- |
| Project name | talibon-dev (proposed) | talibon-staging (proposed) |
| Project ref / URL | Pending creation | Pending creation |
| Frontend origin / Site URL | http://localhost:5173 | Pending staging HTTPS origin |
| Confirmation callback | http://localhost:5173/auth/callback | `<staging-origin>/auth/callback` |
| Recovery redirect | http://localhost:5173/login?type=recovery | `<staging-origin>/login?type=recovery` |
| Provider | Email/password proposed | Email/password proposed |
| Confirm email | Enabled proposed | Enabled proposed |
| Anonymous sign-ins / OAuth | Disabled proposed | Disabled proposed |
| Minimum password length | 8 proposed | 8 proposed |
| FE lead approval | Pending | Pending |
| BE lead approval | Pending | Pending |

Add `http://127.0.0.1:5173` callback/recovery variants only if used by developers.
Use exact staging redirect URLs; do not allow arbitrary preview origins or broad
wildcards. Confirm SMTP/email delivery and the confirmation/recovery templates.
The frontend uses the SDK's existing implicit browser flow and URL-session detection.

## Environment variable contract

| Variable | Owner / purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | FE public project URL; must match backend project |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | FE public publishable key; preferred |
| `VITE_SUPABASE_ANON_KEY` | FE legacy anon fallback; publishable takes precedence |
| `VITE_API_URL` | FE dev-server proxy target (default localhost:3000); production uses same-origin `/api` |
| `VITE_ENABLE_MOCK_DATA` | FE false for integration/staging |
| `SUPABASE_URL` | BE URL for the same environment's project |
| `SUPABASE_SERVICE_ROLE_KEY` | BE secret, server-only |
| `SUPABASE_PUBLISHABLE_KEY` | BE public client used for authentication |
| `SUPABASE_ANON_KEY` | BE legacy public-key fallback |
| `ALLOWED_ORIGINS` | BE explicit frontend origin allowlist |
| `APP_URL` | BE email/tracking-link base URL; confirm hosting routing |
| `PAYMENT_RETURN_ORIGIN` | BE frontend origin if payments are exercised |
| `ENABLE_MOCK_DATA` | BE false for integration/staging |

Copy `frontend/.env.example` to ignored `frontend/.env.local` for development.
Use separate staging environment values; Vite bakes public values into its bundle,
so rebuild after switching projects. Keep backend values in its private environment
or secret store. Never prefix server secrets with `VITE_`, and never copy production
credentials or citizen data into dev/staging.

## Provisioning and acceptance checklist

1. Owner selects organization; obtain and confirm costs for both projects. Create
   projects and wait for ready status. Record refs/URLs above.
2. BE lead applies the fresh-project migration chain in `supabase/migrations/`
   following [supabase/README.md](../supabase/README.md). Never replay legacy files
   or apply a fresh baseline to an existing populated project.
3. FE/BE leads agree and configure the table above, including exact staging origin.
   Record names, date and review link below. A proposal is not team agreement.
4. Set matching FE/BE variables. Run builds and backend auth/DB tests.
5. Use synthetic accounts: verified staff, citizen, pending staff and inactive staff.
   Verify password login, invalid credentials, profile denial, email confirmation,
   recovery, reload persistence, automatic refresh and signout in two tabs.
6. Verify unauthenticated backend requests are rejected and database role/profile
   escalation attempts fail. Record evidence separately for dev and staging.

| Evidence | Development | Staging |
| --- | --- | --- |
| Project ready | Pending | Pending |
| Migration history / auth settings reviewed | Pending | Pending |
| Real login, refresh, recovery, logout | Pending | Pending |
| FE approval (name/date/link) | Pending | Pending |
| BE approval (name/date/link) | Pending | Pending |

Do not close S1-INT-01 or claim live S1-FE-05 validation until these steps are recorded.
