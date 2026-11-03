# Neon organization and agent setup

Setup date: **2026-11-01 (Asia/Shanghai)**. This is development infrastructure/tooling setup following Increment 2, not an application cutover or production qualification.

## Account and project

- Verified organization **Akei**, `org-patient-mud-50407342`, through the authenticated CLI.
- Created **talgov-r2**, `misty-silence-69777617`, PostgreSQL 18, in **AWS Singapore** (`aws-ap-southeast-1`), as selected by the user.
- Created and selected the empty development branch **dev-talgov-r2-foundation**, `br-bitter-fire-aouffr8u`; retained its empty parent `main`.
- [Neon Console](https://console.neon.tech/app/projects/misty-silence-69777617/).
- Git setup branch: `chore/talgov-neon-setup`, based on `2997183` (the user's agent-rules commit after the Increment 2 report). Increment 2 history is preserved.

## Every configuration change

| Location | Change |
|---|---|
| Global npm installation | Installed Neon CLI **8.16.0** with `npm install -g neon`; repository manifests/locks were not changed |
| Neon user profile / Windows Credential Manager | Completed user-driven OAuth login with `neon login --keyring`; authenticated DEFAULT profile uses keyring storage |
| npm cache | Downloaded an isolated **Node 22.23.4** executable to meet the skills installer's Node >=22.20 requirement; system Node **22.16.0** and PATH were not changed |
| `.agents/skills/neon/` | Installed the requested Neon skill and its six upstream reference documents |
| `.agents/skills/neon-postgres/` | Installed the relevant PostgreSQL skill and its four upstream reference documents |
| `skills-lock.json` | Added upstream source paths and content hashes for those two skills |
| `.codex/config.toml` | Added a project-scoped, OAuth-only `Neon` MCP entry at `https://mcp.neon.tech/mcp?projectId=misty-silence-69777617`; no API key or authorization header stored |
| `.neon` (ignored) | Created org/project/branch context, then selected the development branch |
| `.env.local` (ignored) | Created pooled `DATABASE_URL`, direct `DATABASE_URL_UNPOOLED`, and `NEON_BRANCH` for the development branch; no secret values are included in this report |
| `.gitignore` | Appended `.neon`; existing `.env*` exclusion already protects `.env.local` |
| This report | Records setup, preservation, verification and remaining integration limits |

There were no existing project Neon skills/MCP/context/config files. Hash comparisons verified that global `~/.codex/config.toml`, existing backend/frontend `.env` files, and root/backend package manifests and lockfiles remain byte-for-byte unchanged. No application source, migration, auth flow or storage integration was changed. No `neon.ts` was generated, no deployment was run, and no API key was minted for MCP.

## Instructions and execution

Fetched and followed the requested [Neon skill](https://neon.com/.well-known/agent-skills/neon/SKILL.md) and [getting-started prompt](https://neon.com/get-started/prompt.md). Checked installed state before adding tooling; the Neon account had no existing project. Used `aws-ap-southeast-1` from current documentation/CLI, correcting the getting-started prompt's `ws-ap-southeast-1` typo.

Ran `neon init -y --agent codex --skill neon --skill neon-postgres --mcp-auth oauth --mcp-config-location project --mcp-project-scoped --org-id org-patient-mud-50407342 --project-name talgov-r2 --region-id aws-ap-southeast-1 --no-config` under isolated Node 22.23.4. Project creation, environment pull and MCP configuration succeeded; the nested npm invocation made the skills child process fail with EUSAGE. Retried **only** `neon skills -y --skill neon --skill neon-postgres --agent codex`, using the cached Node executable directly; this succeeded. No project or successful configuration step was recreated.

Selected the development branch using `neon checkout dev-talgov-r2-foundation --create --no-env-pull`, then explicitly pulled only PostgreSQL and branch variables with `neon env pull --service postgres --env NEON_BRANCH --file .env.local`. This avoids pulling unrelated gateway credentials or replacing existing app environment files.

## Verification and limits

- `neon skills status --output json`: **neon and neon-postgres both up to date**.
- `codex mcp get Neon --json`: **enabled**, `streamable_http`, expected project-pinned URL, no token environment variable or HTTP authorization headers. The running assistant has not hot-loaded this server. Restart/reload Codex and authorize Neon OAuth on first MCP use; no authenticated MCP round trip is claimed.
- CLI project lookup: expected organization/project, Singapore, PostgreSQL 18.
- Pooled and direct database connections: **2/2 passed** with `pg`, verified TLS (`rejectUnauthorized:true`, authorized TLS socket), channel binding enabled, and read-only transactions. Server **18.6**; database `neondb`; **zero public tables and no app schema**. No schema/data write was performed.
- `git check-ignore .env.local .neon`: both ignored. Existing environment/global configuration/package hashes match their pre-setup values. No database URLs or passwords were printed or added to tracked files.
- No application tests were rerun: application code and dependencies are unchanged. These checks qualify setup/connectivity only, not Increment 2 migrations on Neon, RBAC grants, pool behavior under load, restore, or application integration.

**Historical setup blocker (resolved for development in Increment 2.1):** Neon generates URLs containing `channel_binding=require`; Increment 2's original adapter accepted only `sslmode`. The setup connectivity probe used explicit TLS/channel-binding settings without changing the URL. See the qualification addendum below for the tested adapter and restricted database logins.

Existing dependency advisories and auth/MFA/storage/content-approval/production gates remain open. No production migration, data import, deployment, push or merge occurred.

## Increment 2.1 qualification addendum — 2026-11-02

The preceding sections record the original empty-infrastructure setup, not the current database contents. [Increment 2.1](INCREMENT_2_1_REPORT.md) applies the unchanged versioned migrations to `neondb` on **`br-bitter-fire-aouffr8u` only**. It qualifies real direct/pooled TLS connections, mandatory SCRAM-SHA-256-PLUS, restricted logins, synthetic repository/transaction tests, reconciliation, batch rollback and logical dump/restore. The parent `main`, `br-flat-shape-aoyf83yq`, received no SQL connection or write; the final control-plane observation reports zero written data bytes.

- Runtime login **`talgov_r2_app`** inherits only the NOLOGIN group `talgov_runtime`; migration login **`talgov_r2_migration`** owns the app schema and migration ledger. Neither has SUPERUSER, CREATEDB, CREATEROLE, REPLICATION or BYPASSRLS. The migration login has CREATE in the designated database/public schema; runtime has neither CREATE nor TEMPORARY in `neondb`.
- `.env.local` now contains runtime credentials only (pooled and direct). Original provisioning credentials are isolated in ignored `.env.neon-provisioning`; migration/runtime qualification credentials are in ignored `.env.neon-qualification`. All three have Windows ACLs restricted to the current user. Existing backend/frontend environment files and global Codex configuration were not edited. Do not include either operator file in a deployed web environment.
- `pg` is pinned to **8.23.1**. `enableChannelBinding:true` prefers binding but alone does not enforce `require`; the adapter's guarded Client extension refuses weaker authentication, and the pool admits only a completed verified PLUS exchange. Authentication hooks are version-sensitive and must be requalified on upgrades.
- The Windows libpq system certificate-store attempt failed closed. Backup/restore subsequently used Node's bundled public trust anchors as an explicit CA file, `sslmode=verify-full`, and `channel_binding=require`. No certificate verification bypass was used.
- Synthetic test databases, failed-run fixtures and ACL-protected local backup artifacts are retained for review. They are not approved municipal content. The application database module remains unmounted; no authentication, storage, production cutover or deployment was introduced.

This qualifies development integration and logical recovery on one Neon branch. It does not qualify Neon PITR/branch restore, cross-project recovery, production load/cold starts, RPO/RTO, official data or dependency security. Stop after Increment 2.1.
