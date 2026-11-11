# Deployment isolation and CI repair — 2026-11-10

Historical investigation snapshot. The current scope, verification results and
post-commit push gates are in [R2 consolidation and fresh deployment](R2_CONSOLIDATION_AND_FRESH_DEPLOYMENT.md).
Its procedure supersedes the pre-commit commands below; do not restage only the
original seven files after the later browser repairs.

Decision: **NOT QUALIFIED; do not push, merge or deploy yet.**

Worktree: `C:/Users/admin/Documents/TalGov-Final-Backend-Migration`.
Branch: `feat/talgov-r2-staging-qualification`. Start and end HEAD:
`261a8d236d4b995c6ed8c63b822b91f9a6aabbb0`. All five commits
(`bad01ea`, `f5d73ac`, `12fc11e`, `d6d3903`, `261a8d2`) remain intact.
Repairs are uncommitted local edits. No remote writes, production secrets,
migration edits, pushes, merges or deployments were performed.

## Verified triggers

Read-only GitHub API inspection confirms the prior handoff:

| Event | GitHub Actions | Independent Vercel Git App |
| --- | --- | --- |
| Feature push | Runtime exclusion; this repair also enables backend/database and frontend checks | Preview deployments for both linked projects observed at `bc0a097` |
| PR open/update | Backend/database, frontend, runtime checks | Preview deployment activity; Actions success is not a prerequisite evidenced here |
| Merge/push to main/master | Backend/database, frontend, runtime checks | Main merge `f88109a` produced Production deployments for both projects |
| Manual production release | `workflow_dispatch`, `R2_PRODUCTION_QUALIFIED == 'true'`, default-branch check, `production` environment | CLI production build, production candidate with `--skip-domain`, smoke, then promotion |

The two linked project names are `talibon-official-website-beta-test-v1-7` and
`talibon-official-website-beta-test-v1-8`. GitHub deployment IDs:
Production `7655288982`, `7655330421`; Preview `7655234295`, `7655201635`.
The v1-8 production status was independently rechecked as successful.
Production records were created November 9 at 20:59 and 21:01 Asia/Shanghai.
GitHub's generic `production_environment` flag is not reliable evidence of
isolation; these records are named Production despite the historical false flag.

`production-release.yml` is the only checked-in CLI deployment workflow. Its
manual gate does not control Vercel's Git App. `--skip-domain` does not make its
production-configured candidate an isolated preview.

Database backup and production monitor are scheduled/manual, variable gated
operations, not deployment workflows. Social previews are scheduled/manual,
variable gated and can commit/push the refreshed cache; that Git update must
also be considered when disabling Vercel auto-deployment. Backend load is manual.
No repository webhooks were listed; GitHub Apps operate independently of that list.

## Isolation and minimum controls

**Preview/Production isolation is unverified, not established.** There is no
Vercel connector/project metadata available in this worktree proving the two
projects' root directories, production branches, effective configuration,
environment scopes, deploy hooks or domain bindings. No credentials were pulled.

GitHub currently returns no repository Actions variables, no rulesets, and
`Branch not protected` for main. Listed environments have no protection rules
or deployment branch policies. The `Production` environment therefore does not
currently supply a required-reviewer gate. Organization/environment variable
inheritance and secret scopes were not audited.

Repository changes:

- Root `vercel.json`: `git.deploymentEnabled: false` disables Git-triggered
  deployments for all branches when this file is the effective project config.
  Build commands, same-origin API routing, CSP and all other security headers stay intact.
- `ops/test/production-gates.test.mjs`: regression guard against removing that switch.
- Backend and frontend workflows: run on all pushes as well as PRs. No tests,
  coverage thresholds, failure propagation or release gates were removed.
- Frontend contract test: assert 501 and explicit unsupported-write message;
  also assert that the active POST contract is no longer retired with 410.
- R2 database test: assert anonymous content POST returns 401 and cannot add a
  content row. Application authorization, MFA, rate limiting and migrations stay intact.

Vercel documents the Boolean switch at
https://vercel.com/docs/project-configuration/git-configuration . It is not a
ban on manual CLI/API deployments, deploy hooks, redeployments or promotions.
Do not rely on it alone for the first push, especially if either project uses a
different root or configuration override.

An authorized owner must verify these external controls before the first push:

1. Inventory every Vercel project connected to the canonical repository, including
   both observed projects. Disable/disconnect Git auto-deployment at the provider
   before pushing the safeguard. Verify no queued deployment or deploy-hook
   automation can deploy the candidate. Record sanitized settings evidence.
2. Verify effective root/config path and production branch for each project.
   Keep production domains exclusively bound to production. Keep the Git switch
   disabled after merge; release through the deliberate manual workflow only.
