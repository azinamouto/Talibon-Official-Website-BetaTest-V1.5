# Sprint 2 public frontend — S2-FE-03 / S2-FE-04 / S2-FE-05

Implemented October 8, 2026.

## Public routes and contracts

- `/services`: responsive service catalog, with server pagination (12 per page).
- `/services/:slug`: accepts a slug or UUID; displays published requirements,
  fees, processing time, and responsible office without invented defaults.
- `/news` and `/news/articles`, `/news/updates`, `/news/announcements`: public
  news with server pagination and title search. Page and query are in the URL.
- `/news/view/:id`: accepts a UUID or slug and renders the published article.
- `/pages/:id`: public CMS page detail, used by search results.
- Navbar search: debounced `/api/search?q=...&limit=10`, with retryable errors
  and links to news, services, and pages. It shows the first ten matches.

Public reads use `publicApi.ts` and `X-API-Version: 1`. Resource lists consume
`{ data, pagination }`; search consumes `{ data, meta, facets }`. UUID detail
reads use `/:id`; slug lookups use `?slug=...&limit=1`. HTTP 404 is a missing
record, while network/server failures show a retry action. Aborted requests
cannot overwrite newer results. Content text is rendered through React escaping.

Legacy advisories and notices routes map to `ANNOUNCEMENT`. Other legacy news
categories are not supported by the Sprint 2 backend and show an empty state.
The existing About services route remains compatible. The main navigation now
opens the paginated `/services` catalog.

Homepage service, news, and update previews use the same public endpoints.
Public content failures never fall back to local storage or inline sample records.
Admin CMS, event feeds, informational About endpoints, and e-service submission
flows remain separate from these public content endpoints.

## Mock-to-live workflow

`npm run dev:mock --prefix frontend` uses the existing local contract example
server. Its search fixture derives results from the content examples and follows
the backend `SearchResponseDto`; it does not reproduce database relevance ranking.

For live development, run the backend and `npm run dev --prefix frontend`.
Vite proxies `/api` to `VITE_API_URL` (default `http://localhost:3000`). Production
uses same-origin `/api`. There is no client-side fallback switch or embedded
sample content in these routes. See `backend/SPRINT2_API.md` for backend schema
prerequisites and `backend/src/api/search/search.dto.ts` for the search contract.

## Verification

- `npm run lint --prefix frontend`
- `npm run build --prefix frontend`
- `npm test --prefix frontend`
- `npm run test:browser --prefix frontend -- public-content.spec.ts`
- `npm run test:contracts:browser --prefix frontend`

Browser tests use controlled HTTP responses to exercise mobile/desktop layouts,
pagination and browser Back, list/detail navigation, loading, missing/empty
results, retries, backend query parameters, and search result navigation.
Hosted database connectivity and production publishing are separate checks.

Local verification: TypeScript passed; all 14 unit tests passed; the eight public
browser scenarios passed (the initial mobile navigation timeout passed on isolated
rerun). The three existing About contract scenarios and the new public contract
flow passed. Browser widths tested were 375px and 1280px. Production build reports
the existing large-bundle warning; no bundle-splitting work is included here.
