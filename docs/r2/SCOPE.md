# R2 scope and route disposition

Status: Increment 0 proposal preserved below. Increment 1 implementation and justified refinements are in [the shutdown contract](DEFERRED_WORKFLOW_SHUTDOWN.md): informational service pages and legacy public form GETs remain; all transaction paths close. Hosted closure is pending release evidence.

## Retain

Homepage/navigation, profile/history, executive/legislative information, departments/barangays, tourism, transparency and documents, existing public news/information, approved-content search, accessibility/performance/monitoring. Keep `/e-services` in navigation. Admin/editor access supports photo/document CMS and necessary account controls only.

Public news/page content remains readable; existing editing endpoints and tabs are not an authorization to expand R2 into general content editing. Static permit guidance and approved downloadable forms may remain informational, outside the interactive `/forms/*` experience. Citizen records are preserved under restricted archival access, not exposed in public APIs.

## Defer server-side

| Surface | Observed source | Increment 1 disposition |
|---|---|---|
| E-services directory/wizards/tracking | `frontend/src/pages/EServicesPage.tsx`, `components/eservices/*`, `services/submissionService.ts` | Exact informational placeholder; no citizen session, submission or tracking requests |
| `/forms/business`, `/forms/building`, `/forms/zoning`, all `/forms/*` deep links | `frontend/src/App.tsx`, permit pages | Render/re-route to placeholder, including unknown children |
| `/services`, `/services/:slug` | `ServicesPage.tsx`, `ServiceInfoPage.tsx` | Replace transactional directory experience; approved office guidance remains reachable through informational pages |
| `/payment/success`, `/payment/cancel`, `/payment/failure`, other `/payment/*` | `PaymentReturn.tsx`, wrappers, `PaymentButton.tsx` | Informational only; never imply payment confirmation from query parameters |
| POST `/api/forms/certificate`, `/api/forms/submissions` | `backend/src/api/forms/forms.controller.ts` | Deny before DTO parsing, auth/provider access or service invocation |
| GET `/api/forms/certificate`, `/api/forms/submissions`, ticket aliases and `/api/forms/admin/submissions[/…]`; PUT status aliases | same controller | Disable application listing, tracking and processing, including admin |
| GET `/api/forms/downloadable`, `/business-permits`, `/building-permits`, `/zoning-clearance` | same controller | Move approved public reads to content/document API first; then close forms namespace |
| `/api/payments/*` including checkout, submission checkout/status and webhook-shaped URLs | `payments.controller.ts`, `payments.service.ts`, browser payment services | Close namespace; unbind provider implementation; no flags can enable it. Only public checkout is implemented in this backend; other browser contracts are pending, not working APIs |
| POST `/api/notifications/process`, worker CLI and edge function | notifications module, `email-worker.ts`, `supabase/functions/send-status-email/index.ts`, `backend/package.json` | Deny route, remove worker from R2 execution, disable deployed schedules after separate inventory/review |
| Citizen signup and profile/workflow notifications | auth controller, `Login.tsx`, `SupabaseAuthContext.tsx`, notification services/components | Disable public signup; retain staff login until verified replacement; remove citizen controls |
| Legacy GAD/meeting mutations and workflow reports | `GadEntryModule.tsx`, `MeetingAssistant.tsx`, admin reports | Exclude from R2 runtime; retain approved public narrative only |
| Broad page/news/service mutations | content controllers, `AdminContent.tsx`, `SprintAdminDashboard.tsx` | Disable server mutation methods and editing tabs; preserve public GETs |

The AI chat endpoint and external model integrations are outside the retained list. Proposed disposition: disable `backend/src/api/chat/*` and assistant entry points in R2; keep approved search. Do not create a new citizen workflow through chat. Municipal owner may separately approve a later scope change.

## Required placeholder copy

**Electronic Services**

**To Be Implemented**

The Municipality of Talibon is preparing to introduce online services to make government transactions more accessible and convenient.

For now, please visit the appropriate municipal office for assistance with applications, permits, and other transactions.

Use existing page container, type scale and design tokens. One clear H1, visible keyboard focus, mobile spacing, no fake launch dates or new office/contact facts.

## Disabled-route contract

Propose HTTP **410 Gone** for known retired namespaces and legacy aliases, with the existing sanitized error envelope (`success`, `statusCode`, `error`, `message`, `timestamp`, `requestId`). Message: `Online services are not available. Please visit the appropriate municipal office.` No database IDs, citizen data, provider errors or launch promise. `Cache-Control: no-store`. Unknown routes remain 404; CORS preflight may return its normal empty response, with no side effects.

Implement one early application middleware in `configure-app.ts` for all HTTP methods under the retired namespaces before JSON parsing and Nest guards. Remove deferred providers/module imports as a second boundary. Explicitly test slash, query, version-header and method variants; reject ambiguous encodings at the routing boundary. No request environment flag re-enables these routes. Preserve rate limits/security headers for the retained API.

Backend closure alone does not disable existing Supabase browser or RPC paths. Inventory and prepare a reviewed additive deny-grants/policy change for deferred tables, storage upload paths and callable functions during Increment 1; rehearse against a disposable clone. Stop hosted edge workers/schedulers and remove credentials from the R2 runtime under the release plan. Do not drop tables or erase queues. No such migration runs in Increment 0.

Search must not link to applications or leak archived/private records. Preserve informational services only if approved, otherwise omit their search results and adjust facet totals. Navigation, homepage shortcuts and persisted CMS links need the same review as the React router.
