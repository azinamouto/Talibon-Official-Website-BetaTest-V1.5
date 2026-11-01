# Workflow: PR review, documentation, handoff
**When:** Increment completion or review.

1. Match changes against scope; check hidden APIs, public direct routes, DB migrations, storage rights and tests.
2. Update only relevant `docs/r2/` material and root README/AGENTS references. Preserve historical context clearly marked legacy.
3. Record branch + starting/ending SHA, diff/files, contracts/migrations, test commands/counts, vulnerabilities, approvals and blockers.
4. Link failures rather than erasing historical TODOs; distinguish unit/mock/staging/production evidence.
5. Commit atomic changes after verification; no automatic PR/merge/push unless requested.
6. Keep reports concise, specific, no exaggerated status; never use unverified “production-ready.”
