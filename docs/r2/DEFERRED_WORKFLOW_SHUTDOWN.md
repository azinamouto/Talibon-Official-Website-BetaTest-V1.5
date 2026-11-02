# Increment 1 deferred workflow shutdown

Evidence date: 2026-11-01 (Asia/Shanghai). Repository implementation only; no hosted configuration, data or schedules were changed. This document is not authorization to deploy or migrate.

## HTTP contract

All retired categories use **410 Gone**, independently of credentials, role, body validity, query parameters, version headers and enable flags. The envelope is `success: false`, `statusCode: 410`, `error: "Gone"`, `message`, ISO `timestamp`, and the response's `requestId`. The message is exactly `Online services are not available. Please visit the appropriate municipal office.` Responses have `Cache-Control: no-store` and existing R1 security headers. HEAD has no response body. OPTIONS to a retired namespace also returns 410. Ambiguous/double-encoded paths are rejected with 400; ordinary unknown routes retain 404.

| Category | Affected endpoint inventory | Implementation |
|---|---|---|
| Submission | POST `/api/forms/certificate`, `/api/forms/submissions` | 410 for all methods |
| Listing/tracking | GET `/api/forms/certificate`, `/api/forms/submissions`, both `/:ticketId` variants, `/api/forms/admin/submissions`, `/api/forms/admin/submissions/:id` | 410 for all methods and unknown children |
| Certificate status | PUT `/api/forms/certificate/:id/status`, `/api/forms/admin/submissions/:id/status` | 410 for all methods |
| Checkout | POST `/api/payments/create-checkout-session` | 410, including malformed client amounts and return URLs |
| Prospective checkout/status/settlement | `/api/payments/submission-checkout`, `/api/payments/submissions/:id`, `/api/payments/webhook`, `/api/payments/settlement`, all other `/api/payments/*` | 410; these additional browser-shaped routes were not implemented settlement APIs in R1 |
| Deferred notifications | POST `/api/notifications/process`, entire `/api/notifications/*` | 410; module/provider unbound |
| Citizen registration | `/api/auth/signup` and children | 410; direct browser SDK signup replaced with a local error; staff login/refresh/recovery/logout retained |
| Workflow exports | `/api/admin/reports/submissions`, `/api/admin/reports/payments` | 410; `/api/admin/reports/user-activity` and user administration retain R1 authorization |
| Broad content editing | Non-read methods under `/api/pages`, `/api/news`, `/api/services` (except CORS OPTIONS) | 410; public GET/HEAD and authorized management reads retained |
| External assistant | `/api/chat/*` | 410; chatbot removed from public layout and backend provider unbound |

`configureApp` installs retirement after headers/request metrics and before JSON/form parsing, CORS setup, guards, request audit persistence and controllers. Both standalone and serverless bootstraps use it. Forms, payment, notification and chat execution providers are absent from `AppModule`. No request flag can re-enable them. Historical implementations remain in source/Git for review, not in the production application graph.

## Retained information and administration

GET/HEAD `/api/forms/downloadable`, `/api/forms/business-permits`, `/api/forms/building-permits`, `/api/forms/zoning-clearance` remain compatibility reads. `PublicFormsController` owns these without `FormsService` or a database dependency; equivalent `/api/public-forms/*` URLs are available. Other methods on the legacy forms URLs are retired. Existing source-held metadata (including `#` placeholder URLs) is preserved, not newly certified official download content.

Inspection showed `/services` and `/services/:slug` already render read-only office guidance and requirements, with no application or payment controls. They remain available to satisfy preservation of public informational pages. This refines the tentative Increment 0 directory disposition. `/e-services/*`, every `/forms/*` and every `/payment/*` instead render the approved placeholder. Queries cannot select a wizard, track an application or assert a receipt. Homepage transaction advertisements, citizen signup, notification UI, broad content editor tabs, the GAD profiling entry and its separate portal action are unmounted. The GAD narrative page remains available. Staff account controls and security activity reports remain.

## Jobs and source-side bypass inventory

