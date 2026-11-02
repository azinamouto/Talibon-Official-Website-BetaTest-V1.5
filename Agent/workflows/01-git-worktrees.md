# Workflow: Git safety and worktrees
**When:** Every task, branch work, hotfix, increment.

1. `git status --short; git branch --show-current; git rev-parse HEAD; git log -3 --oneline`.
2. Read relevant `docs/r2/INCREMENT_*_REPORT.md` and `WORK_PACKAGE_REGISTER.md` **if present**.
3. Never overwrite or discard uncommitted edits. If dirty, use a separate worktree only after checking that required changes are committed or safely preserved; never stash implicitly.
4. Branch from the actual verified increment HEAD, not an assumed `main` SHA. Confirm base with `git merge-base` and `git log --graph` if needed.
5. Keep one logical concern per commit; tests and evidence go with implementation. `git diff --check` before commit.
6. Do not push/merge/deploy/force-update remote refs without permission. Report SHA accurately.
**Done:** Worktree state and exact base recorded; no unrelated files modified.
