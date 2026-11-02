# Increment 2 database operations

Local foundation, not a production cutover. PostgreSQL **17+** is required (`transaction_timeout`); the rehearsal runs installed PostgreSQL 18. No seeds, municipal records, source credentials, auth integration or storage integration are included.

## Boundaries and prerequisites

`backend/src/database/database.module.ts` exports Nest repository tokens and owns one bounded pool per module instance. It is deliberately absent from `AppModule`: existing R1/Increment 1 routes, guards, provider stack and 410 retirement remain intact. No new HTTP contract or browser environment variable is added. The new code imports `pg`, never a Supabase SDK. Final provider removal remains Increment 5.

Runtime `DATABASE_URL` must use a separately provisioned non-owner login inheriting only `talgov_runtime`. It must not have other memberships, schema/database CREATE, CREATEROLE, SUPERUSER or BYPASSRLS. Operator/migration credentials never belong in the web environment. Provision credentials out-of-band, inspect actual inherited grants, and verify role ownership/membership before any staging cutover. Migration 002 creates a NOLOGIN group; it does not create a password or assign runtime login membership. It requires CREATEROLE or prior provisioning by a DBA. Hosting permissions remain unverified.

Use a Neon pooled runtime endpoint and a direct operator endpoint. The adapter verifies TLS certificates/hostname, rejects connection-string options except `sslmode=require|verify-full`, and supplies `rejectUnauthorized:true` explicitly after parsing the URL. Default system trust roots are used; custom CA and channel-binding policy are not yet qualified. Local no-TLS mode is available only through the explicit test factory and loopback host check. The runtime module never enables it.

Pool max **2**, acquisition **5 s**, idle connection **10 s**, statement **5 s**, lock **2 s**, idle transaction **5 s**, total server transaction **10 s**, client query fallback **12 s**. Transactions use one client, local settings, rollback and release/destroy on error; idle/checked-out connection errors never emit provider text. No automatic mutation retries or guessed COMMIT success. Provider errors become `unavailable`, integrity errors `invalid`, duplicate/deadlock/serialization errors `conflict`; authorization becomes `forbidden`. Future HTTP services must deliberately map these to 503/400/409/403 without forwarding causes. No new HTTP mapping is mounted now.

