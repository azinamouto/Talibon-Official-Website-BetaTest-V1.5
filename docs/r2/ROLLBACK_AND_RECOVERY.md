# Rollback and recovery


Current pre-apply status: **NO-GO**. The candidate has six migrations; historical five-file statements below are superseded by [the current qualification](STAGING_READINESS.md#pre-apply-qualification---2026-11-09). Historical approvals and pending records are preserved.


## Six-migration disposable recovery procedure - 2026-11-09

### Supported assumptions and owner decisions

| Item | Supported position / acceptance still required |
|---|---|
| Data loss / RPO | Existing ALZA decision conditionally accepts loss of all disposable schema and synthetic data. Proposed recovery point is the verified empty pre-migration baseline; all later synthetic writes may be lost. This is not zero-data-loss RPO. Owner/reviewer must accept that precise loss boundary after inventory proves no real LGU/staff/object data needs preservation. |
| Dependencies | No production dependency is authorized; absence is not yet evidenced. Inventory consuming apps/configuration, jobs, webhooks, integrations, child branches, storage and auth bindings, and verify separate staging secrets. An unexpected dependency stops recreation. |
| RTO | No measured recovery time or accepted numeric objective exists. Recovery owner must specify an achievable duration, starting at declared staging outage and ending at accepted replacement preflight, and record a separately authorized rehearsal measurement. Approval/provisioning/credential/review delays count. No SLA is asserted. |
| Retention | No accepted period or verified provider history window exists. Owner must record evidence-retention duration, protected storage/access owner and expiry; retain failed branch and sanitized candidate/inventory/failure evidence pending that decision. No deletion is authorized here. DB history does not establish object recovery. |

### Reproducible recreation specification (not executed)

Inputs to record before execution: approved parent ID **only `br-steep-sea-ao0qw05a`**, exact verified empty baseline timestamp/LSN and protected inventory reference, unique replacement name `staging-talgov-r2-recovery-<UTC timestamp>`, same project, named operator/reviewer, accepted retention and recovery objectives. If that staging baseline is unavailable or outside retained history, **stop**; do not substitute main/development/production or clone current failed state. No valid baseline/destination is yet recorded.

1. Preserve the original branch and freeze staging writers/control-plane changes under the accepted recovery window. Resolve uncertain COMMIT with the existing read-only preflight procedure below before deciding recreation is necessary.
2. Under separate recovery execution authorization, in Neon Console select project `misty-silence-69777617` > Branches > New branch. Explicitly select the pinned staging parent above, the approved unique name, and **Past data** at the verified empty baseline time (or Current data only if the still-empty parent is freshly verified under freeze). Disable automatic deletion; never accept the default parent. Save the selected inputs and operation result without credentials. Do not execute these steps under the current preparation-only request.
3. Record new branch/endpoint IDs and direct hostname; verify project/organization/region, PostgreSQL 18, non-default/non-primary branch and endpoint binding. Inventory the replacement database, schemas/history, roles/ACLs, staff state and object/service dependencies against the accepted baseline. Do not fix discrepancies with ad hoc privilege changes. Schema-only cloning is not an empty baseline: it retains source schema. Branch creation also inherits role passwords, so credential separation must be reviewed before any use.
4. **Stop before runner use:** current guards require the exact name `staging-talgov-r2` as well as pinned IDs; changing JSON IDs alone cannot qualify the uniquely named replacement. A separately authorized, reviewed target/name update and guard validation is required, retaining rejection of main/development/production. No rename, guard edit or connection switch is authorized here. Preserve six SQL files and manifest unchanged.
5. After replacement target review and secure credential provisioning, run the existing `--preflight` against the reviewed replacement; require empty result `{"mode":"preflight","applied":0,"pending":6}` and accepted inventory/ACLs. Record elapsed recovery time and independent acceptance. Replay/switch require later explicit authorization; they are not performed by this specification.

Provider basis: [Neon branch management](https://neon.com/docs/manage/branches) documents explicit parent selection, retained-history recovery points, unique names, schema-only behavior, automatic expiration and inherited role passwords. This is a conditional reproducible procedure, not proof of available history, completed recreation or restore qualification.

Procedure checked against the current runner; hosted recreation NOT validated. This supersedes five-row recovery instructions below. Existing conditional ALZA acceptance of disposable schema/synthetic-data loss remains recorded; it is not completed recovery acceptance.

1. Stop staging writers and control-plane changes. Preserve timestamped sanitized failure output, exit status, target IDs, candidate/runner/catalog hashes and ledger evidence. Do not infer rollback from a failed connection or uncertain COMMIT.
2. Once existing read-preflight prerequisites are satisfied, reconcile the pinned target using `node backend/scripts/r2-staging-migrate.cjs --preflight`. Empty baseline expects applied 0/pending 6; complete six-row history expects applied 0/pending 0 with catalog verification. The runner also accepts an exact historical five-row prefix (pending 1); that is not the approved empty baseline and requires review, not automatic continuation. Any failure or unexpected state stops recovery.
3. Before replacement, verify timestamped database/object/staff-state inventory and absence of dependent apps, jobs, webhooks, integrations and child branches. Zero application tables alone is insufficient. Recovery owner and independent reviewer must accept inventory, destination, RPO/RTO, evidence retention and escalation contact.
4. Preserve the failed branch. Have the authorized operator prepare a distinct empty isolated staging destination from a verified empty baseline; never clone unverified production/development data, reset a shared branch, delete history or overwrite the failed target. Destination ID and provisioning evidence remain PENDING; no recreation command is executable yet.
5. Replacement IDs cannot pass the current pinned runner. Review new target metadata/pins and restricted-role evidence separately, preserve all six SQL/manifest bytes, and obtain fresh target-bound preflight evidence (0 applied/6 pending). Do not weaken guards or grant elevated privileges. Migration replay requires subsequent explicit six-migration authorization; no apply is executed by this procedure review.

Validation limit: required process credentials are absent. No hosted inventory, recreation, restore, measured recovery time or dependency-isolation result is claimed. Production and development resources are untouched.

## Final scope alignment - 2026-11-09

Recovery planning retains the unchanged five-migration, 20-application-table CMS/auth baseline, including `app.import_batches` and `app.content_asset_links`; no alternative 18-table recovery baseline is prepared. See the [final scope/readiness decision](STAGING_READINESS.md#final-cms-database-scope-decision---2026-11-09). Recorded ALZA staging execution authorization remains valid for its approved scope and need not be requested again. Recovery-owner/independent-reviewer acceptance, inventory, destination, retention, RPO/RTO and freeze/escalation records below remain PENDING; this scope decision supplies no recovery, security or review evidence.


## Owner-authorized execution recovery assessment - 2026-11-09

Recorded at 2026-11-09 01:51:47 Asia/Shanghai (UTC+08:00). The owner has authorized staging execution; see the current STAGING_READINESS.md assessment. Recovery acceptance remains PENDING. The supplied zero-application-table observation has not been reverified in this session because required credentials are absent. It does not establish absence of staff state, history, other schemas or object payloads.

Applicable procedure for this intended empty schema-only target:

1. Before preflight, obtain authorized database/object inventory for the exact pinned staging target, with inspection timestamp and owner/independent-reviewer acceptance. Unexpected nonempty state stops this path. Record recovery owner, escalation contact, separate isolated recovery destination, retention and achievable RPO/RTO; none is invented here.
2. Preserve candidate hashes, manifest, sanitized output and baseline/failure evidence. The five migrations and private history are one transaction; on failure the runner attempts rollback and closes the connection. An error alone does not prove rollback.
3. For an uncertain COMMIT, freeze further writes and reconcile using the authorized runner's read-only preflight once its mandatory gates are satisfied. Accept only the exact empty state or complete five-row history plus matching catalog/ownership/ACLs. Partial or unexpected state requires escalation, not ledger editing or blind retry.
4. For an accepted empty baseline, isolated replacement/reprovisioning is the proposed recovery path. Select and authorize its distinct destination before execution. Do not reset a shared branch, overwrite the target, delete history or run down migrations. This session does not execute a recovery branch/restore.
5. Retain failure evidence and verify the replacement separately before any switch. Empty replacement is not a restore rehearsal, object recovery or PITR test. No recovery test, retention guarantee or measured RPO/RTO is claimed.


## Staging recovery-baseline checklist

**PENDING - preparation only, 2026-11-08.** Owner, reviewer, decisions and evidence
below are unverified. Link protected external evidence by non-secret reference;
do not attach dumps, object contents, staff mappings, credentials or keys.
This checklist satisfies neither restore qualification nor approval by itself.

- [ ] **PENDING:** ALZA recovery owner name, independent reviewer, dated written
  acceptance and evidence reference; approved target IDs, baseline timestamp,
  retention, RPO/RTO, recovery destination and escalation owner.
- [ ] **PENDING:** For the ALZA empty schema-only path, approve a documented empty
  staging baseline. The protected-set option below is for a separately authorized
  broader scope, not a fallback permitting nonempty state on this path. Record
  the decision and scope. Nonempty/unexpected state stops the fresh-target procedure.
- [ ] **PENDING - empty option:** authorized inspection evidence that the exact
  target has no application data, TalGov schemas/history, staff state or object
  payloads requiring preservation; record database/object inventory and reviewer
  acceptance. Document isolated replacement/reprovisioning and preservation of
  failure evidence. An empty baseline does not prove DB/object restore or PITR.
- [ ] **PENDING - protected-set option:** immutable snapshot and ledger/catalog
  references; encrypted DB export; private object backup/manifest with counts,
  references and SHA-256; artifact/deployment and configuration-version references;
  protected staff/enrollment mapping where applicable. Account for every item in
  the required recovery set below. Explicitly justify any non-applicable item.
- [ ] **PENDING - protected-set option:** evidence of encryption, retention,
  independent storage/access controls, access audit and recoverable keys; isolated
  restore/reconciliation results and second-operator signoff. Record measured
  RPO/RTO against approved objectives; identify untested PITR/cross-project/object
  recovery capabilities without claiming success. For the unselected option,
  record the owner's dated rationale rather than a fabricated verification.
- [ ] **PENDING:** Maintenance/write and control-plane freeze agreed with the
  [authorization record](STAGING_READINESS.md#staging-authorization-record---preparation-2026-11-08).
  Confirm unknown COMMIT outcomes require approved read preflight reconciliation;
  no history deletion, down migrations, shared-branch reset or overwrite restore.
  Any recovery branch/restore requires separate authorization before execution.

ALZA approval covers only its independent empty staging infrastructure. Real LGU
records, production recovery/deployment and external integrations retain their
separate applicable approvals. Empty-baseline acceptance does not close the
credential incident: revocation/rotation and access-log review evidence plus
security-owner acceptance remain required in the staging authorization record.

Historical local/development tests below do not verify this staging baseline.

## Historical recovery context

Increment 2.1 update (2026-11-02): synthetic import reconciliation/batch rollback and direct logical backup/restore now pass on the designated Neon development branch. Restore checks all nine operational tables, exact row digests, schema history, constraints, indexes, views, functions and effective privileges. The original database is never overwritten. See [the development procedure](NEON_MIGRATION_PLAN.md) and [qualification evidence](INCREMENT_2_1_REPORT.md). This does **not** qualify provider PITR, branch restore, cross-project disaster recovery, production data, RPO/RTO or production cutover. The following Increment 0 material remains historical planning.

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
# Increment 2 rehearsal addendum

The database test runner now exercises atomic migration/import failure, guarded batch rollback and full logical restore into a new disposable database with exact table digests, checksums, grants and constraints. See [commands and limitations](DATABASE_OPERATIONS.md) and [execution evidence](INCREMENT_2_REPORT.md). No destructive down migration, production rollback, object restore, Neon PITR or cross-cluster role restoration is implemented or certified. The historical recovery plan above remains a release requirement.



### ALZA — Empty Staging Recovery Decision

**Environment:** TalGov R2 — Neon staging<br>
**Project:** `misty-silence-69777617`<br>
**Branch:** `staging-talgov-r2`<br>
**Branch ID:** `br-steep-sea-ao0qw05a`<br>
**Database:** `neondb`

**Observed baseline:** 0 application tables, based on the operator's PostgreSQL inspection on November 9, 2026.

**Data classification:** Intended schema-only environment; no real LGU data authorized.

**Recovery owner:** PENDING — name and acceptance required.

**Recovery destination:** PENDING — identify a separate, isolated recovery branch or database.

**Recovery method:** PENDING — verify Neon branch restore, protected snapshot, or another supported method.

**Retention:** PENDING — select and confirm an achievable retention period.

**RPO/RTO:** PENDING — recovery owner must select acceptable values based on actual recovery capabilities.

**Recovery acceptance:** PENDING — not approved until the above decisions and evidence are complete.



### ALZA Staging Recovery Decision — November 9, 2026

**Authority:** AJ Rienze Josol, ALZA infrastructure owner

**Target:** Neon project `misty-silence-69777617`, branch `staging-talgov-r2` (`br-steep-sea-ao0qw05a`).

**Environment:** Disposable, schema-only staging. No real LGU data or production dependencies are authorized.

**Observed baseline:** Zero application tables, verified through PostgreSQL inspection before migration.

**Recovery strategy:** If the schema migration fails, stop database writes, preserve the failure evidence, and assess whether the existing branch can safely be retained. If recovery requires recreation, recreate an isolated empty staging branch and rerun the unchanged, checksum-verified migrations.

**Recovery acceptance:** ALZA owner accepts loss of disposable staging schema and synthetic test data, provided isolation and absence of real government records are verified.

**Recovery evidence:** PENDING — confirm that the branch has no dependent services, record the recreation procedure and identify the recovery destination.

**Recovery objectives and retention:** PENDING — record the accepted RPO, RTO and evidence-retention period.

**Production impact:** No deletion or recreation of Neon `main`, development branches or production resources is authorized.
