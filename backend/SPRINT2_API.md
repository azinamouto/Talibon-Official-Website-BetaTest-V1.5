# Sprint 2 content APIs — S2-BE-01 / S2-BE-02

Built on S1-BE-03. Apply `supabase/migrations/20260921014054_sprint2_content_pages.sql`
after the Sprint 1 baseline before deploying this backend. Existing `news` and
`services_cms` records are reused; the migration adds `pages` and public-list indexes.
Do not replay the archived Sprint 1 hardening script after this migration.
Archived V4 installations use incompatible table/department layouts. They must be
reconciled to the canonical contract in staging first, as described in
`supabase/README.md`. This migration fails with an explicit prerequisite error
on that layout; it does not rewrite existing municipal records.

The running API publishes Swagger UI at `/api/docs` and its OpenAPI document at
`/api/openapi.json`, including request schemas and example responses. Send
`X-API-Version: 1`, or omit it to use v1. Unsupported versions return 404.

## Routes

Use each resource root: `/api/pages`, `/api/news`, `/api/services`.

| Method and suffix | Access | Response |
| --- | --- | --- |
| `GET /` | Public | `{ data: [...], pagination: {...} }` |
| `GET /:id` | Public | `{ data: {...} }` |
| `GET /manage` | Content staff | Same list envelope, includes drafts/archived/unavailable records |
| `GET /manage/:id` | Content staff | Same item envelope, permits preview |
| `POST /` | Content staff | 201 with `{ data: {...} }` |
| `PATCH /:id` | Content staff | 200 with `{ data: {...} }` |
| `DELETE /:id` | Content staff | 204, empty body; soft deletion |

Content staff means a currently verified `super_admin`, `admin`, `municipal_admin`,
or `editor` profile, with a valid Supabase bearer token and active session. Citizen,
guest, staff, department and barangay roles cannot write municipality-wide content.
Authorization uses the current database profile, not caller-supplied role claims.

Public reads include only `published` pages/news and `available` services. They
exclude soft-deleted rows even when the caller supplies an administrator token.
Use the protected `/manage` routes for previews. All item IDs are UUIDs; resolve a
slug through `GET /api/pages?slug=municipal-profile` (same for news/services).

## Pagination and filtering

| Query | Meaning |
| --- | --- |
| `page` | Integer 1–10000; default 1 |
| `limit` | Integer 1–100; default 20 |
| `q` | Literal, case-insensitive title/name substring, 1–100 characters |
| `slug` | Exact lowercase hyphenated slug, maximum 160 characters |
| `category` | News only: `ARTICLE`, `UPDATE`, `ANNOUNCEMENT` |
| `office_responsible` | Services only: exact department ID |

Filters combine with AND. Unsupported fields/filters and malformed query values
return 400. Ordering is `created_at DESC, id DESC`. Counts reflect all matching
visible records before pagination. An out-of-range page returns an empty `data`
array with the matching total. With no matches, `totalPages` is 0. Offset pagination
is deterministic for unchanged data; concurrent edits may shift page boundaries.

Example: `GET /api/news?category=UPDATE&page=1&limit=20`

```json
{
  "data": [{
    "id": "11111111-1111-4111-8111-111111111111",
    "title": "Municipal update",
    "slug": "municipal-update",
    "summary": "Latest municipal information.",
    "content": "Full announcement text.",
    "category": "UPDATE",
    "status": "published",
    "date": "2026-09-21",
    "image_url": null,
    "file_url": null,
    "author": null,
    "created_at": "2026-09-21T00:00:00.000Z",
    "updated_at": "2026-09-21T00:00:00.000Z"
  }],
  "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

## Writing content

Send JSON with `Authorization: Bearer <access_token>` and `Content-Type: application/json`.

Page creation:

```json
{ "title": "Municipal profile", "slug": "municipal-profile", "content": "Information about Talibon." }
```

News/update creation:

```json
{ "title": "Municipal update", "slug": "municipal-update", "summary": "Latest municipal information.", "content": "Full announcement text.", "category": "UPDATE" }
```

Service creation:

```json
{ "name": "Business permit", "slug": "business-permit", "description": "Apply for a permit.", "office_responsible": "mayor", "requirements": ["Valid government ID"], "processing_time": "3 to 5 business days", "fees": "None" }
```

Pages/news default to `draft`; services default to `coming-soon`. Publish via
`PATCH /api/news/:id` with `{ "status": "published" }`, or use `available` for
services. Pages/news also support `archived`; services support `maintenance`.
PATCH accepts any subset of the create fields, with at least one field required.
Explicit null, unknown fields and client-supplied IDs/timestamps are rejected.
The service department must exist. Slugs remain reserved after soft deletion.

Content is returned as stored text; frontend consumers must sanitize any HTML
before rendering it. This API does not execute or render stored markup.

## Caching and errors

Successful anonymous GET responses use the existing cache policy:
`Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=60`.
Responses vary on `X-API-Version` and CORS origin. Writes and requests carrying
Authorization use `private, no-store, no-cache, must-revalidate, proxy-revalidate`.
Errors always use `private, no-store`. There is no cache purge on writes: a previously
cached public response can remain visible for up to the shared TTL plus stale window
(360 seconds). Protected previews bypass that cache. No in-process data cache is used.

400 = invalid input/reference; 401 = missing/invalid/ended session; 403 = role or
verification rejected; 404 = missing/deleted/non-public item; 409 = duplicate slug;
429 = existing API rate limit; 500 = storage failure. Errors use the existing
`success`, `statusCode`, `error`, `message`, `timestamp`, `requestId` envelope.
Database internals are never included in error responses.

## Frontend transition and verification

Mocks can use the examples and OpenAPI schemas above. Swap the data loader to the
resource routes and consume `data` plus `pagination`. Legacy `/api/news/articles`
and `/api/news/updates` now return live published records, retaining their array
shape and the articles' `image` alias. Those legacy convenience routes return only
the first 20 matching records; use `/api/news` for filtering/pagination. Other legacy
public informational fixture routes are outside these content resources.

Run `npm run test --prefix backend`, `npm run lint --prefix backend`, and
`npm run test:db --prefix backend`. Unit tests inspect query construction and error
mapping. HTTP integration tests exercise real controllers, DTO validation, guards,
cache middleware and OpenAPI with a persistence double. Database tests run the
migrations and real RLS assertions on disposable PostgreSQL for fresh and canonical
installs. The existing legacy-v4 Sprint 1 security regression still runs separately;
that layout is not a supported Sprint 2 schema. Tests do not touch hosted Supabase.
