# Workflow: NestJS API
**When:** `backend/src/`, `api/`, controllers, DTOs, services, guards.

1. Locate existing controller/service/DTO, `configure-app`, guards and tests. Preserve API version and OpenAPI contracts.
2. Define contract, status codes, input limits, authentication, authorization, caching and failure behavior first.
3. Use DTO validation, parameterized queries via persistence layer, consistent sanitized exceptions, safe structured logs and request IDs.
4. Privileged CMS mutations require backend admin/editor checks, publication boundaries and audit events. Never trust client roles or file paths.
5. Deferred e-services/payment routes must be closed at controller **and underlying side-effect** level; no provider call or DB write.
6. Update OpenAPI and API integration tests for every contract change.
**Verify:** `npm --prefix backend run build`, `npm --prefix backend run lint`, `npm --prefix backend test`. Note if tests require external credentials.
