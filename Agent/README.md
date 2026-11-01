# TalGov R2 Agent Rule Pack

The canonical Codex entrypoint is **`AGENTS.md` at repository root**, which routes work to concise files in `Agent/workflows/`. `Agent/R2_RULES.md` defines hard constraints.

Install by copying this folder's contents into the root of the **current R2 worktree**, merging `Agent/` without deleting its existing files.

**Do not copy the old project ZIP over your R2 worktree.** This rules package was prepared from a snapshot of `main` that includes legacy Supabase guidance; the live incremental R2 branch is the source of truth for code and reports. Keep `Agent/AGENT.md`, `SECURITY.md` and `COST_OPTIMIZATION.md` as historical legacy files until separately reviewed.

No runtime code is modified by this pack. These are instructions for future coding agents, not proof of runtime readiness.
