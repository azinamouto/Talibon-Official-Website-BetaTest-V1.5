# Sprint 3 forms and notifications (S3-BE-01, S3-BE-03)

Scope: Barangay Clearance, Certificate of Indigency, Business Permit, Building Permit, and Zoning Clearance. Cedula and payment processing belong to the separate payment flow. These five were inferred from the existing general request components.

## API contract

Use `Authorization: Bearer <Supabase access token>` and `Content-Type: application/json`. `X-API-Version: 1` is optional. Interactive schemas are at `/api/docs`; JSON is at `/api/openapi.json`.

| Method / route | Access | Result |
| --- | --- | --- |
| `POST /api/forms/submissions` | Signed-in citizen | 201: saved application |
| `GET /api/forms/submissions?page=1&limit=20` | Signed-in citizen | Own applications and pagination |
| `GET /api/forms/submissions/:idOrTicket` | Owner | Application and chronological history; 404 for another owner |
| `GET /api/forms/admin/submissions` | Verified staff/admin | Paginated applications |
| `GET /api/forms/admin/submissions/:uuid` | Verified staff/admin | Application and history |
| `PUT /api/forms/admin/submissions/:uuid/status` | Verified staff/admin | Updated application |
| `POST /api/notifications/process` | Verified admin | Process one due email job; useful for operational recovery |

Staff roles: `staff`, `admin`, `super_admin`, `municipal_admin`. Notification processing excludes `staff`.

Compatibility aliases: `POST /api/forms/certificate`, `GET /api/forms/certificate/:idOrTicket`, staff `GET /api/forms/certificate`, and staff `PUT /api/forms/certificate/:uuid/status`. The aliases enforce the same new authentication and validation. Downloadable-form listing routes remain public.

`page` is 1–100000; `limit` is 1–100. Unknown body/query fields are rejected. Strings are trimmed where appropriate. Numeric fields require JSON numbers (not strings). Request email must match the authenticated account. The backend derives ownership from the token, never from payload email or a client-supplied user ID. It uses the authenticated email for notifications.

## Example payloads

All five forms use the same submission endpoint. Here is a complete Barangay Clearance payload:

```json
{
  "documentType": "Barangay Clearance",
  "barangay": "poblacion",
  "fullName": "Juan Dela Cruz",
  "email": "juan@example.test",
  "mobileNumber": "09171234567",
  "purpose": "Employment",
  "attachments": [],
  "details": { "sitioPurok": "Purok 1", "yearsOfResidency": 5 }
}
```

For the other four forms, keep the common fields and replace `documentType` and `details` with one of the following:

```json
{
  "documentType": "Certificate of Indigency",
  "details": {
    "address": "Purok 1, Poblacion",
    "monthlyIncome": 3000,
    "familyMembers": 4,
    "reason": "Medical assistance"
  }
}
```

```json
{
  "documentType": "Business Permit",
  "details": {
    "businessName": "Dela Cruz Store",
    "businessAddress": "Purok 1, Poblacion",
    "natureOfBusiness": "Retail",
    "dtiSecRegNo": "DTI-123456"
  }
}
```

```json
{
  "documentType": "Building Permit",
  "details": {
    "propertyAddress": "Purok 1, Poblacion",
    "lotNumber": "LOT-123",
    "taxDeclarationNo": "TD-456",
    "constructionType": "Residential",
    "estimatedCost": 500000,
    "floorArea": 60,
    "engineerArchitect": "Maria Santos"
  }
}
```

```json
{
  "documentType": "Zoning Clearance",
  "details": {
    "propertyAddress": "Purok 1, Poblacion",
    "lotNumber": "LOT-123",
    "taxDeclarationNo": "TD-456"
  }
}
```

`barangay` must be an existing `barangays.id`. Building construction types: Residential, Commercial, Industrial, Institutional, Other. Mobile formats: `09` plus nine digits, or `+639` plus nine digits. Attachments are up to 10 bounded document-reference strings; this ticket does not upload files or grant access to a storage object.

The created application returns `id` (UUID, usable by the payment integration), `ticketId` (`TAL-<UUID>`), the validated fields, `status: "Submitted"`, `version: 1`, `submittedAt`, and `updatedAt`. Reads also return `history` entries with `id`, `status`, `remarks`, and `createdAt`.

Status update example:

```json
{ "status": "Processing", "version": 1, "remarks": "Review started." }
```

