# Sprint 4 authorization (S4-BE-01)

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
