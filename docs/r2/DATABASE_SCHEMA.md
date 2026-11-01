# Database inventory and proposed R2 schema

Status: static source inventory and design, not a live catalog, approved DDL or executed migration. [Declaration locations/checksums](evidence/source-inventory.json) are tied to the starting SHA.

## Source of truth and drift

Eight migrations under `supabase/migrations/` are the documented fresh-project chain. They require Supabase auth/storage schemas and roles; `backend/test/supabase-stubs.sql` supplies local test substitutes, not a production compatibility layer. `DATABASE/` and `supabase/legacy-migrations/` contain competing historical layouts. Do not replay them into Neon or apply the canonical baseline over a populated source.

Observed runtime targets without a table declaration in this chain include `municipal_services`, `citizen_charters`, `transparency_documents`, `service_requests`, `service_request_history`, `citizen_notification_preferences`, and `notification_delivery_logs`. Some originate in legacy services/edge code. Establish import reachability and inspect the deployed catalog before deciding whether they are aliases, old tables or broken paths. `citizen_charters` must not be silently treated as `citizens_charter_cms`. The old README also mentions `dynamic_pages`, whereas the canonical chain creates `pages`.

## Every canonical public table

Classification is a migration disposition, never permission to delete source data. **Retained** means approved rows may be imported; **deferred** means no R2 operational use; **archived** means preserve restricted historical evidence; **obsolete** means provider-specific design replaced, with historical records preserved.

| Table | Classification | R2 treatment / important relationship |
|---|---|---|
| `roles` | Obsolete design | App staff role CHECK (`admin`,`editor`); no blanket role conversion |
| `profiles` | Retained subset / archive remainder | Approved staff mapped to new app IDs; old PK FK to `auth.users`; role/department/barangay FKs |
| `barangays` | Retained | Preserve text IDs and approved names/profile information; news/ordinance references |
| `departments` | Retained | Text IDs; officials, service guides, charter refer here |
| `officials` | Retained | Department FK; photo references become asset links |
| `news` | Retained read-only | Unique slug, category CHECK, draft/published/archived status, optional barangay FK |
| `pages` | Retained read-only | Unique validated slug; title 1–200, content 1–100000; published/nondeleted predicate |
| `tourism_spots` | Retained read-only | Image arrays/featured image; add explicit approval metadata rather than assume all rows approved |
| `events` | Retained read-only | Public informational dates/venue/banner; source approval required |
| `navigation` | Retained | Validate href/protocol; rewrite links to deferred workflows |
| `downloadables` | Retained as documents | File URL becomes asset reference; preserve category/title/description and reviewed publication state |
| `ordinances` | Retained | Barangay FK and document link; preserve approved title/year |
| `resolutions` | Retained | Optional file URL, number/date/author/title; preserve approved information |
| `citizens_charter_cms` | Retained informational | Department FK; nested form URLs need approved asset mapping |
| `services_cms` | Deferred directory; retain approved guidance only | Department FK; never migrate fee/default timing claims as verified; no operational applications |
| `certificate_requests` | Deferred | Private citizen records, ticket unique; Sprint 3 adds `auth.users` owner FK, JSON-object details, optimistic version and status actor |
| `workflow_history` | Deferred | Request FK cascades; assignment/actor FKs to profiles |
| `payments` | Deferred | Optional request FK; unique provider transaction reference; numeric amount |
| `notifications` | Deferred | User/department FKs; workflow and payment messages must not resume |
| `form_email_templates` | Deferred | Event-type PK/CHECK; preserve template history |
| `form_email_jobs` | Deferred | Request/template FKs; unique request/version/event; bounded attempts; no claim/replay in R2 |
| `form_email_attempts` | Deferred | Job FK; unique job/attempt; preserve delivery history |
| `gad_beneficiaries` | Deferred | Sensitive registry; barangay FK, unique external ID; not public website content |
| `meetings` | Deferred | Transcriptions/summaries; no expanded meeting CMS |
| `audit_logs` | Archived | Historical before/after JSON may contain PII; restricted retention |
| `security_audit_events` | Archived + replacement ledger | Existing actor FK to `auth.users`; method/status checks; preserve events |
| `admin_user_audit` | Archived + replacement ledger | Actor/target profile FKs use RESTRICT; atomic mutation audit in old RPC |

No source table is dropped. Retained records lacking municipal provenance stay quarantined/unpublished. Particularly unsafe defaults include barangay population zero, document size strings, service fees/timing, and tourism opening hours. The canonical seed includes fabricated official/person names; `ops/verify-official-data.sql` is only a known-placeholder check, not full content approval.

## Constraints, policies, views and functions

Baseline extensions: `uuid-ossp`, `pgcrypto`, `pg_trgm`; verify target support/need before inclusion. UUID/default, unique slug/ticket/email, NOT NULL, category/status and relationship rules must be copied or explicitly transformed. Timestamp values and text/UUID keys must not be coerced silently. Preserve null versus missing versus zero semantics.

