# Sprint 7 launch evidence — 2026-09-28

These changes prepare S7-BE-01 (#63), S7-BE-02 (#64) and S7-BE-03 (#65).
**None of these tickets is production-complete.** S6-INT-01 (#62) remains open,
the intended cloud targets are unconfirmed, and live alert delivery is unverified.

## Review branches

Three small commits on stacked branches, based on existing
`fix/s6-be-03-security-qa` commit `ce2998f`:

1. `feat/s7-be-01-deployment-health`: health/readiness routes, uncached responses,
   deployment adapter regression test, complete Vercel dependency installation,
   environment inventory and deployment topology caveat.
2. `feat/s7-be-02-migration-rehearsal`: read-only schema/data checks, local backup/
   restore rehearsal, CI rehearsal step and production rollback runbook.
3. `feat/s7-be-03-production-monitoring`: request error/latency telemetry, synthetic
   probes and alert delivery implementation, opt-in workflow and monitoring runbook.

Review each branch against its predecessor to keep changes focused. Original
uncommitted Sprint 6 load-test work remains untouched in the original workspace.

## Local validation

| Check | Result |
| --- | --- |
| Clean dependency install | Root, backend and frontend lockfiles installed with npm ci |
| Backend suite after all code changes | 54 Jest tests + 62 Node tests passed; 4 pre-existing payment webhook TODOs |
| Backend lint/typecheck | Passed |
| Frontend lint/typecheck | Passed |
| Frontend environment/security tests | 5 passed |
| Full production build | Passed with fake public anon build configuration; no real service credentials used |
| Health and monitoring failures | DB error/timeout, malformed/cached health, latency, alert failure, duplicate telemetry and private-data omission covered |
| Local rollback rehearsal | Passed on PostgreSQL 18.6 in 11.7s; all 7 migrations, data mutation detected, restored snapshot equality, missing-RLS rejection |
| Existing database regression suite | Passed fresh/canonical migrations, RLS, 100,000-row report fixtures, transactional outbox, user/audit checks, and archived V4 security regressions |
| Workflow YAML parsing | Both changed workflows parsed successfully |
| Credential scan | No tracked elevated Supabase JWT, secret-key literal or private-key block detected; local env and .vercel paths ignored |

The build still reports the existing >500 kB frontend chunk warning. Full build
without frontend environment variables correctly fails configuration validation.
Local builds are not evidence of a successful hosted Vercel deployment.

## Required external completion

* Confirm staging/production Supabase references and Vercel project(s)/domains.
  Connected account discovery returned only inactive Supabase `TAGAD` and no
  Vercel teams. Do not infer that this is the intended target.
* Finish S6-INT-01 integration sign-off, including unresolved payment settlement
  work referenced in security-qa.md. Keep launch tickets open until then.
* Configure scoped secrets and Auth/SMTP settings; verify presence without logging
  values. Confirm scheduler ownership for email delivery.
* Reconcile existing DB schema/history, rehearse hosted staging restore, apply
  production migrations and record before/after data checks. No remote SQL was run.
* Resolve separate BE/FE deployment topology. Current Vercel config promotes both
  atomically; this does not satisfy strict DB -> BE -> FE -> smoke ordering.
* Configure traffic error-rate/p95 alerts and an uptime monitor, confirm the team
  destination, receive a staging test alert, then enable the scheduled workflow.
* Deploy in the agreed order and capture hosted health plus complete smoke evidence.

See [environment](launch-environment.md), [migration/rollback](launch-migrations.md)
and [monitoring](launch-monitoring.md) for the concrete procedures.