3. Verify Preview uses separate non-production database/branch and runtime role,
   auth/session/MFA secrets and trusted origins, private storage bucket/credentials,
   email sandbox and other provider credentials. Inspect metadata/scopes privately;
   do not copy secrets into evidence. No production credentials in Preview or
   all-environment scopes. A preview URL alone is not isolation.
4. Keep production qualification false/unset. Configure required reviewers and
   default-branch-only access for the production environment; scope production
   credentials there. Protect main with required frontend, backend, database and
   runtime checks and review, including the deployment configuration changes.

## Validation

Both baseline failures were reproduced before edits and match the historical
GitHub logs: frontend 11 pass/1 fail (`501 !== 410`), R2 database 12 pass/1 fail
(`401 !== 410`). Sources:

- https://github.com/azinamouto/Talibon-Official-Website-BetaTest-V1.5/actions/runs/42620828336
- https://github.com/azinamouto/Talibon-Official-Website-BetaTest-V1.5/actions/runs/42620828341

Verified local results:

| Command | Result |
| --- | --- |
| `npm run lint --prefix frontend` | Passed |
| `npm test --prefix frontend` | 12/12 passed |
| `npm run test:coverage --prefix frontend` | 17 files, 102/102 tests passed; statements 98.94%, branches 96.06%, functions/lines 100%; existing thresholds unchanged |
| `npm run build --prefix frontend` | Passed; existing 1.31 MB bundle warning |
| `npm run lint --prefix backend` | ESLint and TypeScript passed |
| `npm test --prefix backend` | Build passed; Jest 3/3 and Node 80/80 passed |
| `node backend/scripts/export-openapi.cjs --check` | Passed; no contract changes |
| `npm --prefix backend run test:r2:db` | 13/13 passed; backup/restore reconciled 9 tables, 21 rows, exact digests, migration checksums, grants and constraints |
| `npm --prefix backend run test:auth:db` | 8/8 passed, including real password/TOTP and replay rejection |
| `npm --prefix backend run test:media:db` | 10/10 passed; local database, fake object store |
| `npm run test:ops` | 17/17 passed |
| `node ops/check-runtime.mjs --artifacts` | Passed, 409 files |
| `git diff --check`; parse edited workflows with `js-yaml` | Passed |

All disposable database servers stopped after testing. Browser and dependency
audit results are recorded separately below. Remote CI is not rerun because
pushing is blocked. Local Node is 22.16.0; PostgreSQL is 18;
Windows local results do not certify the Ubuntu GitHub frontend runner.

## Exact conditional push procedure

Only after the external isolation checks above have recorded evidence:

```powershell
Set-Location C:\Users\admin\Documents\TalGov-Final-Backend-Migration
git status --short
git remote get-url canonical
# Must be https://github.com/azinamouto/Talibon-Official-Website-BetaTest-V1.5.git
git merge-base --is-ancestor 261a8d236d4b995c6ed8c63b822b91f9a6aabbb0 HEAD
if ($LASTEXITCODE) { throw 'Original five commits are not preserved' }
git diff --check
if ($LASTEXITCODE) { throw 'Review whitespace errors' }
git diff
# Review only these seven files; exclude traces, env files and database artifacts.
git add -- vercel.json .github/workflows/backend.yml .github/workflows/frontend-ci.yml backend/test/r2-database.integration.cjs frontend/test/contract-mock.test.cjs ops/test/production-gates.test.mjs docs/r2/DEPLOYMENT_ISOLATION_CI_REPAIR.md
git diff --cached --check
if ($LASTEXITCODE) { throw 'Review staged diff' }
git diff --cached
git commit -m 'Disable automatic Vercel deployment and repair R2 CI assertions'
if ($LASTEXITCODE) { throw 'Commit failed' }
git push --dry-run canonical HEAD:refs/heads/feat/talgov-r2-staging-qualification
if ($LASTEXITCODE) { throw 'Resolve destination or non-fast-forward conflict without force' }
# Dry-run only checks Git; it does not verify deployment isolation.
git push canonical HEAD:refs/heads/feat/talgov-r2-staging-qualification
```

Verify the pushed SHA runs backend/database, frontend and runtime checks and
creates no Vercel deployment. Open the PR against canonical main; require all
checks on the PR merge result. If the base advances, integrate by a reviewed
merge and rerun checks without rewriting the five commits. Merge only after
isolation and required checks are verified, then confirm main did not deploy.
Production release remains a separate qualified, approved operation.

Remaining release gates include hosted staff/MFA and real storage/content E2E,
intermittent staging 503 investigation, security/dependency review, official-data
signoff and recovery acceptance. This CI repair does not certify those gates.
No migration or database rollback is needed for these repository-only changes.
