# Sprint 4 authorization (S4-BE-01)

## Client contract (S4-INT-01)

`GET /api/auth/me` returns `data.permissions: string[]`, derived from the live,
verified, active profile by the same server policy used by guards. The frontend
starts with no permissions and never derives access from JWT metadata. The server
remains authoritative. Missing permissions or failed identity requests deny access;
401/403 responses clear the admin view until permissions are reloaded.

| Roles | Client permissions |
| --- | --- |
| guest, citizen, staff, department_admin, barangay_admin | none |
| editor | `content:manage` |
| municipal_admin, admin | `content:manage`, `reports:read`, `users:read`, `users:update`, `users:deactivate` |
| super_admin | all above plus `users:roles` |

`content:manage` represents the existing `CONTENT_ROLES` policy for guarded
page/news/service management routes; it does not broaden those routes. Unknown,
unverified and inactive roles receive an empty array. See the shared
[FE/BE handoff](../../docs/SPRINT4_ADMIN_DASHBOARD.md). Implementation and contract
tests are recorded there; human FE/BE sign-off remains pending.

The global AuthGuard verifies the bearer token with Supabase Auth, checks the live
session, then loads the current profile. Deleted profiles are denied. Administrative
roles require `is_verified=true`. JWT metadata never grants permissions; role changes
take effect on the next request. Permission and role decorators override Public.

| Role | Reports | List/view users | Update/deactivate lower roles | Assign roles |
| --- | --- | --- | --- | --- |
| guest, citizen | No | No | No | No |
| staff, editor, department_admin, barangay_admin | No | No | No | No |
| municipal_admin, admin | Yes | Yes | Yes | No |
| super_admin | Yes | Yes | Yes | Yes |

`guest` is the initial profile role; `citizen` accesses citizen services. Staff
process submissions; editors manage CMS content. Barangay administrators have no
municipal-wide dashboard permission. Existing content and submission routes retain
their explicitly scoped staff/editor permissions. All `/api/admin` routes require
the permission model above. Unauthenticated requests return 401; authenticated
requests without permission return 403. Authorization storage failures return 503.

User management disallows self-mutation. Only super admins can manage administrative
profiles or assign roles. The last active verified super admin cannot be demoted or
deactivated. Role assignment does not implicitly verify an account.
