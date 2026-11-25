# Restore public About pages without CMS migrations

Base: `main`. Head: `codex/r21-public-pages-hotfix`, isolated from `c39d360`.

Empty About publications or public-database 503s currently leave seven public pages blank. Restore the historical profile, seal, history, vicinity, hymn, demographics and location objects from `d173477^`. Published records take precedence. The fallback is limited to these seven pages; officials, services and other database-managed content retain their publication boundary. Other service errors propagate.

Also distinguish an unpublished chart from an invalid response, validate chart fields and history timelines before rendering, catch synchronous loaders through the existing retry state, and preserve zero map coordinates. Existing municipal copy is restored, not newly certified. No schema, dependency, authentication, MFA, RBAC, audit or storage change is included.

## Changed files

```text
backend/src/api/about/about.service.ts
backend/src/api/about/static-pages.ts
backend/test/about-contract.test.cjs
backend/test/about-recovery.test.cjs
frontend/src/components/ReportingChart.tsx
frontend/src/pages/ContentPage.tsx
frontend/src/pages/OrganizationalChartPage.tsx
frontend/src/pages/about/LocationView.tsx
frontend/src/services/aboutApi.ts
frontend/playwright.hotfix.config.ts
frontend/test/browser/public-recovery.spec.ts
frontend/test/react/public-recovery.test.tsx
docs/r2/PUBLIC_PAGES_HOTFIX_PR.md
```

## Validation

2026-11-25 results: backend/frontend production builds PASS; frontend TypeScript and backend ESLint/TypeScript PASS; frontend Node 17/17 PASS; focused React 3/3 PASS; backend recovery/security 15/15 PASS; production-preview browser 13/13 PASS; whitespace check PASS. Existing chunk-size and mixed static/dynamic import warnings remain. No full-suite or hosted qualification is claimed.

Run on the isolated c39d360-based worktree using Node 22.16.0 and existing installed dependencies (unchanged lockfiles):

```powershell
npm run build
npm run lint
npm test --prefix frontend
cd frontend
node node_modules/vitest/vitest.mjs run test/react/public-recovery.test.tsx
node node_modules/@playwright/test/cli.js test --config playwright.hotfix.config.ts --reporter=list
cd ../backend
node --test --test-concurrency=1 test/about-contract.test.cjs test/about-recovery.test.cjs test/final-security.test.cjs
```

Browser coverage uses Vite preview of production output, mocked API responses and blocked external hosts. It covers seven About routes and unpublished chart at 375/1280px, published history, malformed timeline, anonymous 401, and existing public services/news/error cases. Backend tests exercise published precedence, empty data, missing-relation errors through PublicContentService, bounded recovery and security behavior. This is not hosted database qualification or verification of external image/tile availability.

## PR actions — only after separate authorization

From this worktree:

```powershell
git fetch origin main
git log --oneline HEAD..origin/main
# If main advanced, reconcile and rerun the focused checks before publishing.
git push -u origin codex/r21-public-pages-hotfix
gh pr create --repo rynzz22/Talibon-Official-Website-BetaTest-V1.5 --base main --head codex/r21-public-pages-hotfix --title "fix(public): restore About content without CMS migrations" --body-file docs/r2/PUBLIC_PAGES_HOTFIX_PR.md
```

## Independent deployment

Application compatibility: no new SQL or schema prerequisites. The deployed PublicContentService remains unchanged; missing-object failures recover only the historical static pages. The frontend and small About API change must ship together. Do not deploy just frontend/dist.

Operational caveat: automatic Git deployment is disabled in vercel.json. The existing production-release workflow requires a complete migration ledger and readiness; it cannot currently be used unchanged with pending 003/004. Do not change its checks or claim a successful full CMS release. An independently authorized public-hotfix release procedure is required.

After PR approval/merge AND separate deployment authorization, the release owner must confirm the exact merged SHA, existing Vercel project, serving deployment/alias, unchanged runtime database and private-storage bindings, and rollback target. Use a clean checkout of that SHA with the approved pinned VERCEL_CLI_VERSION and existing project credentials. The following prepares an unaliased candidate; it does not run migrations:

```powershell
npm ci --include=dev
npm ci --include=dev --prefix backend
npm ci --include=dev --prefix frontend
npx --yes "vercel@$env:VERCEL_CLI_VERSION" pull --yes --environment=production --token="$env:VERCEL_TOKEN"
npx --yes "vercel@$env:VERCEL_CLI_VERSION" build --prod --token="$env:VERCEL_TOKEN"
npx --yes "vercel@$env:VERCEL_CLI_VERSION" deploy --prebuilt --prod --skip-domain --token="$env:VERCEL_TOKEN"
```

Stop on any nonzero exit. Before promoting the returned candidate URL, verify all seven actual About APIs and routes anonymously, published precedence where a published page exists, chart empty/error handling, map/timeline rendering and public 401 behavior. Confirm the candidate's bindings and review function logs. CMS readiness failures remain blockers for CMS activation, not evidence that this static-page recovery failed. Only with release approval promote that verified URL using `vercel promote <candidate-url> --yes`; recheck the public alias. If regression occurs, promote the previously recorded full serving deployment URL. Do not guess a rollback URL from the short deployment ID.

## Remaining hosted CMS requirements

003/004, effective privilege remediation, deployment-specific bindings and protected database/private-media recovery remain unverified and outside this PR. Preserve existing gates. Activation requires separately authorized preflight, recoverable backup/restore evidence, reviewed migration/privilege application and real hosted MFA/upload/attach/publish/anonymous-retrieval acceptance. No hosted actions, push, merge or deployment were performed for this hotfix.
