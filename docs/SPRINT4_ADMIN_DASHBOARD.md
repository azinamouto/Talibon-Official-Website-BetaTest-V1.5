# Sprint 4 Admin Dashboard

Tickets: S4-INT-01, S4-FE-01, S4-FE-02, S4-FE-03, S4-FE-04.
Updated: 2026-10-09.

## Implementation and handoff

The Sprint 4 workspace serves `/admin`, `/dashboard`, `/cms`, and `/manage/*`.
Sections use `?tab=overview|users|pages|news|services|reports`. All real data uses
authenticated NestJS endpoints, after `/api/auth/me` provides permissions. Existing
Sprint 3 citizen flows are preserved. The old `AdminDashboard.tsx` source remains
in the repository but is no longer the entry point for these routes; its unrelated
legacy modules are not part of the Sprint 4 workspace.

| Ticket | Implementation |
| --- | --- |
| S4-INT-01 | Shared [permission matrix](../backend/docs/admin-rbac.md), live `data.permissions` on `/api/auth/me`, typed client, checked-in OpenAPI including admin endpoints |
| S4-FE-01 | Responsive navigation and count widgets, separate development-only mock preview |
| S4-FE-02 | Server-side name/email search, role/status filters, pagination, role assignment and deactivation confirmations, optimistic version conflicts |
| S4-FE-03 | Pages/news/services create, edit, publish and delete, native and whitespace validation, error retention, unsaved-change warnings |
| S4-FE-04 | Permission-gated routes and controls, submission/payment/activity reports, UTC date filters and bounded cursor pagination |

FE and BE implementations consume the same permission contract. **Human FE/BE
agreement is pending**; this document does not claim that either team has signed off.
Review the matrix, service publication semantics, search field, version conflicts,
and UTC report range rules together before rollout. No messages were sent to teams.

## RBAC and API behavior

- The initial profile route guard is followed by a fresh `/api/auth/me` check. No
  dashboard data loads until permissions arrive. Direct unauthorized tab URLs deny
  access without sending the protected request. Unknown or absent permissions deny.
- Every API still runs server authorization. Permissions in the browser are UI
  hints, not access tokens. A 401 or 403 removes the admin view and exposes recovery.
- Only super admins see role assignment. Self-mutation and inactive targets are
  disabled; admins cannot mutate admin-level targets. Database rules still enforce
  hierarchy, last-super-admin protection, version checks and audit writes.
- 409 disables mutation retry until the latest target has been fetched and reviewed.
  Reload resets the proposed role. No silent overwrite or automatic mutation retry.
- User search uses `q`, trimmed to 1–100 characters, against name/email. LIKE
  wildcards and PostgREST filter syntax are escaped separately.
- CMS uses `/api/{pages,news,services}/manage` for lists and the existing guarded
  POST/PATCH/DELETE routes. Drafts remain in memory on validation and server errors.
  Pages/news publish as `published`; services publish as `available` and are initially
  `coming-soon`. Save preserves an existing status. Services require an existing
  department ID. Optional service fields not edited by this form are preserved.
- Editor Cancel/Close/Escape, browser Back, in-app route navigation, reload and tab
  close warn about unsaved changes. Browser unload prompts require user interaction.
- Reports use required UTC `from` inclusive and `to` exclusive (up to 366 days).
  Both cursor fields retain timestamp precision and the applied range. Decimal
  payment amounts remain strings, with currencies separate. No CSV export or
  database-wide financial aggregation is inferred from a report page.

## Week 7 mock layout

Set `VITE_DASHBOARD_PREVIEW=true` in local frontend development configuration, then
run `npm run dev --prefix frontend` and open `/admin-preview`. The route also checks
`import.meta.env.DEV`; production builds cannot enable it. It has a persistent mock
banner, sample counts and section navigation, and sends no protected dashboard API
requests. It does not replace failed live requests with sample data.

## Verification

Run:

```sh
npm run lint --prefix frontend
npm run test --prefix frontend
npm run test:admin --prefix frontend
npm run test:browser --prefix frontend
npm run build --prefix frontend
npm run contracts:check --prefix backend
node --test backend/test/admin-permissions.test.cjs backend/test/admin-users.test.cjs backend/test/admin-reports.test.cjs
```

Browser tests use isolated fake sessions and intercepted API responses; backend HTTP
tests use real controllers, DTO validation and guards with a fake data client. They
do not prove hosted database configuration. Existing backend database tests cover
transactional RBAC and reporting independently (`npm run test:db --prefix backend`).
Apply canonical backend migrations and perform a staging test with real accounts
before production rollout. No remote database changes or deployment were performed.

Validation recorded on 2026-10-09:

- 12 distinct Sprint 4 browser scenarios passed across the main run and targeted
  reruns. The deactivation test's ambiguous button selector was corrected.
- All 18 existing foundation/public-content browser regression tests passed.
- All 19 frontend unit tests and 12 backend permission/user/report tests passed.
- Frontend TypeScript, backend compilation, OpenAPI snapshot check, frontend
  production build and `git diff --check` passed.
- Desktop and 375px mobile preview screenshots were captured; mobile overflow was
  checked in-browser. External image assets are intentionally blocked in tests.
- Vite reports the existing large application bundle warning; the build succeeds.
- Windows sandbox child-process restrictions required rerunning browser/Node tests
  with execution permission. Hosted database and staging checks were not run.

SDK references reviewed: [Supabase session access](https://supabase.com/docs/reference/javascript/auth-getsession)
and [PostgREST OR filters](https://supabase.com/docs/reference/javascript/or).
