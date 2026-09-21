# Sprint 1 database contract (S1-BE-01)

`migrations/` is the ordered, fresh-project chain. Its baseline combines the
existing canonical schema with RLS hardening atomically; no permissive intermediate
schema is committed. Requires PostgreSQL 15+ and Supabase-owned auth/storage schemas.
For plain PostgreSQL testing only, `backend/test/supabase-stubs.sql` supplies those
schemas. Run `npm run test:db --prefix backend` to replay every migration on an
empty disposable database and test authorization with real PostgreSQL roles.

`legacy-migrations/` preserves incompatible historical layouts and the additive
hardening migration for existing installations. Never replay that directory.
Existing projects must reconcile their migration history in staging before using
the fresh chain: do not push the baseline onto a populated database or mark it
applied without comparing the actual schema. No remote migration history was changed.

## Schema and RLS review

| Requirement | Canonical tables / relationships | Access policy |
| --- | --- | --- |
| Users and roles | auth.users -> profiles; profiles.role -> roles.id | Own profile read/name update; verified municipal admins read profiles; role writes server-only |
| Content | news, events, tourism_spots, dynamic_pages and related CMS tables | Published/active, nondeleted rows public; verified municipal admins/editors can edit |
| Form submissions | certificate_requests -> workflow_history | Private; verified municipal admins/staff read; writes through trusted API |
| Payments | payments.request_id -> certificate_requests.id | Verified municipal admins read; server writes only |
| Notifications | notifications.user_id -> auth.users | Own rows only; client can change only is_read |
| Audit | security_audit_events.actor_id -> auth.users | Server writes; verified municipal admins read |

Reviewed in code: RLS on public tables, restricted column grants, protected role
lookup, fixed definer search paths, revoked privileged RPCs, invoker views,
and ownership checks for storage. The database security suite exercises anonymous,
citizen, staff and admin access, escalation attempts, and revoked sessions.
Citizens retrieve private request/payment data through authorized API endpoints;
there is deliberately no direct browser SELECT grant for their private records.

## Required pre-merge review

- [ ] FE lead: confirm role names, profile fields, form and payment relationships.
- [ ] FE lead: confirm public content filters and server-only private-record access.
- [ ] Backend reviewer: review the RLS matrix and database test results.
- [ ] Integration owner (S1-INT-01): confirm target Supabase project, email
      confirmation settings and staging auth flow results.

Review status: pending human FE sign-off. Do not merge until it is recorded in the PR.