| Surface | Repository action | Hosted verification still required |
|---|---|---|
| `npm run notifications:work`, compiled `email-worker.js`, including `--watch` | Inert entry exits 1 before bootstrapping Nest or contacting providers | Identify and stop every old worker image/process; command remains as a fail-closed tombstone for old schedulers |
| `supabase/functions/send-status-email/index.ts` | Provider-free 410 handler; no imports, environment access, fetch, email or SMS delivery | Already deployed edge versions remain unchanged until an authorized release removes/disables them |
| HTTP `/api/notifications/process` | 410 before queue access | Inventory external HTTP schedulers and their credentials |
| `claim_form_email`, `finish_form_email`, `enqueue_form_email` | Preserved historical SQL; not invoked by R2 runtime | Revoke worker execution grants; stop leases without deleting queue rows |
| `submit_certificate_request`, direct PostgREST table access | Browser consumers unmounted; prior R1 RPC revocation preserved | Compare hosted grants/policies/functions to canonical SQL, including legacy RPC overloads |
| `certificate_requests`, `workflow_history`, `payments`, `notifications`, `form_email_jobs`, `form_email_attempts`, `form_email_templates` | No R2 citizen workflow entry reaches them | Restrict direct reads/mutations and review SECURITY DEFINER functions/views |
| Legacy direct tables | `certificateService.ts` also references `service_requests` and `service_request_history`; GAD and meeting modules reference `gad_beneficiaries` and `meetings`. Their components are unmounted | Confirm which tables exist on the target and apply reviewed archival restrictions; candidate SQL intentionally fails on canonical drift rather than inventing missing tables |
| Storage `citizen-vault`, `certificates` and any legacy attachment buckets | Citizen upload components unmounted | Deny direct citizen uploads/reads as required by archival policy; preserve public documents/media and staff account controls |
| Supabase Auth public signup | Browser control removed and Nest signup retired | Disable hosted public registration; browser code cannot enforce provider settings |

No notification schedule was found in checked-in GitHub workflows. This does not establish absence of hosted cron, database triggers, external workers or old deployed artifacts. Supabase is still required for retained R1 reads/auth/storage; its removal belongs to later increments.

## Reviewed release procedure (not executed)

1. Inventory the actual target's schedules, running workers, edge revisions, API artifacts, provider registrations, tables, grants, policies, views, RPC signatures and buckets using approved read-only credentials. Record identifiers and owner; do not include secrets in evidence.
2. Obtain a backup and prove restoration into an isolated clone. Preserve queued jobs, existing records, storage objects and historical migrations. Record outstanding worker leases and delivery state.
3. Rehearse the deny-policy candidate below against that clone. Extend it for discovered RPCs and storage buckets. Verify anonymous/citizen/editor/admin/legacy privileged identities cannot access archived workflows directly. Prove retained public reads, account operations and audit activity still work.
4. During a separately approved release, stop old schedulers/workers and remove their delivery credentials, disable the hosted edge function, close provider signup, and apply the reviewed additive source-side restrictions before exposing the R2 artifact. Do not run existing and retired workers concurrently.
5. Verify direct provider requests, old aliases, webhook deliveries and queued-job attempts fail closed without inserts, updates, invoices or messages. Check retained public information, staff sessions and administration. Attach operator and municipal approval evidence.
6. Rollback must restore only a reviewed artifact that still closes deferred workflows. Do not restore worker credentials, reopen registration, or replay queued messages as an incidental rollback step.

The [deny-policy candidate](sql/deferred-deny-candidate.sql) is outside automatic migrations and ends in ROLLBACK. It is prepared for review, **not executed or database-qualified**. Missing hosted inventory, clone rehearsal, direct-provider denial and shutdown evidence remain release blockers. Application HTTP/browser tests do not prove those controls.

## Test boundary

`backend/test/r2-disabled-routes.test.cjs` boots the actual production `AppModule`/`configureApp` on loopback, using synthetic configuration and provider tripwires. It asserts zero provider acquisition during retirement, absence of transaction/queue providers, retained read routing, worker/edge inertness, and the published 410 contract. The serverless deployment test also uses the actual entry point.

Historical controller suites use the explicitly test-only `legacy-controller-harness.cjs` to omit retirement when mounting isolated legacy controllers. This preserves R1 validation, ownership, authorization, rate limits and provider-error regressions. These tests are not claims that R2 exposes those controllers. The production-app suite never uses this harness. Historical payment TODOs remain explicit release blockers, not passes.
