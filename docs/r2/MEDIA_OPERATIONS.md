# Increment 4 media operations

Only photos (static JPEG/PNG/WebP) and passive PDF documents are accepted. The application limit is **2 MiB per file**, including imported files. There are no e-services, payment or citizen submission flows.

## Verified provider contract — 2026-11-04

Official sources: [overview and limits](https://neon.com/docs/storage/overview), [S3 compatibility](https://neon.com/docs/storage/s3-compatibility), [credentials](https://neon.com/docs/storage/authentication), [bucket access](https://neon.com/docs/storage/buckets), [objects](https://neon.com/docs/storage/objects). Retrieved directly from their `.md` representations after consulting the documentation index.

Neon supports path-style AWS S3 SDK requests, SigV4, Put/Get/Head/Delete and presigned GET/PUT. Bucket access defaults to private and is managed through Neon controls; S3 ACL/policy writes are unsupported. Lifecycle and versioning settings do not provide enforced expiration or revision recovery. Credentials authorize a branch and descendants; storage:write includes read access. Keep credentials server-only, scoped to the intended development or release branch. The adapter checks ACL and policy on uploads, publication and downloads; unknown security responses fail closed.

Published provider limits: single PUT 5 GiB, multipart 10 GiB, Free storage 5 GB/project; supported regions Ohio, N. Virginia, Frankfurt and Singapore. Heavy use can return 503 SlowDown. The application deliberately uses a much lower cap: base64 JSON stays under a 3 MiB parser limit and binary download responses stay under 2 MiB. This avoids relying on large-upload support in the existing Vercel function. No direct browser storage credentials or signed URLs are issued.

Live qualification used project `misty-silence-69777617`, isolated child `dev-talgov-r2-increment-4` / `br-bold-art-aolg7usz`, parent `dev-talgov-r2-foundation`, private bucket `talgov-media-r2`, Singapore. No compute was created on the new branch. SDK upload/read checksum, ACL/policy checks, anonymous 403 and synthetic object deletion/absence passed. The branch and empty bucket remain available for subsequent development. `.env.media-qualification` is ignored and restricted by Windows ACL to the current user; do not copy it to client environments or commit it.

## Configuration and schema

Backend-only variables: `MEDIA_DATABASE_URL` (pooled least-privilege PostgreSQL), `MEDIA_BUCKET`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`. Existing `STAFF_AUTH_*` settings remain required. Media and authentication must use the same app/auth records. Storage must be the corresponding branch. No service enables itself without configuration; missing configuration returns 503.

Apply foundation migrations, then the two auth SQL files, then `backend/database/media/001_media_policy.sql` through `backend/scripts/r2-media-schema.cjs`. That script uses a separate checksum ledger, advisory lock, transaction, replay checks and dry-run default. The CLI accepts only isolated local `r2_*` databases; there is no production apply mode. `npm --prefix backend run db:media:migrate -- --apply` requires an isolated `R2_MIGRATION_DATABASE_URL`. The media policy adds an optional original filename, narrowly scoped grants, and a per-staff database upload throttle. It does not modify earlier migration checksums.

Existing reviewed category and source records supply the CMS choices. There are no invented municipal seeds and no implicit source approval. Editors may select categories and sources, edit metadata and publish only when database approval constraints pass. Category/source creation and approval remain operator responsibilities, as in the R2 foundation.

## API and security behavior

- Staff endpoints: `GET /api/admin/media?page=1`, `GET /api/admin/media/options`, `POST /api/admin/media/uploads`, `POST /api/admin/media/:id/edit`, `POST /api/admin/media/:id/publish`, `POST /api/admin/media/:id/unpublish`, `POST /api/admin/media/:id/delete`, and authenticated `GET .../:id/preview` / `download`.
- Public endpoint: `GET /api/media/:id/download`. The database's approved/published/ready/not-deleted view is authoritative. Public APIs never return draft metadata or object keys. File responses are no-store/nosniff; documents download as attachments. Staff UI previews use fetched blobs, with passive PDFs displayed by the browser's built-in PDF viewer.
- Every privileged request passes the existing live Better Auth/MFA guard. Repository transactions recheck active role, verified email, MFA, live session and assurance. Deletion requires admin role and MFA refreshed within five minutes. Version conflicts return 409. Mutations require exact configured origin and JSON; unknown DTO fields fail validation.
- Extension, MIME, canonical base64, byte count and full image decode are checked server-side. Image decoding permits one frame and at most 16 million pixels. PDF parsing rejects encryption, invalid structure, more than 300 pages, scripts, forms, external actions, embedded files and multimedia. A worker enforces a 10-second/96-MiB JS-heap parsing budget. These checks are not a malware-scanner certification; parser/native-library maintenance and operational scanning policy remain release responsibilities.
- Filenames use a restricted ASCII display allowlist. Storage keys contain staff/upload UUIDs, never supplied filenames. Ten upload attempts per staff account per minute are enforced in PostgreSQL across instances; existing HTTP rate limits remain in place.

## Recovery and consistency

An upload reserves a pending, private database row and audit event before writing an object. The same upload UUID and exact validated bytes can be retried; a different checksum conflicts. Storage is read back and SHA-256 verified before a transaction marks it ready, appends an immutable revision and audits completion. A failed or uncertain operation never publishes a file. The pending row is durable evidence for recovery; the CMS can resume it with the original file. A concurrent retry may receive a version conflict and should refresh. Ready upload retries return the existing record.

Metadata edits and publication/deletion state changes are atomic with audit events. Downloads check visibility both before and after storage I/O, verify length/checksum, and proxy the bytes; there are no issued bearer URLs to revoke. New downloads fail after unpublication. Already delivered or in-flight bytes cannot be recalled. The client may retain an already fetched preview until closed or the page exits.

Delete is an audited logical deletion: it unpublishes and removes all CMS/public access, but retains the private object and immutable revision for operator recovery. No automated physical purge or retention period is invented. Recovery/purge requires an approved operator procedure and a verified backup. Do not rely on Neon lifecycle/versioning settings. Storage failure during upload leaves pending metadata; DB failure after storage write leaves the same durable pending record for retry, never an untracked public object.

`npm --prefix backend run media:reconcile` reads a consistent database snapshot and checks every asset's stored bytes, including retained deleted files; it returns counts for ready/pending/deleted/missing/mismatch and a nonzero exit for missing/mismatched files. It makes no repairs or data changes. Concurrent application activity may make a snapshot report stale; repeat under a coordinated write freeze before a cutover decision.

## Non-destructive source migration

Export authorized Supabase objects separately into a secured local directory. No production source export or import ran in Increment 4. Preserve source metadata and original export checksums. Supply a JSON manifest array with `file` (relative local path), `mime`, `bytes`, `sha256` and `key` equal to `migration/<sha256>`. Imports enforce the same format/size validation as new uploads. Larger/active/unsupported files are blockers, not silently converted or published.

`npm --prefix backend run media:transfer -- <manifest.json> <export-directory>` is a local source-validation dry run. `--verify-target` checks destination bytes without writing. `--copy` copies only absent keys, re-reads checksums and leaves existing matching objects unchanged; mismatches fail instead of overwrite. Remote modes are hard-gated to the isolated Increment 4 branch. No source deletion, bucket deletion, arbitrary-URL fetch or automatic metadata cutover exists. Run with one writer during migration; content-addressed keys prevent divergent normal retries.

After object reconciliation, use the existing reviewed R2 metadata import process with mapped keys, source/category approvals and provenance. Do not publish/import database references until both source and destination checksums match. Preserve source objects and rollback metadata snapshots until separately approved cutover acceptance. Returning to the previous application commit requires disabling media writes first; leave the additive schema and private objects intact for reconciliation. No destructive down migration is provided.

## Remaining qualification

The new CMS tests use real disposable PostgreSQL with synthetic staff/session records and mocked object I/O; the storage qualification separately exercises real Neon. Existing Better Auth tests exercise real provider code/MFA on disposable PostgreSQL. Browser tests intercept API responses. No combined hosted browser/Better Auth/Neon-storage staging deployment, production migration, production credential change or public release was performed. Hosting package tracing for sharp/worker files, operational backup/restore, actual source exports, credential rotation/revocation, budget limits and approved retention remain release checks.
