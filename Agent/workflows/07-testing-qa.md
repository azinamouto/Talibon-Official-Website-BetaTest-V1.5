# Workflow: QA and evidence
**When:** Every increment and bugfix.

1. Set acceptance tests from observed behavior, not future aspirations. Run focused failure reproduction first.
2. For backend: `npm --prefix backend run build`, `npm --prefix backend test` (Jest + Node suite), and lint.
3. For frontend: `npm --prefix frontend run lint`, `npm --prefix frontend run build`, `npm --prefix frontend test`, `npm --prefix frontend run test:react`.
4. For browser: `npm --prefix frontend run test:browser` and appropriate existing Playwright config; document installed-browser/env prerequisites. For ops: `npm run test:ops`.
5. For vulnerabilities: `npm audit --prefix backend`, `npm audit --prefix frontend`, root audit and prod-only audits as release evidence; do not run blind `--force` updates.
6. Verify disabled routes by real HTTP tests with spies ensuring no provider or database writes. Run DB tests on disposable PostgreSQL only.
7. Treat TODO/skipped tests, external-provider mocks, staging/hosted gaps separately. Preserve known failing checkout assertion evidence.
**Report:** exact commands, counts, failures, TODOs/skips, environment, whether fix was regression-tested.
