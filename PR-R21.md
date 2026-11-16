Title: feat(cms): expand TalGov R2.1 municipal publishing
Base: main
Head: feat/r2-municipal-cms-expansion

Staff can now prepare attributed municipal records as private drafts, preview them, and publish them through separate versioned actions. Published records must be unpublished before editing. Publication requires approved source material and published, verified library attachments; withdrawal of a linked file or its approval removes the record from public reads.

The existing StaffPortal includes real dashboard totals and activity, news/advisories/updates, tourism spots/festivals/delicacies/galleries, transparency reports, mandates/chart/offices, photo collections and categorized downloadables. Source registration and approval require fresh administrator MFA. Existing staff management, audit logs, private storage and retired e-service boundaries are preserved.

Migration 003 adds municipal kinds, timestamps, audit actions, scoped runtime privileges and audited source approval. It was rehearsed against both the foundation schema and the existing R2 staging content policy, including preservation of existing published records. Existing hosted migration manifests and bootstrap policy are unchanged.

Published records feed the existing public news, Updates, tourism, transparency, government and downloads routes. Imported government metadata is retained unchanged when editing. Public attachments use verified media endpoints, and mutable municipal reads bypass shared caches.

Validation: backend/frontend production builds, typechecks and lint; 4 Jest and 249 backend regression tests; 11 municipal database tests; 13 R2 database tests and exact backup/restore; 11 media database tests including real password/TOTP cookies and verified PDF downloads; 17 frontend Node tests; 124 distinct React tests; OpenAPI snapshot validation and 37 route/contract regressions.

Release approvals still required: a reviewed transactional application of migration 003 to an explicitly named Neon branch/database; pushing this branch and opening a PR against main; deployment. Hosted migration, GitHub publication and deployment have not been performed. The original manual-patch README.txt remains unchanged and untracked.