The baseline's final hardening section revokes legacy definer RPC access from public/anon/authenticated and grants trusted service-role execution. It replaces earlier policies through dynamic SQL. `private.has_role`, later `private.account_active`, verified/nondeleted profiles, `auth.uid()`, auth sessions, and service-role privileges are Supabase assumptions. Do not copy these functions unchanged or replace `auth.uid()` with a client-supplied claim.

| Existing mechanism | R2 disposition |
|---|---|
| `get_user_role`, `is_user_verified`, `is_verified_admin`, `is_verified_staff`, `get_user_department`, `private.has_role`, `is_staff_user`, `private.account_active` | Replace with app staff policy; provider verification precedes database actor context |
| `is_api_session_active` | Auth adapter must prove live revocation/expiry semantics; no stub in production |
| `approve_user`, `admin_mutate_user`, `private.increment_profile_version` | Replace with transactional staff controls, role allowlist, optimistic version, last-admin protection and audit |
| `publish_news` | No R2 news editing API; read-only import |
| `submit_certificate_request`, `update_request_status`, `get_request_status_by_ticket`, `mark_notification_read` | Deferred; no runtime execution grants |
| `enqueue_form_email`, `claim_form_email`, `finish_form_email` | Deferred; do not recreate queue triggers/jobs in operational schema |
| `admin_report` | Defer workflow reports; no citizen aggregation in media CMS |
| `search_content` | Port bounded full-text/trigram search and public filters; remove deferred results and recompute facets |
| `handle_new_auth_user`, `handle_profile_insert_before`, `handle_profile_verified`, `handle_news_published`, certificate-created/status triggers | Provider/citizen side effects; do not copy automatically |
| `handle_updated_at`, `process_audit_log` and audit/update triggers | Reimplement only needed timestamp and append-only audit invariants; avoid old PII snapshots |
| `view_dashboard_aggregates`, `view_monthly_request_stats`, `view_gad_sectoral_stats` | Deferred; never expose archived counts in public R2 UI |

The table lists above cover 30 distinct function names, including replacements. Exact final grants, policies, triggers, FKs, views, indexes and extension versions must be extracted from `pg_catalog` in a read-only live inventory and compared with the applied migration ledger. Source parsing alone cannot certify them.

## Proposed minimal operational model

Use an app-owned `app` schema. Provider auth schema stays provider-managed. Retained public tables keep compatible shapes where this avoids unnecessary UI rewrites; add explicit source approval and safe asset references. Runtime role can SELECT approved read models but cannot mutate news/pages/reference information through CMS.

| Entity | Required columns / constraints |
|---|---|
| `staff_accounts` | UUID PK; provider + opaque subject text UNIQUE; role CHECK admin/editor; active boolean default false; version >0; timestamps; no password/session/MFA secret columns |
| `media_categories` | UUID PK; kind photo/document; nonblank title; unique kind/slug; no citizen taxonomy data |
| `media_assets` | UUID PK; kind; category FK; bounded title/description/alt text; private object key UNIQUE; MIME, validated extension, measured bytes >0, SHA-256; publication draft/published default draft; processing pending/ready/rejected/deleting; version >0; creator/updater staff FKs; published/deleted timestamps |
| `media_revisions` | UUID PK; asset FK RESTRICT; immutable object key UNIQUE; checksum/bytes/MIME; actor FK; creation time; keep prior bytes until retention decision |
| `upload_intents` | UUID PK; staff FK; generated quarantine key UNIQUE; expected kind/size; expiry; completion state; idempotency key UNIQUE; no signed URL persistence |
| `audit_events` | UUID PK; request ID; actor FK RESTRICT or null for system; action/resource ID; bounded redacted change metadata; timestamp; runtime INSERT only, no UPDATE/DELETE |
| `content_sources` | UUID PK; source reference, owner, reviewed timestamp, publication authorization and checksum; no inferred official status |
| `content_asset_links` | Asset FK RESTRICT plus validated content type/ID; unique pair; verified references to retained content (prefer explicit FKs/link tables per content type in DDL) |
| `schema_migrations` | Version PK, checksum, applied timestamp; migration role only |

A published asset must be ready, not deleted, have validated bytes/checksum, an approved source, and required alt text for photos. Encode row-local rules as CHECK constraints and cross-row publication rules in one transactional service operation. Default public reads require all predicates, including category/content approval. Use optimistic `version` comparison for edits (409 on conflict).

Keep original IDs through a reviewed mapping manifest; do not FK app staff IDs directly to a guessed provider table/type. Legacy audit actor mapping can remain in encrypted archive. Separate archive credentials/schema from the web runtime. Index published lists by `(published_at,id)`, category/kind filters, unique object keys, actor/time audit lookups, and approved search vectors. Add indexes based on measured queries, not every field.

Schema design is **pending review**; actual DDL belongs to Increment 2 and includes no municipal data seed.
