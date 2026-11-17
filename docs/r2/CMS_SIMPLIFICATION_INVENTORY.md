# TalGov R2.1 CMS simplification inventory

Base: both GitHub main refs verified as `38c7728851a41a2351daa9efb7f944e88eede67c` on 2026-11-17. Isolated branch `feat/r2-1-cms-simplification-20261117`. Existing worktrees and dirty files are preserved.

## Authoring and public contracts

| Editor | Database kind | Public destination / contract |
| --- | --- | --- |
| News, announcements, notices | news | `/news`, `/api/news`, category ARTICLE/ANNOUNCEMENT/NOTICE |
| Advisories | advisories | `/news/advisories`, `/api/news?category=ADVISORY` |
| Updates | updates | `/news/updates`, `/api/news?category=UPDATE` |
| Tourist spots | tourism_spots | `/tourism/spots`, tourism API |
| Festivals | tourism_festivals | `/tourism/festivities`, tourism API |
| Local delicacies | tourism_delicacies | `/tourism/delicacies`, tourism API |
| Transparency | transparency_reports | Full Disclosure, infrastructure, finance, budget, bidding, executive orders; six existing category values |
| Executive/legislative mandates | pages | Existing executive/legislative mandate routes |
| Organizational chart | organizational_chart | `/executive/organizational-chart`, executive API |
| Departments | departments | `/about/departments`, existing imported IDs retained |
| Municipal/tourism albums | galleries | `/news/gallery`, tourism gallery |
| Downloadables | downloadables | `/news/downloadables`, downloads API |
| Photos / documents | media_assets | `/api/media`, authorized public previews/downloads |
| Official material review | content_sources | Administrator source registration/approval, fresh MFA |
| Staff access / audits | staff_accounts / audit_events | Existing administrator controls retained |

The public catalog also retains imported barangays, officials, events, navigation, ordinances, resolutions, charter and service information. These are not all existing CMS authoring kinds. Events will use their already valid database kind. Public pages will gain a general text editor in addition to the two mandate editors. Deferred citizen/service authoring endpoints must remain HTTP 410.

All content authoring uses `/api/admin/content/:kind`, versioned edit/preview/publish/unpublish/archive/restore/delete. The centralized media library uses reserve/upload, authenticated metadata/preview/download and versioned media actions. Direct uploads retain the same upload identity on retries. Storage is private, file verification is mandatory, and attachment links are persisted with the draft.

## Invariants and planned changes

- Better Auth, live staff authorization, MFA, administrator-only source approval/deletion and same-origin checks remain authoritative.
- Content, attachments, timestamps, versions and audit writes remain transactional. Slugs are generated on the server while existing slugs/IDs are retained.
- A versioned, opt-in combined publication action publishes only explicitly selected ready attachments after source/category approval checks, in the content transaction. Existing separate media publication remains supported.
- Structured highlights, event times, officials and chart relationships use bounded, allowlisted JSON body fields. No schema migration is required.
- Existing imported metadata can only be retained unchanged unless it becomes an explicitly supported field.
- Public reads remain through approved publication views; revoked sources/categories and unpublished linked files still suppress public content.
- No hosted Neon access, migration execution, environment/storage changes, deployment, push or merge is part of this work.

## Phases

0. Inventory and baseline isolation.
1. Shared editor controls, generated slugs and atomic publication.
2. News/advisories/updates and tourism editors.
3. Events/festivals, albums and contextual media.
4. Transparency, downloadables, departments, public pages and chart.
5. Public rendering, accessibility and recovery.
6. Builds, lint/typechecks, unit/contracts, disposable PostgreSQL and browser/security verification.

Fixtures are explicitly fictional. Browser mocks and in-memory test storage provide local evidence only, not hosted qualification.
