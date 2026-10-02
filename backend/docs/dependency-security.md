# Dependency security maintenance

The S6-BE-03 dependency branch updates the affected Nest/Express upload and query
parser dependencies within their manifest ranges and moves direct esbuild to
`^0.25.12`. No force upgrades are used.

The 2026-10-02 audit refresh additionally updates Axios to 1.20.0 in the root,
backend and frontend locks, within the existing `^1.15.0` ranges. This addresses
the advisories reported against 1.19.0, including
[GHSA-mghh-pgcx-3jjj](https://github.com/advisories/GHSA-mghh-pgcx-3jjj).

Backend Swagger 11.4.7 pins js-yaml 5.3.0. A scoped npm override uses js-yaml
5.4.2 to address
[GHSA-r3ph-w7gj-g6xm](https://github.com/advisories/GHSA-r3ph-w7gj-g6xm)
without the Swagger 12 major upgrade suggested by `npm audit fix --force`.
Remove this override when the maintained Swagger dependency itself selects a
patched js-yaml version. Check both backend tests and OpenAPI generation when
changing the override.

Reproduce validation from the repository root. The frontend build requires
public configuration. For a local build-only check without credentials, use
`VITE_SUPABASE_URL=http://localhost:54321` and
`VITE_SUPABASE_ANON_KEY=test.eyJyb2xlIjoiYW5vbiJ9.test`, matching the environment
test fixture. These values cannot authenticate against a real project.

```sh
npm ci
npm ci --prefix backend
npm ci --prefix frontend
npm audit
npm audit --prefix backend
npm audit --prefix frontend
npm run lint
npm run build
npm test --prefix backend
node --test frontend/test/environment.test.cjs
```

Audits include development dependencies. Results depend on the advisory database
at the time of execution; a past clean audit is not a continuing guarantee.

Validated on 2026-10-02 with clean installs for all three locks: zero audit
findings, frontend/backend lint and builds passing, 54 Jest plus 51 Node backend
tests passing, and five frontend environment tests passing. Swagger's resolved
js-yaml dependency also passes an OpenAPI YAML serialization round-trip. The
frontend build retains its existing large-chunk warning.