The configuration follows [node-postgres transaction/pool behavior](https://node-postgres.com/apis/pool) and [Neon's pooled/direct connection guidance](https://neon.com/docs/connect/connection-pooling). Neon TLS, cold starts, pooled transaction settings, concurrency capacity, real role provisioning and branch recovery require a hosted rehearsal.

## Schema and authorization

`backend/database/migrations/001_foundation.sql` creates nine app tables: `staff_accounts`, `content_sources`, `public_content`, `media_categories`, `media_assets`, `media_revisions`, `content_asset_links`, `audit_events`, `import_batches`. `public.r2_schema_migrations` is an operator-only checksum ledger. Migration 002 grants narrowly scoped runtime privileges. No existing migration chain is modified.

Retained information uses a normalized read model (`kind`, original text ID, slug, title, bounded JSON object, provenance, publication timestamps). Thirteen kinds match the retained-table allowlist in the inventory. This is an **intermediate import contract**, not compatibility with every legacy controller shape. Canonical departments/barangay relationships inside legacy payloads require approved mapping and source validation before route cutover. Explicit media/category/source/staff/content-link references use real FKs; JSON is not a substitute for those FKs. Search and legacy-specific DTO mapping are deferred to the retained-route cutover.

Runtime cannot write retained content, sources, approvals, categories, file readiness, import receipts, revisions or schema history. File MIME/size/checksum declarations are constrained but are **not proof of bytes**. New metadata is pending/draft. Only an operator can mark validated imported metadata ready; live upload validation and upload intents await the storage increment. Revisions are immutable; no storage objects are read, written or deleted.

Public views require approved source/category, published status, nondeleted records, readiness for media and a reached publication timestamp. Media public projections omit private object keys and staff IDs. Revoked source/category approval immediately removes records from views. A fixed-search-path SECURITY DEFINER trigger checks and locks approval records on publication; it has no SQL parameters or dynamic SQL and no callable runtime grant. Owner bypass remains an operator trust boundary. Public JSON must contain only reviewed public fields and safe, sanitized content; no frontend renders this new read model yet.

Repository mutation authorization requires an internal `VerifiedStaffIdentity` with live-session/MFA assurance and a currently active app staff record. No roles are accepted from that object. It is **not an authentication implementation**: the future provider bridge must construct it only after verification; never bind it to a request DTO or merely decoded token. Editors create/edit/publish metadata; only admins soft-delete, change staff access, and read bounded audit results. A staff lock serializes last-admin decisions; actor row locks prevent concurrent revocation from racing an authorized mutation. Optimistic versions reject stale writes. Audit insertion and mutation are atomic; no PII snapshots or raw errors are stored. There is no browser/Data API grant. Direct runtime credentials are trusted backend credentials; this foundation does not claim per-user database RLS or protection against a compromised runtime login.

## Rehearsal commands

From the repository root:

```powershell
npm run test:r2:db --prefix backend
```

The runner initializes a unique loopback-only PostgreSQL cluster, creates `r2_test`, `r2_source`, `r2_upgrade`, `r2_restore`, applies fresh/upgrade migrations, exercises synthetic fixtures and negative paths, dumps/restores into the empty restore database, compares all app table counts/digests, rechecks migrations/grants/constraints, then stops the cluster in `finally`. Trust authentication exists only in this disposable cluster; do not use it for shared or real data. Files/logs remain in the printed OS temp directory; no recursive deletion or reuse of existing databases occurs.

For manual rehearsal, supply `R2_MIGRATION_DATABASE_URL` out-of-band pointing at a direct loopback **`r2_*`** database:

```powershell
npm run db:r2:migrate --prefix backend
npm run db:r2:migrate --prefix backend -- --apply
```

The first command applies the entire pending chain inside a transaction and rolls it back (dry run). `--apply` commits. An advisory lock prevents concurrent migrators; unknown/non-prefix history or checksum changes abort. SQL checksums normalize CRLF to LF for portability. All pending DDL and ledger entries commit atomically; failed DDL leaves the previous state usable. There are no destructive down migrations. Do not modify an applied migration; add a new reviewed version. A future nontransactional DDL requirement needs its own reviewed mechanism.

## Export, import and reconciliation

The source can be a Supabase **direct PostgreSQL** connection, supplied as `R2_SOURCE_DATABASE_URL`, using a dedicated SELECT-only account and verified TLS. No source write statement is executed. `R2_SOURCE_LOCAL_TEST=true` permits only loopback `r2_*` sources. No live source was accessed in Increment 2.

Prepare a protected, owner-reviewed JSON plan with `version:1`, nonempty `approvalReference`, and `rows`. Every row in every existing retained public table must have exactly one decision: `{table,id,sourceDigest,disposition,reason,targets?}`. `sourceDigest` is SHA-256 of the exact PostgreSQL `to_jsonb(row)::text` UTF-8 string (`digestText` exported from the tool), with session timezone UTC. This preserves bigint/numeric precision, nulls and strings without JavaScript number conversion. Export/import/reconcile/rollback pin UTC for stable timestamp digests. Dispositions are `approved`, `archived`, `deferred`, `quarantined`. Nonapproved rows cannot have targets. Missing/new/deleted/changed source rows cause export failure. An approval reference is evidence linkage, **not a verified municipal signature**; the operator must review it.

Each approved row supplies explicit mapped targets `{table,row}`. Allowed target tables/columns are listed in `fields` in `backend/scripts/r2-transfer.cjs`: provenance, categories, public content, media metadata. Use deterministic UUIDs in the reviewed mapping; no inferred staff-role migration or automatic official approval. Unsafe integer targets are rejected; encode exact large numbers or decimals as reviewed strings rather than lossy JavaScript numbers. Shared targets must match exactly. Media creator/updater IDs must already exist in an approved operator-provisioned staff roster; otherwise FKs reject the import. Preserve source IDs in `legacy_id`. Map links through reviewed asset IDs, not source provider URLs. No fixture plan is supplied as municipal data.

Export runs a repeatable-read, read-only snapshot, records counts for all public tables and partitions retained rows exactly. Nonallowlisted tables are counted as excluded, never exported; auth/storage schemas are not queried. Excluded/archived records still require a separately secured backup: a count is not an archive. The rehearsal is deliberately bounded at 10,000 rows per retained table; larger datasets need a reviewed streaming extension. Only approved mapped target fields enter the bundle; raw source rows do not. Bundle digests detect drift/corruption, not malicious rewriting by someone who controls the artifact. Protect artifact ACLs and approve the digest out-of-band. Unix file mode is restrictive; Windows operators must enforce directory ACLs.

```powershell
# Paths refer to protected operator artifacts outside the repository.
npm run db:r2:transfer --prefix backend -- export C:/protected/approved-plan.json
npm run db:r2:transfer --prefix backend -- import C:/protected/approved-plan.json.bundle.json <batch-uuid>
npm run db:r2:transfer --prefix backend -- import C:/protected/approved-plan.json.bundle.json <batch-uuid> --apply
npm run db:r2:transfer --prefix backend -- reconcile <batch-uuid>
```

Export refuses to overwrite an existing bundle. Import defaults to a rollback-only dry run that exercises real constraints. Explicit `--apply` inserts in FK order and stores the imported full-row digests plus count inventory atomically. Repeated batch/digest imports reconcile and return success without duplicate writes; conflicting data, reused IDs, changed target rows, modified bundles or rolled-back batches fail. No upsert overwrites existing content. Import failures roll back all rows and receipts. Runtime edits are excluded by table locks during reconcile/import/rollback. Reconciliation reports exact imported-subset counts and hashes; unrelated preexisting rows are intentionally outside the batch receipt.

All write/reconciliation CLIs reject remote or unmarked target databases. Reusable operator functions are tested against local pools; they are not production authorization. No automatic cutover command is provided. Production use requires a separately reviewed target guard, live catalog/FK mapping, source freeze/delta reconciliation, secure archive, official approvals, independent file checks and hosted restore evidence.

## Rollback and restore

For the isolated rehearsal only:

```powershell
npm run db:r2:transfer --prefix backend -- rollback <batch-uuid>
```

Rollback requires every imported row to still match its receipt, then removes only that batch's unchanged rows in reverse FK order. Existing references or subsequent edits abort the whole rollback. Import and rollback audit events and the marked receipt remain; a second rollback is idempotent. This procedure is not appropriate for reverting subsequent staff/media changes. No production rollback was run.

Before a future authorized cutover: take a custom-format `pg_dump` over a direct operator connection into protected storage; record source identity, PostgreSQL/tool versions and an independent archive hash. Provision a **new empty** database with reviewed roles, restore using `pg_restore --exit-on-error --single-transaction`, and compare schema checksums, grants, constraints, every table's count and canonical row digest. Keep login passwords out of argv via protected pgpass/service configuration. The automated runner demonstrates these steps locally. Cross-cluster roles, encrypted offsite backups, actual RPO/RTO, PITR and Neon branch restore remain unverified. Never use `--clean`, `DROP ... CASCADE`, restore over the live database, or assume a same-cluster test proves hosted recovery.

If cutover validation fails, keep new traffic/writes disabled, preserve evidence and the source snapshot, restore to a new verified target or switch back only under the separately approved recovery plan. Do not reopen retired citizen services. Stop after Increment 2.
