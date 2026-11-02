# TAL.GOV — Agent Entry Point (R2)

Applies to this repository. **Read `Agent/R2_RULES.md` first**, then only the matching workflow document under `Agent/workflows/`. Do not treat legacy `Agent/AGENT.md`, `Agent/SECURITY.md`, or `.devin/skills/` Supabase references as target architecture; they document R1/legacy context.

## Routing
| Task | Read |
|---|---|
| New work / Git safety | `Agent/workflows/01-git-worktrees.md` |
| Backend/API | `Agent/workflows/02-backend-api.md` |
| Frontend/public site | `Agent/workflows/03-frontend-ui.md` |
| Neon/schema/migration | `Agent/workflows/04-neon-database.md` |
| Login and permissions | `Agent/workflows/05-auth-rbac.md` |
| Photos/documents CMS | `Agent/workflows/06-media-cms.md` |
| Tests and regression | `Agent/workflows/07-testing-qa.md` |
| Secrets, vulnerabilities, threat review | `Agent/workflows/08-security-privacy.md` |
| Vercel, CI, release | `Agent/workflows/09-devops-release.md` |
| Documentation and code review | `Agent/workflows/10-review-handoff.md` |
| Public government information | `Agent/workflows/11-official-data.md` |
| Deferred e-services/payment | `Agent/workflows/12-deferred-services.md` |

## Operating sequence
1. Inspect `git status --short`, branch, HEAD and relevant `docs/r2/*`; preserve user edits.
2. State narrow acceptance criteria, edit only necessary files, run targeted checks.
3. Run relevant full gates, report pass/fail/skipped/unrun precisely.
4. Never deploy, merge, push, migrate production data, or change production secrets unless specifically authorized.
5. Prefer concise, evidence-backed handoffs. Avoid fabricated municipal records and fake verification.

**Snapshot caution:** This rule pack was derived from an uploaded `main` ZIP and conversation-provided R2 reports. Reconcile with the actual R2 worktree before acting; do not assume later code or docs exist in the ZIP.
