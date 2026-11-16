# First website administrator: staging operator runbook

This tooling creates a TalGov website account, not an infrastructure administrator. The isolated staging administrator has already been provisioned; its bootstrap is consumed. Do not run this command again against that database. The user has reported successful MFA login. No provisioning or hosted verification was performed during GitHub integration.

The reviewed implementation is `backend/src/authentication/first-admin-bootstrap.ts`, invoked only by the local scripts in `backend/scripts/`. There is no HTTP bootstrap endpoint. Public signup remains disabled.

For an explicitly approved, uninitialized staging target only, build locally and open an interactive PowerShell console in `backend`:

```powershell
npm run build:tsc
./scripts/bootstrap-first-staging-admin.ps1 -Email '<approved mailbox>' -DisplayName '<approved name>' -AuthorizeFirstStagingAdmin -ConfirmEmailOwnership
```

The wrapper requests the direct migrator URL, existing Neon metadata API key, password and confirmation through masked inputs. Secrets travel to the child through private UTF-8 stdin, never command arguments, environment variables, files or printed diagnostics. Do not use console transcripts, credential files or pasted command-line passwords.

The target is pinned to Neon project `misty-silence-69777617`, branch `br-steep-sea-ao0qw05a`, database `neondb`, direct endpoint `ep-sparkling-bird-ao5precf` and role `talgov_staging_migrator`. Select that project, branch, database and role in the Neon connection dialog; disable pooling and retain `sslmode=verify-full` and `channel_binding=require`. Remote metadata validation and effective/session-role validation must succeed. Local preflight validates inputs only; it does not prove hosted branch identity or administrator absence.

One atomic transaction uses Better Auth password hashing and writes the provider user, credential, active `admin` staff mapping and `bootstrap.admin.created` audit marker consistently. It rejects any existing administrator, consumed marker or duplicate email. MFA enrollment is still required at `/staff/login`; bootstrap does not mint sessions, TOTP secrets or backup codes.

The permanent database marker disables further use independently of CLI availability. Keep it intact, including during rollback. Local operator scripts may be removed from an operator installation after success; no hosted bootstrap flag or public route needs disabling. Do not delete the marker to recreate an account.

Stop after one failure or an unconfirmed commit. Never retry automatically. Obtain separate approval for a bounded read-only state check before further action. Use supported staff administration for later accounts; do not create them through raw SQL. Every remote execution needs its own explicit target, effects and cleanup approval.