Statuses follow the canonical database enum: Submitted, Assigned, Processing, Returned, Approved, Rejected, Completed, Archived. This ticket validates the status vocabulary but does not impose a department-specific transition graph. A successful update increments `version`; stale versions return 409. A same-status update increments the version but emits no duplicate status history or email. History cannot be suppressed with a client flag.

Errors: 400 validation/unknown barangay, 401 authentication, 403 staff authorization, 404 missing or non-owned application, 409 stale version/conflict, 429 rate limit, 503 storage/queue unavailable. Error bodies use the shared API error envelope. Failed database writes never fall back to memory or return a successful mock submission.

Existing rate limits per IP and process apply: 15 submissions, 20 tracking/list reads, and 30 administrative operations per minute. Error responses expose `Retry-After` where applicable.

## Email delivery and operation

Apply the two new Sprint 3 migrations in filename order after the canonical Sprint 1 schema. The first adds ownership, details, versioning, and history; the second installs the email outbox. Existing records are not assigned to accounts by email: historical ownership requires operator verification before setting `user_id`. Archived V4 schema requires reconciliation with the canonical schema before these migrations.

Application insertion or status change, history, and email-job creation commit in one transaction. A missing template or queue failure rolls back the write. Delivery failure does not roll back an already saved application.

Configure server-only `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS` (verified sender), optional `EMAIL_FROM_NAME`, and `APP_URL` (public frontend origin). Missing configuration leaves jobs pending and the worker reports an error; console output is never treated as successful delivery. No provider credentials are needed for the automated tests, and tests do not send real emails.

Build, then run a separately supervised worker:

```sh
npm run build --prefix backend
npm run notifications:work --prefix backend -- --watch
```

For a scheduled process, omit `--watch`: each invocation drains up to ten due jobs and exits. Schedule it at least once per minute. The HTTP admin endpoint processes one job to keep request duration bounded. A serverless API deployment alone does not schedule the worker; provision the scheduled process as part of rollout.

Each job is leased atomically with `FOR UPDATE SKIP LOCKED`, with a fresh token and two-minute lease. Failed sends are logged in `form_email_attempts` and retried after 30, 60, 120, and 240 seconds, up to five total attempts. A crashed worker's expired lease is logged and reclaimed; a stale worker cannot acknowledge a newer lease. Exhausted jobs become `dead`. Provider acceptance is recorded as `sent`; mailbox delivery/bounces are outside this ticket.

The provider uses a stable per-job idempotency key and a ten-second timeout. Delivery is at least once: Resend retains keys for [24 hours](https://resend.com/docs/dashboard/emails/idempotency-keys), so extended outages can produce duplicates after that window. Keep sender and APP_URL configuration stable while retrying pending jobs. Only safe error codes are persisted; provider response bodies and recipient data are not logged.

Operators can inspect `form_email_jobs.state`, `attempts`, `available_at`, and `last_error`, and join `form_email_attempts` by `job_id`. Exhausted jobs require operator investigation and provider-delivery reconciliation; automatic replay stops after five attempts. Preserve the attempt history and do not blindly replay accepted deliveries. An operator replay API is outside this ticket.

Templates are database-configurable by backend operators, without a code deployment:

```sql
UPDATE public.form_email_templates
SET subject = 'Talibon application: {{ticketId}}',
    body = 'Hello {{fullName}}, your {{documentType}} is {{status}}. {{remarks}} Track: {{trackingUrl}}'
WHERE event_type = 'status_changed';
```

Both `submitted` and `status_changed` templates are required. Supported placeholders: fullName, ticketId, documentType, status, remarks, trackingUrl. Templates are plain text; interpolated HTML is escaped. Template text is copied into each queued event so later template edits affect future events, not retries. Template/outbox/audit tables and queue RPCs are backend-only, protected by grants and RLS.

## Frontend handoff and verification

Frontend clients must send a bearer token, typed `details`, numeric values, and the current version on status updates. Existing components that serialize fields into `purpose`, submit anonymous placeholder emails, or track anonymously need the S3-FE adapter update before rollout. Form UI validation remains an independent frontend task. Cedula/payment contracts are not changed here.

Run `npm test --prefix backend`, `npm run lint --prefix backend`, and `npm run test:db --prefix backend`. The database runner uses disposable local PostgreSQL, replays migrations, and asserts ownership, transaction rollback, queue retries, lease recovery, and exhausted attempts. `-Advisors` also runs Supabase security advisors. HTTP tests cover all five payload types, overposting, ownership by UUID and ticket, pagination, staff authorization, and stale updates. Provider tests mock network delivery.
