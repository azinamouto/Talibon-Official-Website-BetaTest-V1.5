# Rollback and recovery

Status: proposed runbook. No backups, restores, migrations, production writes or release actions executed in Increment 0. RPO/RTO and retention values require municipal/ops approval; no recovery guarantee is asserted.

## Discovery rollback

R1 remains on its original branch/worktree at `fd2fe689b2f442f22409ca9c7a2699e3cd0c25be`. R2 documentation is isolated on `docs/talgov-r2-increment-0`. Runtime files and canonical migrations remain unchanged. To discontinue discovery, simply continue work in the original R1 worktree; no reset, stash or destructive worktree removal is required.

## Required recovery set before a later migration

- Immutable source snapshot identifier and migration ledger/catalog; encrypted DB export with schema, retained rows and restricted deferred/archive records. Do not export plaintext passwords, sessions or MFA seeds into migration artifacts.
- Object bytes and manifest with bucket/key, visibility, row references, byte counts and SHA-256; database dumps do not contain object payloads.
- Deployed artifact SHA, previous Vercel deployment reference, configuration names/version references and runbook. Credentials remain in the secret manager.
- Staff identity mapping and enrollment state, separately protected. Never restore old active sessions as a shortcut after a security incident.
- Backup encryption-key recovery procedure, access audit and storage independent of the application mutation role. No publicly readable backup bucket.

## Restore rehearsal (Increment 6)

1. Select an isolated project/branch and verify its ID differs from production. Disable copied auth sessions, outbound jobs, provider webhooks and public access. Use authorized/sanitized data only.
2. Restore DB schema/data with a direct connection and compatible tools; provision roles separately with least privilege. Provider-managed auth schemas follow the supported provider procedure, not blind `pg_restore`.
3. Restore objects to private storage with original logical mappings. Check all approved SHA-256 values, references, counts, FK/nullability and representative content digests.
4. Verify migrated staff policy, recovery, expiry and revocation; reauthenticate staff where required. An auth-table restore must not resurrect revoked access.
5. Run public-content, private-file, CMS audit and disabled-workflow checks. Measure recovery time and data loss relative to the selected snapshot, compare with approved RTO/RPO, and retain sanitized evidence.
6. Have a second operator review and sign the recovery result. A successful command or branch creation is not enough.

Neon storage versioning/lifecycle settings are not an enforced retention mechanism; see [provider contracts](AUTH_AND_STORAGE_CONTRACTS.md). Keep immutable revision keys and independently restorable backups. A branch reset is not assumed to provide a selectable historical restore for both database and files.

## Failure matrix

| Failure | Required response |
|---|---|
| SQL migration fails | Roll back transaction, preserve ledger/checksums and failure evidence; keep previous artifact; no repair by marking unapplied SQL as applied |
| Import/reconciliation mismatch | Stop promotion, preserve source and target for diagnosis, correct mapping/import in isolated target; no source deletes |
| Object upload succeeds / metadata fails | Keep object private, mark intent for reconciliation, idempotent retry or approved cleanup; do not report success |
| Metadata commits / storage response uncertain | Reconcile by generated key/checksum and operation ID; keep unpublished until verified |
| Unpublish/delete storage step fails | Stop new grants, preserve revision, show pending failure and retry; never report completed removal |
| Auth recovery/revocation/MFA fails | Stop auth migration and CMS activation; preserve working R1 authentication, no weaker fallback |
| Source changes after rehearsal | Freeze writes and take a new manifest/delta; never assume the older rehearsal still matches |
| Staging smoke/restore fails | No production release; fix/retest the affected gate |
| Incident after R2 launch | Enter maintenance/write freeze; identify known-good compatible R2 artifact + DB/object snapshot; operator approves restoration and session invalidation |

## Cutover and rollback boundaries

Before final approval: preserve source, use single-writer source operation, rehearse target, reconcile, freeze staff publishing, perform a final approved delta and consistency check, then prepare the candidate. No automated dual-write strategy is proposed. Cutover requires documented release approval, evidence links and named rollback owner.

Before R2 accepts writes, an operator can abandon the candidate and continue the preserved R1 release, subject to its own readiness restrictions. After R2 writes begin, reverting only application code can lose or orphan content/identity/file changes. Prefer a compatible R2 fix/restore; otherwise reconcile target deltas and prove reverse compatibility before any switch.

Reactivating Supabase after cutover would violate the final R2 zero-dependency requirement. It is not an automatic fallback. If an emergency rollback to R1 is explicitly approved, label it a rollback out of R2, preserve new data, and reinstate R1 safety gates; never represent that state as completed R2. Do not destroy the old source or purge deferred records as part of routine release cleanup.
