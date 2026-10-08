# Sprint 3 E-Services frontend

Tickets: S3-FE-01, S3-FE-02, S3-FE-03. Updated 2026-10-08.

## Scope and status

- S3-FE-01: shared four-step wizard, schema validation, review, progress, keyboard focus, linked errors, and existing accessible UI controls implemented.
- S3-FE-02: five forms send authenticated requests to the existing NestJS endpoints. Account-based listing, pagination, lookup, history, refresh, and failure states implemented. Live deployment/database validation remains a rollout check.
- S3-FE-03: payment UI, authenticated adapter, safe hosted checkout navigation, and return states implemented behind a disabled flag. **Blocked for live use by S3-BE-02 and S3-INT-01.** The required submission-linked payment routes are not implemented in this checkout.

The concrete [backend handoff](../backend/SPRINT3_API.md) defines Barangay Clearance, Certificate of Indigency, Business Permit, Building Permit, and Zoning Clearance. This differs from the older System Overview, which lists Cedula. Cedula is a separate tax/payment workflow and is shown as unavailable rather than submitting it to an incompatible form endpoint.

## Citizen flow

Open `/e-services`, choose a form, and sign in. Both `?type=Business%20Permit` and existing `?service=business_permit` links work. Complete applicant details and service details, review, confirm, then submit once. Numeric values are JSON numbers and service-specific values live in `details`; `purpose` remains plain text. Email comes from the signed-in account. The backend independently validates the token, ownership, fields, and email.

The wizard keeps drafts in React memory. It does not persist applicant information in browser storage. Leaving the form or signing out discards the draft. A failed request stays on the review step with an error. An interrupted response instructs the citizen to check My submissions before retrying; the current submission API has no idempotency contract, so the frontend cannot guarantee exactly-once creation after network uncertainty.

After the server saves the application, the wizard displays its returned ticket and status, then the payment step. `/e-services?view=submissions` lists the account's applications. `/e-services?track=<ticket-or-uuid>` loads the current status and history, including existing email notification links. Refresh is explicit to respect tracking rate limits. Switching users remounts the form/list and clears in-memory data.

The old citizen page and five duplicated form implementations have been replaced to remove direct database writes, filename-only simulated uploads, and fabricated offline submission success. Supporting documents may be requested during review; uploading documents is not supported by S3-BE-01 and no filename is presented as an uploaded file. Existing staff service code is outside these tickets.

## Existing live API bindings

| Operation | Endpoint | Response |
| --- | --- | --- |
| Submit | `POST /api/forms/submissions` | Saved application object |
| List own | `GET /api/forms/submissions?page=1&limit=10` | `{ data, pagination: { page, limit, total } }` |
| Read own | `GET /api/forms/submissions/:idOrTicket` | `{ success, request }`, including history |

Requests use the current Supabase access token as a bearer token. No database fallback or mock success occurs in this flow. Error messages cover validation, expired sessions, permission errors, missing applications, conflicts, throttling, network interruptions, and service outages.

## Proposed payment handoff — not an existing backend contract

Keep `VITE_SUBMISSION_PAYMENTS_ENABLED=false` (the default). The existing public `/api/payments/create-checkout-session` accepts a client amount and cannot bind or verify payment against an owned application, so this form flow does not call it. Its old return pages now avoid claiming success or generating receipt references from URL parameters.

Before enabling the flag, BE/INT must implement and agree on:

1. `GET /api/payments/submissions/:submissionId`, requiring owner authentication, returning `{ status, amount, currency: "PHP", receiptReference? }`. `amount` is in pesos. Status is `not_required`, `awaiting_assessment`, `unpaid`, `pending`, `paid`, `failed`, or `cancelled`. Fees and payment state must be server-owned. A receipt reference is displayed only for server-confirmed `paid`.
2. `POST /api/payments/submission-checkout`, requiring owner authentication, accepting only `{ submissionId, successUrl, cancelUrl, failureUrl }`, returning `{ url }`. The backend must derive the fee and currency, enforce configured return origins, and idempotently reuse an active checkout per submission. A timed-out/repeated request must not create a second charge. Return URLs include the submission UUID.
3. Signed webhook verification and durable, idempotent reconciliation of provider events before reporting `paid`. A browser return URL must never mark an application as paid.
4. A tested hosted checkout URL on `https://checkout.xendit.co` or `https://checkout.stripe.com`. Other hosts, credentials, custom ports, and non-HTTPS URLs are rejected. Confirm the actual provider host during integration and update the allowlist deliberately if required.
5. Provider sandbox end-to-end checks of success, failure, cancellation, delayed webhooks, repeat checkout, network uncertainty, cross-account access, and assessed fees.

The frontend sends no amount or card details. It renders no card inputs and loads no card SDK. A pending payment cannot start another checkout. Cancel/failure returns preserve the application link; retries depend on the latest server status. Missing or malformed submission IDs produce an unverified state and a recovery link. No charge/no-charge assertions are made from browser navigation alone.

## Verification

```sh
npm run lint --prefix frontend
npm test --prefix frontend
npm run build --prefix frontend
npm run test:eservices --prefix frontend
```

Payment-disabled browser check in PowerShell:

```powershell
$env:TEST_SUBMISSION_PAYMENTS = 'false'
npm run test:eservices --prefix frontend -- --grep 'payments remain unavailable'
Remove-Item Env:TEST_SUBMISSION_PAYMENTS
```

The dedicated Playwright config uses port 5176 and controlled HTTP/auth responses. It enables the **proposed** payment adapter only within that test server. Browser coverage includes all five payloads, validation, keyboard focus, mobile overflow, review/back state, duplicate-click prevention, saved status/history, request errors, unverified return links, and payment outcomes. Unit tests cover numeric boundaries, required values, contact validation, string limits, and payload minimization.

These tests verify frontend behavior and request shapes. They do not prove a deployed database save, email delivery, or real payment. Deployment acceptance still requires authenticated staging submissions against the migrated database and BE/INT payment sign-off. No real payment or production mutation is performed by these tests.

### Local results (2026-10-08)

- TypeScript and production build passed. Vite reports a large application bundle warning.
- All 19 frontend unit tests passed.
- All 17 e-service browser cases passed across enabled-adapter and disabled-payment runs, including the citizen login and mobile landmark fixes.
- The 10 existing authentication browser cases passed across the regression run and one isolated rerun. Cross-tab logout initially timed out while suites ran concurrently, then passed alone. The new suite now uses a separate artifact directory to prevent test-output collisions.
- Mobile screenshot inspected; the form fits a 375px viewport with visible labels and errors.
