# Workflow: Deferred e-services / payment shutdown
**When:** `/e-services`, `/forms/*`, `/payment/*`, submissions, certificates, tracking, checkout and related jobs.

1. Do not restore application forms, checkout buttons, receipts or success claims in R2.
2. Keep approved placeholder and navigation; direct links must also fail safely.
3. NestJS endpoints return intentional documented 410/503 response with no provider side effect, database mutation, email task or fabricated success.
4. Disable scheduled workers/integrations for deferred workflows; avoid breaking retained CMS/public APIs.
5. Tests must invoke real HTTP route handlers and assert the absence of provider calls, not only UI hiding.
6. Preserve old implementation in Git; no production data deletion. Any future reactivation requires separate scope and security signoff.
