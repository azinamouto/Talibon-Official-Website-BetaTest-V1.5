# Workflow: Neon PostgreSQL and migration
**When:** Schema, SQL, database adapter, imports and data reconciliation.

1. Inventory source Supabase tables/functions/RLS, classify **retain / archive / deferred**; never execute legacy seed scripts containing unverified LGU data in production.
2. Introduce backend-only repository/transaction boundary. Use parameterized SQL, least privilege, bounded pool, direct migration URL and pooled app URL as supported by provider.
3. Version schema migrations; define dry-run, idempotency, roll-forward, backup/restore, foreign-key/index checks.
4. Stage source snapshot securely; no committed dumps, tokens or private rows. Reconcile per-table counts, checksums where feasible, key relations and sample content with provenance.
5. Rehearse on **disposable PostgreSQL**. Distinguish that from a successful Neon connectivity test.
6. Cutover is separately approved: backups, restore proof, read-only/write freeze, validation and rollback criteria. No automatic production import.
**Done:** repeatable migration tests and evidence; unknown data marked unverified, not invented.
