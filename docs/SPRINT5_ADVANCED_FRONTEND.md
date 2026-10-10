# Sprint 5 maps and prepared-answer assistant; Sprint 6 frontend QA

## Runtime behavior

- S5-FE-03: Tourism Map reads `tourism_spots` directly through the existing public Supabase client, excludes soft-deleted records and requests only directory fields. It never calls the legacy static tourism API.
- Google Maps place coordinates (`!3d…!4d…`, `q=lat,lng`, or `query=lat,lng`) create pins. Viewport coordinates, shortened links, invalid values and unrecognized hosts do not create pins. Missing coordinates remain visible as addresses.
- OpenStreetMap provides tiles. Tile errors, a 12-second initial tile timeout, and rendering errors expose a retry action. Directory details and external directions remain usable independently of tiles. Directory requests have a 15-second timeout and their own loading, empty, error and retry states.
- The public visualization reports coordinate availability for the records returned by the directory. An empty/error response never becomes a zero-valued chart or a sample destination.
- S5-FE-04 changed per product direction: use a free, curated rule-based assistant, not an AI provider. The layout now mounts MunicipalChatbot; the old GeminiAssistant export delegates to it. Neither path calls a paid API or `/api/chat`.
- The knowledge base has 25 topics covering applications, tracking, payments, accounts, offices, tourism, news, transparency and privacy. It gives site guidance, not fabricated live records, fees, phone numbers, approvals or officeholder names. Unknown questions offer site search and the municipal directory.
- History stays in component memory, survives closing/reopening, is capped at 100 messages, and can be cleared. Reloading clears it. The input accepts at most 2,000 characters. Ten questions per rolling minute prevents rapid repeated submissions; this is local interaction throttling, not an API quota.
- Processing and errors are announced; the conversation uses a polite live log. Enter submits, Escape closes and restores trigger focus. The assistant is a nonmodal dialog, so keyboard users can continue into the page.
- The runtime `isMockAllowed()` switch now always returns false, including when old deployment variables request mocks. Test fixtures remain confined to test tools. This switch does not constitute an audit of every legacy hardcoded page or backend endpoint.

## Maintaining answers

Edit `frontend/src/services/municipalAssistant.ts`. Each topic has a stable ID, title, matching phrases, prepared answer and internal route. Matching favors the longest whole-word phrase. Verify routes and factual content when adding answers. Mutable municipal details should link to their published source rather than being copied into the answer.

## Testing and CI

```sh
cd frontend
npm ci
npm run lint
npm test
npm run test:coverage
npm run build
npm run test:browser
npm run test:eservices
```

The React suite uses Vitest, React Testing Library and MSW. MSW starts before Supabase captures fetch. Unexpected network requests fail tests. Browser suites intercept API traffic and use local test credentials; they do not submit applications or payments to live Supabase.

S6-FE-01: coverage thresholds of 85% for statements, branches, functions and lines apply to the ten files explicitly listed in `vitest.config.ts`: map components/page/service, chatbot component/hook/knowledge base, shared resource hook and runtime data policy. Files in this scope are included even if not imported by tests. This is **feature coverage**, not repository-wide coverage. The ticket's broader interpretation of 85% across the entire legacy frontend remains unverified.

S6-FE-02: existing browser suites cover page-level auth, session recovery, authorization, form validation, review, saved submissions, errors, throttling and payment states with intercepted HTTP responses. Added map page tests use MSW and browser tests exercise real Leaflet tile failure plus the mounted assistant on mobile and desktop.

`.github/workflows/frontend-ci.yml` runs type checking, existing unit checks, the React coverage gate, build and browser suites on pushes/PRs. It also runs the payments-disabled test in a separate configuration. Coverage and browser failure artifacts are uploaded. The workflow has been authored and its commands verified locally; a hosted CI run requires pushing these changes.

## Verification (2026-10-10)

- 21 existing unit/contract tests passed.
- 52 React component/hook/service/page tests passed.
- Feature coverage: 100% lines, 99.46% statements, 100% functions, 98.21% branches.
- 18 existing auth/public browser tests and 3 new advanced-feature browser tests passed.
- The final combined browser run passed 20/21, with an intermittent timeout in the existing global-search retry test. That test then passed an isolated rerun and three consecutive repeat runs. Its intermittent timing remains a QA caveat.
- 16 e-service browser tests passed in the payments-enabled configuration; the one configuration-dependent test passed separately with payments disabled.
- Type checking and production build passed. Vite still reports the existing large bundle warning.
- Read-only check of the configured live Supabase tourism directory returned HTTP 200 and one record. No live mutations, payment requests, AI requests or deployments were made.
