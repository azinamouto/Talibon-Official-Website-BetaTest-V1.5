# API contract and frontend handoff

Tickets: S1-INT-02, S2-INT-01, S2-FE-02. Prepared 2026-10-07.

## Source of truth

OpenAPI is the wire contract. Backend OpenAPI decorators/response definitions produce
[`contracts/openapi.json`](../contracts/openapi.json), the committed review artifact
for Sprint 1 authentication and Sprint 2 content/About endpoints. Never edit that
generated file directly. The full live API remains available at `/api/openapi.json`
and `/api/docs`. Other modules are outside this snapshot's scope.

From the repository root:

```sh
npm run contracts:export --prefix backend
npm run contracts:check --prefix backend
npm run dev:mock --prefix frontend
```

The last command starts the loopback example API on port 4010 and Vite on 5173.
No backend credentials or running database are required for About development.
Other site modules are outside the fixture server's scope and may show unavailable
states. Auth examples contain deliberately invalid tokens; this server is not an
auth emulator. Writes/staff content reads return 501 and never mutate data.
For API-only work run `npm run mock:api --prefix frontend`.

For live development run the normal backend and `npm run dev --prefix frontend`
with the project's configured environment. Both modes use the same `/api/*`
requests through Vite's proxy. Mocks are process-only, never imported by the app
or included in production output.

## Sprint 2 contract scope

| Endpoint | Response |
| --- | --- |
| `GET /api/pages`, `/api/news`, `/api/services` | `{ data: [...], pagination: { page, limit, total, totalPages } }` |
| `GET /api/pages/{id}`, `/api/news/{id}`, `/api/services/{id}` | `{ data: {...} }`; UUID lookup |
| `GET /api/about/profile`, `/history`, `/industry`, `/demographics` | `{ title, content }` |
| `GET /api/about/seal` | `{ title, description }` |
| `GET /api/about/mayors`, `/departments` | Arrays of sections or departments; see OpenAPI properties |
| `GET /api/about/barangays` | String array; FE adapts names to view objects |
| `GET /api/about/vicinity-map`, `/hymn`, `/location` | Map/image/location objects; see OpenAPI properties |

List requests default to page 1, limit 20; maximum limit 100. They accept `q` and
`slug`; news also accepts `category`, services `office_responsible`. Anonymous
content reads expose published/available records only. About services consumes
`/api/services`, not the legacy `/api/about/services` feed. The mock derives all
response fixtures from OpenAPI, supports those filters/pagination and unknown-ID
404s, but is not a complete request-validation or authorization emulator.

Examples reproduce existing editorial content and are not freshly verified civic
facts. The barangay names endpoint does not provide population/contact details.
The existing About pages retain responsive layouts, route aliases `/about` and
`/about/mayor`, and loading, empty, error, and retry states.

## Change and announcement policy

Every contract change must include regenerated OpenAPI, updated examples, passing
contract checks, and BE/FE review. Breaking changes include path/method removal,
required input additions, response field removal/type changes, authentication
changes, and pagination/envelope changes. Before merging any breaking change,
the owner must announce it in the team channel and link that announcement in
the PR, with affected endpoints, before/after examples, migration instructions,
owners, and rollout date. Retain compatibility until affected FE work is ready.
The PR checklist records this requirement; snapshot checks detect drift, not
semantic compatibility. Reviewers must classify compatibility explicitly.

## Handoff message ready to post

> S1-INT-02 / S2-INT-01: OpenAPI and shared response examples are ready for BE/FE
> review in contracts/openapi.json. Start FE mocks with npm run dev:mock --prefix
> frontend. About routes now consume the HTTP contracts; switch to live through
> the normal dev command. Please confirm endpoint shapes/examples and record
> sign-off in this thread. BE leads auth by 2–3 days in Sprint 1 and content by
> about one week in Sprint 2; UI framework/API architecture can proceed in parallel.
> Breaking API changes require a team-channel announcement before merge.

**Pending external acceptance:** BE reviewer, FE reviewer, team/sprint channel
destination, posted-message permalink, and acknowledgement date. This document
does not claim that agreement or a channel announcement has already happened.
