# Sprint 5 search contract and frontend

Tickets: S5-INT-01 (2 pts), S5-FE-02 (3 pts). Roadmap Phase 5, Weeks 9–10.
Prepared 2026-10-09. Depends on S5-BE-01.

## Contract for review

The existing S5-BE-01 endpoint is authoritative. Its controllers and DTOs now
generate the search operation in [OpenAPI](../contracts/openapi.json), alongside
the prior authentication, public content and admin operations. Regenerate with
`npm run contracts:export --prefix backend`; check drift with
`npm run contracts:check --prefix backend`. Do not edit the snapshot manually.

`GET /api/search`, public, `X-API-Version: 1`:

| Query | Contract |
| --- | --- |
| `q` | Required, trimmed, 1–100 characters |
| `type` | `all` (default), `news`, `services`, `pages` |
| `category` | Exact category/department, trimmed, at most 100 characters; blank means no filter |
| `sort` | `relevance` (default) or `date` |
| `page` | Integer ≥ 1, default 1 |
| `limit` | Integer 1–50, default 10 |

Unknown query fields and invalid values return 400. Search storage failures
return 503. Rate limits return 429 with `Retry-After`; the UI displays a wait
message and provides manual retry. There is no automatic retry loop.

The response is `{ data, meta, facets }`, **not** the content list's
`{ data, pagination }`. Each result has `id`, `type`, `title`, `slug`, `snippet`,
`category`, `created_at`, and numeric `score`. `meta` contains `total`, `page`,
`limit`, `totalPages`; totals reflect applied filters, with zero pages for zero
matches. An out-of-range page has empty `data` and preserves the filtered total.

`facets.byType` has counts for news/services/pages. `facets.byCategory` contains
up to 20 categories ordered by match count. Both describe all query matches
**before** type/category filtering and pagination, so counts need not add up to
the filtered total. The UI retains a selected category even when absent from
the current facets. Type changes clear the category. Filter, sort, page-size and
query changes reset to page 1.

Relevance orders by score descending, then creation date descending, then ID
descending. Date sort ignores score. The existing backend uses PostgreSQL full-text
search with phrases, OR and exclusions. Only public, non-deleted content is searched.
See [backend details](../backend/docs/search-api.md).

## Mock and UI

Run `npm run dev:mock --prefix frontend`, then open
`http://localhost:5173/search?q=municipal&limit=1`. The mock has three results
derived from the same OpenAPI content fixtures used by detail routes. It handles
query validation, type/category filters, pagination, sorting, empty results and
query-wide facets. Fixture matching supports literal words, quoted phrases, OR,
and exclusions. It does not emulate PostgreSQL stemming, stop words or ranking
scores; validate linguistic relevance against the deployed S5-BE-01 index.
The mock does not emulate rate limiting or storage outages; browser tests inject
429/503 and delayed responses to exercise these states.

The `/search` page supports type, category/department, sort and results-per-page
controls. Query state is stored in the URL, including pagination, and restored
on reload/back/forward. The existing search popup links to the full page.
Results link by ID to `/news/view/:id`, `/services/:id`, and `/pages/:id`.
Snippets render as text. Loading, empty, invalid-query, out-of-range and retry
states are accessible; superseded requests are aborted. No request is made for
blank or overlong queries. Invalid URL enum/page-size values fall back to defaults.

## Verification

```sh
npm run lint --prefix frontend
npm test --prefix frontend
node --test backend/test/search.test.cjs
npm run contracts:check --prefix backend
npm run test:contracts:browser --prefix frontend -- search-contract.spec.ts public-contract.spec.ts --timeout=90000
npm run test:browser --prefix frontend -- public-content.spec.ts --timeout=90000
npm run build --prefix frontend
```

Backend tests require a prior backend build and use a stubbed search RPC.
Browser tests use the real Vite proxy and the contract fixture server at mobile
and desktop widths. They cover filters, facets, pagination, URL history, result
navigation, blank/empty/out-of-range states, loading, retry, rate limiting and
superseded requests. They do not establish live database availability.

Validation on 2026-10-09: frontend type checking, backend compilation and OpenAPI
drift checks passed; all 21 frontend unit/mock tests, 5 backend search tests and
7 search/public-contract browser checks and 8 existing public-content browser
regressions passed. The production frontend build
passed with Vite's large-chunk warning (main JavaScript bundle about 1.93 MB
before gzip). Browser checks used a 90-second test timeout for cold dev startup.

## Acceptance and sprint handoff

Implementation aligns query, filters and result shapes across BE documentation,
generated OpenAPI, the typed FE client and the mock. **BE/FE reviewer agreement
is pending**, not inferred from tests. Record reviewer names, acknowledgement
date and review/issue link here when available. S5-INT-01's human agreement
criterion remains open until that happens; the mock and S5-FE-02 implementation
are ready for review.

Start this integration handoff in Week 9. Preserve the sprint sequencing:
AI endpoints lead chatbot UI by approximately one week; maps use external APIs
independently. These search tickets do not change chatbot or map integration.
