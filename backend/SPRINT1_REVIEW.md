# Sprint 1 backend review

## Branch stack

1. `feature/s1-be-01-replayable-schema` on `feature/phase1-backend-foundation`
2. `feature/s1-be-02-api-contract-ci` on the schema branch
3. `feature/s1-be-03-04-auth-security` on the API/CI branch

Review each branch against its immediate parent. Dependency/lockfile changes are
separate from API code. No generated builds or pre-existing untracked user files
are included. No hosted database was modified and no branch was merged.

| Ticket | Implemented and locally verified | Remaining acceptance |
| --- | --- | --- |
| S1-BE-01 | Canonical schema for users, roles, content, requests and payments; ordered empty-DB replay; real PostgreSQL RLS tests | Human FE schema sign-off before merge; staging migration-history reconciliation for existing projects |
| S1-BE-02 | Nest modules/config, validation/errors, version convention, reachable generated Swagger, lint/Jest PR workflow | Hosted CI result after opening PR; repository owner enables required checks |
| S1-BE-03 | Signup/login/logout/refresh adapter, JWT/session guard and role decorator, guard unit tests, FE handoff | S1-INT-01 project configuration and real Supabase auth round trip |
| S1-BE-04 | Exact CORS allowlist, security headers, auth/category rate limits, environment-only secrets, DTO validation | Shared/gateway limiting before multi-instance production deployment |

## Local verification (2026-09-21)

- `npm run lint --prefix backend`: ESLint and TypeScript passed.
- `npm test --prefix backend`: build, 22 Jest tests and 14 HTTP/deployment tests passed.
- `npm run test:db --prefix backend -- -Advisors`: fresh canonical migration
  replay plus canonical/V4 upgrade compatibility, RLS assertions and security
  advisors. Supabase-owned schemas are modeled by local fixtures; this does not
  test GoTrue, PostgREST, email delivery or a hosted Supabase project.

See [database contract and FE checklist](../supabase/README.md) and
[frontend auth/API handoff](PHASE1.md). Human approvals are pending, not implied by
passing automated tests.
