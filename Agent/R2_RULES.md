# TAL.GOV R2 — Non-negotiable agent rules

## Approved scope
- Retain public municipal informational pages, existing approved public news/content, accessibility, navigation, search (if compatible), admin/editor CMS for **photos and documents only**.
- E-services navigation remains a public **To Be Implemented** notice. Disable certificate/application submission, status tracking, payment checkout and related jobs **server-side**; keep historical code recoverable through Git.
- Target runtime: React/TypeScript/Vite + NestJS on Vercel; **Neon PostgreSQL, Neon Auth and Neon Object Storage** only after verifying actual SDK/API, entitlement, MFA and access-control support.
- Goal is zero **active Supabase runtime** dependency after validated cutover; historical SQL/docs may remain clearly archived.

## Data, access and privacy
- Never fabricate officials, barangay population, department contacts, permits, legal citations, fees, services, approval status or official announcements. Unknown means unknown; seek evidence/approval.
- No secrets or personal applicant data in commits, tests, fixtures, logs, URLs or PR descriptions.
- Backend enforces deny-by-default authorization. Frontend route guards are not authority.
- Public media and private drafts must have different access rules; publication status is enforced on download paths.
- MFA and legacy identity migration remain gated until capabilities are verified. Never silently relax MFA or allow public editor signup.

## Change safety
- Preserve clean/dirty R1 and R2 branches, commits and worktrees. No resets, force pushes, destructive migrations or production mutations.
- Explicitly mark local, mocked, disposable-Postgres, staging and production test evidence.
- Existing audit vulnerabilities and hosted shutdown are **open blockers** until verified resolved; no unearned production-ready claims.
- Prefer targeted changes and token economy without sacrificing verification.

## Before done
List: branch/start and end SHA, changed files/contracts, commands and exact results, blocked/unverified gates, migration/rollback implications, commits and next action.
