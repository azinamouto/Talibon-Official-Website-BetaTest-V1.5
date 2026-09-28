# S7-BE-02 migration and rollback runbook

Status: production application and hosted staging rehearsal pending. No remote
database has been changed. Run this before any backend/frontend production deploy.

## Release gates

1. Record S6-INT-01 sign-off, release commit, database operator, staging/production
   references, previous deployment IDs, maintenance window and backup/restore owner.
2. Compare production schema and migration history with the seven files in
   `supabase/migrations/`. This is a **fresh-project** chain. For populated or legacy
   V4 databases, reconcile on a staging clone and review an additive upgrade plan
   first. Never replay the baseline or use migration repair to hide schema drift.
3. Freeze writes, payment callbacks and email workers while taking comparison
   snapshots and backups. Define recovery-point and recovery-time objectives with
   the owner; restoring a backup loses writes after that backup.
4. Verify a recent Supabase backup/PITR recovery point is usable. Include Auth,
   Storage metadata, object bytes (separate backup), secrets, SMTP, Edge Functions,
   scheduled workers and project configuration in the recovery inventory. A public
   schema SQL dump alone is not a complete Supabase recovery plan.

## Apply and verify

Use a pinned Supabase CLI version, checking `supabase --help`, `supabase link --help`,
`supabase migration list --help`, and `supabase db push --help` before use. Keep
access tokens/passwords in secret environment variables. Do not paste them into logs.

1. Link staging with `supabase link --project-ref <confirmed-staging-ref>`.
2. Run `supabase migration list` and `supabase db push --dry-run`. Review the exact
   ordered pending migrations. Stop on unexpected history or a populated baseline.
3. Capture pre-migration data with `psql -X -qAt -v ON_ERROR_STOP=1 -f
   supabase/operations/data-snapshot.sql` using protected PG connection settings.
   This emits table counts and aggregate fingerprints, never row contents.
4. Run `supabase db push` only after the staging backup exists. Run
   `psql -X -v ON_ERROR_STOP=1 -f supabase/operations/verify-launch.sql`, repeat the
   snapshot, and reconcile all count/fingerprint changes against intended migrations.
   Added columns/seed data change fingerprints; document those differences explicitly.
   Verify representative auth, content, form, admin and payment records privately.
5. Rehearse rollback on hosted staging as below. Attach timestamps and sanitized
   evidence; no production run until this passes.
6. Link the confirmed production project, independently recheck project identity,
   migration history, dry run and recoverable backup, then repeat steps 3-4.
7. Proceed in order: backend deploy -> frontend deploy -> smoke tests. The current
   single-project Vercel deployment is atomic; resolve the separate-project decision
   in launch-environment.md before claiming strict sequential deployment.

## Rollback procedure

On failed SQL, unexpected data loss, failed RLS checks or failed readiness: stop the
release and keep writes/workers paused. Capture the failed migration and database
history. Do not blindly retry or mark migrations applied.

For application regressions with a compatible additive schema, restore the recorded
previous Vercel deployment(s); leave compatible additive migrations in place.
For data/schema damage, have the database operator restore the verified pre-release
Supabase backup/PITR point using the supported project restore procedure. Do not run
`supabase db reset --linked` or generic DROP/down scripts on production. Restore
Storage object bytes separately if affected. Confirm Auth, RLS, grants and migration
history agree with the restored release before resuming traffic.

On hosted staging: take a recoverable backup, apply the exact release, verify data,
restore the backup, verify snapshot equality and old-app compatibility, then reapply
and verify the new release. Time restore/reapply and record actual RPO/RTO. Test login,
readiness, public content, private form ownership, admin access, and worker recovery.
Only resume writes and workers after the checks pass and routing points to the
matching backend/frontend release. Hosted backup restoration is operator-controlled;
the local script intentionally accepts no remote URL.

## Local rehearsal and evidence

`powershell -NoProfile -ExecutionPolicy Bypass -File backend/test/rehearse-launch-rollback.ps1`

Creates a new loopback PostgreSQL cluster, applies all migrations with Auth/Storage
stubs, checks the schema, backs up, changes seeded data, detects that change, restores
to another database, compares every public table plus auth.users, and verifies that
disabling RLS makes the gate fail. Retains logs in the printed temporary directory.
This validates local SQL and restore mechanics, not hosted Supabase recovery.

| Evidence | Required recorded result |
| --- | --- |
| Local migration/restore rehearsal | PASS 2026-09-28, PostgreSQL 18.6, 11.7s; evidence directory `talgov-launch-d7def2046dad4d778dc28adbe4da002a` under the operator's temporary directory |
| Hosted staging migration + restore + reapply | Pending; target not confirmed |
| Production before/after verification | Pending; target not confirmed |
| Backup ID and measured RPO/RTO | Pending; operator must record |
| Production migration history and release commit | Pending |

References: [Supabase environments](https://supabase.com/docs/guides/deployment/managing-environments),
[backups](https://supabase.com/docs/guides/platform/backups).
