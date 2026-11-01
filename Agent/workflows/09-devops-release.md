# Workflow: Vercel, CI, staging and release
**When:** `.github/workflows/`, `vercel.json`, `ops/`, environment templates.

1. Confirm frontend + NestJS routing, API health/readiness behavior, environment separation and cache/security headers.
2. Gate releases on lint, builds, API/React/browser tests, Supabase runtime exclusion, API 410 shutdown, migration verification, backup/restore, storage ACL, auth/MFA acceptance and vulnerabilities.
3. Monitor via real scheduler/alert delivery evidence; skipped jobs are not passing production monitoring.
4. Use staging-first deployment, private secrets, limited credentials, smoke tests and rollback rehearsal; record deployment ID and owner signoff.
5. Do not execute destructive prod commands or alter Vercel/Neon production resources without approval.
**Done:** honest release decision: QUALIFIED / NOT QUALIFIED with blocking items and evidence links.
