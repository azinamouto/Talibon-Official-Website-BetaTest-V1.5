#!/usr/bin/env bash
# Creates labels, sprint milestones and issues for the roadmap.
# Usage: [DRY_RUN=1] ./create-github-issues.sh [owner/repo]
# Without an argument it uses the repo of the current directory.
set -euo pipefail

R=(); REPO_PATH="{owner}/{repo}"
if [[ -n "${1:-}" ]]; then R=(--repo "$1"); REPO_PATH="$1"; fi
DRY="${DRY_RUN:-0}"

run() { if [[ "$DRY" == "1" ]]; then echo "[dry-run] $*"; else "$@"; fi; }

issue() {
  local title="$1" ms="$2" labels="$3"
  if [[ "$DRY" == "1" ]]; then echo "[dry-run] issue: $title"; cat >/dev/null; return; fi
  gh issue create ${R[@]+"${R[@]}"} --title "$title" --milestone "$ms" --label "$labels" --body-file -
  sleep 1
}

echo "== Labels =="
run gh label create backend ${R[@]+"${R[@]}"} --color 1d76db --description 'Backend work' --force
run gh label create frontend ${R[@]+"${R[@]}"} --color 0e8a16 --description 'Frontend work' --force
run gh label create integration ${R[@]+"${R[@]}"} --color 5319e7 --description 'Cross-team BE+FE work' --force
run gh label create testing ${R[@]+"${R[@]}"} --color fbca04 --description 'Testing and QA' --force
run gh label create devops ${R[@]+"${R[@]}"} --color c5def5 --description 'Deployment and infrastructure' --force
run gh label create security ${R[@]+"${R[@]}"} --color b60205 --description Security-sensitive --force
run gh label create database ${R[@]+"${R[@]}"} --color 0052cc --description Database --force
run gh label create critical-path ${R[@]+"${R[@]}"} --color d93f0b --description 'On the critical path' --force
run gh label create pts-1 ${R[@]+"${R[@]}"} --color ededed --description 'Estimate: 1 points' --force
run gh label create pts-2 ${R[@]+"${R[@]}"} --color ededed --description 'Estimate: 2 points' --force
run gh label create pts-3 ${R[@]+"${R[@]}"} --color ededed --description 'Estimate: 3 points' --force
run gh label create pts-5 ${R[@]+"${R[@]}"} --color ededed --description 'Estimate: 5 points' --force
run gh label create pts-8 ${R[@]+"${R[@]}"} --color ededed --description 'Estimate: 8 points' --force

echo "== Milestones =="
run gh api "repos/$REPO_PATH/milestones" -f title='Sprint 1 - Foundation & Core Infrastructure (Weeks 1-2)' -f description='Auth, API skeleton and DB schema exist on BE; app shell and design system exist on FE; FE can log in against real auth.' >/dev/null || echo "milestone exists: Sprint 1"
run gh api "repos/$REPO_PATH/milestones" -f title='Sprint 2 - Public Website Features (Weeks 3-4)' -f description='Public pages render live content from the content and public APIs.' >/dev/null || echo "milestone exists: Sprint 2"
run gh api "repos/$REPO_PATH/milestones" -f title='Sprint 3 - E-Services & Forms (Weeks 5-6)' -f description='Five e-service forms submit end to end and payment works with success/failure handling.' >/dev/null || echo "milestone exists: Sprint 3"
run gh api "repos/$REPO_PATH/milestones" -f title='Sprint 4 - Admin Dashboard (Weeks 7-8)' -f description='Secured admin APIs and an admin UI with user management, content management and reports.' >/dev/null || echo "milestone exists: Sprint 4"
run gh api "repos/$REPO_PATH/milestones" -f title='Sprint 5 - Advanced Features (Weeks 9-10)' -f description='Search, AI chatbot, maps/visualizations and analytics are live.' >/dev/null || echo "milestone exists: Sprint 5"
run gh api "repos/$REPO_PATH/milestones" -f title='Sprint 6 - Testing & QA (Weeks 11-12)' -f description='Test suites, security/performance/accessibility results and full-stack E2E flows pass.' >/dev/null || echo "milestone exists: Sprint 6"
run gh api "repos/$REPO_PATH/milestones" -f title='Sprint 7 - Deployment & Launch (Weeks 13-14)' -f description='Production is live: BE deployed first, then FE, with monitoring and backups in place.' >/dev/null || echo "milestone exists: Sprint 7"

echo "== Issues =="
# ---- Sprint 1 ----
issue '[S1-BE-01] Finalize database schema and migrations' 'Sprint 1 - Foundation & Core Infrastructure (Weeks 1-2)' backend,database,critical-path,pts-5 <<'EOF_BODY'
**Sprint 1: Foundation & Core Infrastructure (Weeks 1-2)** | Roadmap Phase 1 | **Estimate:** 5 pts
**Depends on:** none
**Note:** Week 1. Schema changes are the highest-impact backend risk.

### Acceptance criteria
- [ ] Schema covers users, roles, content, form submissions and payments
- [ ] Migrations are versioned and apply cleanly to an empty Supabase/PostgreSQL DB
- [ ] RLS policies drafted and reviewed
- [ ] Schema reviewed by FE lead before merge

_Ticket ID: S1-BE-01. Sprint sync: BE leads FE on auth by 2-3 days. UI framework and API architecture run fully in parallel._
EOF_BODY
issue '[S1-BE-02] API architecture setup (NestJS)' 'Sprint 1 - Foundation & Core Infrastructure (Weeks 1-2)' backend,pts-5 <<'EOF_BODY'
**Sprint 1: Foundation & Core Infrastructure (Weeks 1-2)** | Roadmap Phase 1 | **Estimate:** 5 pts
**Depends on:** none
**Note:** Week 1. Parallel with FE framework setup.

### Acceptance criteria
- [ ] NestJS project with module structure, config and env handling
- [ ] Global validation, error format and REST versioning convention
- [ ] OpenAPI/Swagger docs generated and reachable
- [ ] CI runs lint and Jest on every PR

_Ticket ID: S1-BE-02. Sprint sync: BE leads FE on auth by 2-3 days. UI framework and API architecture run fully in parallel._
EOF_BODY
issue '[S1-BE-03] Authentication and authorization (Supabase Auth)' 'Sprint 1 - Foundation & Core Infrastructure (Weeks 1-2)' backend,security,critical-path,pts-8 <<'EOF_BODY'
**Sprint 1: Foundation & Core Infrastructure (Weeks 1-2)** | Roadmap Phase 1 | **Estimate:** 8 pts
**Depends on:** S1-BE-01, S1-INT-01
**Note:** Week 2. Must be ready 2-3 days before FE auth integration starts.

### Acceptance criteria
- [ ] JWT validation guard and role decorator
- [ ] Sign-up, login, logout and refresh flows work against Supabase
- [ ] Auth endpoints and usage documented for FE
- [ ] Unit tests for guards

_Ticket ID: S1-BE-03. Sprint sync: BE leads FE on auth by 2-3 days. UI framework and API architecture run fully in parallel._
EOF_BODY
issue '[S1-BE-04] Security baseline' 'Sprint 1 - Foundation & Core Infrastructure (Weeks 1-2)' backend,security,pts-3 <<'EOF_BODY'
**Sprint 1: Foundation & Core Infrastructure (Weeks 1-2)** | Roadmap Phase 1 | **Estimate:** 3 pts
**Depends on:** S1-BE-02

### Acceptance criteria
- [ ] CORS allow-list, security headers and rate limiting
- [ ] Secrets only via environment variables
- [ ] Input validation on all DTOs

_Ticket ID: S1-BE-04. Sprint sync: BE leads FE on auth by 2-3 days. UI framework and API architecture run fully in parallel._
EOF_BODY
issue '[S1-FE-01] Core UI framework setup (React + TypeScript + Vite + Tailwind)' 'Sprint 1 - Foundation & Core Infrastructure (Weeks 1-2)' frontend,pts-3 <<'EOF_BODY'
**Sprint 1: Foundation & Core Infrastructure (Weeks 1-2)** | Roadmap Phase 1 | **Estimate:** 3 pts
**Depends on:** none
**Note:** Week 1.

### Acceptance criteria
- [ ] Project builds with lint and format checks
- [ ] Vercel preview deploy on every PR
- [ ] Jest and React Testing Library configured

_Ticket ID: S1-FE-01. Sprint sync: BE leads FE on auth by 2-3 days. UI framework and API architecture run fully in parallel._
EOF_BODY
issue '[S1-FE-02] Routing and navigation shell' 'Sprint 1 - Foundation & Core Infrastructure (Weeks 1-2)' frontend,pts-3 <<'EOF_BODY'
**Sprint 1: Foundation & Core Infrastructure (Weeks 1-2)** | Roadmap Phase 1 | **Estimate:** 3 pts
**Depends on:** S1-FE-01

### Acceptance criteria
- [ ] React Router with public and protected route groups
- [ ] Base layout with header, footer and navigation
- [ ] 404 and error pages

_Ticket ID: S1-FE-02. Sprint sync: BE leads FE on auth by 2-3 days. UI framework and API architecture run fully in parallel._
EOF_BODY
issue '[S1-FE-03] State management (React Context)' 'Sprint 1 - Foundation & Core Infrastructure (Weeks 1-2)' frontend,pts-3 <<'EOF_BODY'
**Sprint 1: Foundation & Core Infrastructure (Weeks 1-2)** | Roadmap Phase 1 | **Estimate:** 3 pts
**Depends on:** S1-FE-01
**Note:** Week 2.

### Acceptance criteria
- [ ] Auth, UI and app-config contexts
- [ ] Typed hooks for consuming contexts
- [ ] Conventions for adding new contexts documented

_Ticket ID: S1-FE-03. Sprint sync: BE leads FE on auth by 2-3 days. UI framework and API architecture run fully in parallel._
EOF_BODY
issue '[S1-FE-04] Design system foundation' 'Sprint 1 - Foundation & Core Infrastructure (Weeks 1-2)' frontend,pts-5 <<'EOF_BODY'
**Sprint 1: Foundation & Core Infrastructure (Weeks 1-2)** | Roadmap Phase 1 | **Estimate:** 5 pts
**Depends on:** S1-FE-01

### Acceptance criteria
- [ ] Design tokens (color, type, spacing) in Tailwind config
- [ ] Base components: button, input, card, modal, alert
- [ ] Focus states and color contrast meet WCAG AA

_Ticket ID: S1-FE-04. Sprint sync: BE leads FE on auth by 2-3 days. UI framework and API architecture run fully in parallel._
EOF_BODY
issue '[S1-FE-05] Frontend auth integration' 'Sprint 1 - Foundation & Core Infrastructure (Weeks 1-2)' frontend,security,pts-5 <<'EOF_BODY'
**Sprint 1: Foundation & Core Infrastructure (Weeks 1-2)** | Roadmap Phase 1 | **Estimate:** 5 pts
**Depends on:** S1-BE-03, S1-FE-02, S1-FE-03
**Note:** Week 2. Starts once BE auth is handed off.

### Acceptance criteria
- [ ] Login, logout and session handling wired to Supabase Auth
- [ ] Protected routes redirect unauthenticated users
- [ ] Token refresh works without user-visible errors

_Ticket ID: S1-FE-05. Sprint sync: BE leads FE on auth by 2-3 days. UI framework and API architecture run fully in parallel._
EOF_BODY
issue '[S1-INT-01] Supabase project and auth configuration (BE + FE)' 'Sprint 1 - Foundation & Core Infrastructure (Weeks 1-2)' integration,pts-2 <<'EOF_BODY'
**Sprint 1: Foundation & Core Infrastructure (Weeks 1-2)** | Roadmap Phase 1 | **Estimate:** 2 pts
**Depends on:** none
**Note:** Needs both teams.

### Acceptance criteria
- [ ] Dev and staging Supabase projects created
- [ ] Auth settings (redirect URLs, providers) agreed by both teams
- [ ] Env variable names documented

_Ticket ID: S1-INT-01. Sprint sync: BE leads FE on auth by 2-3 days. UI framework and API architecture run fully in parallel._
EOF_BODY
issue '[S1-INT-02] API contract workflow and FE mock server' 'Sprint 1 - Foundation & Core Infrastructure (Weeks 1-2)' integration,pts-3 <<'EOF_BODY'
**Sprint 1: Foundation & Core Infrastructure (Weeks 1-2)** | Roadmap Phase 1 | **Estimate:** 3 pts
**Depends on:** S1-BE-02
**Note:** Lets FE work ahead of BE from Sprint 2 onward.

### Acceptance criteria
- [ ] OpenAPI is the contract source of truth
- [ ] FE mock server (e.g. MSW) serves contract examples
- [ ] Breaking API changes require announcement in the team channel

_Ticket ID: S1-INT-02. Sprint sync: BE leads FE on auth by 2-3 days. UI framework and API architecture run fully in parallel._
EOF_BODY
# ---- Sprint 2 ----
issue '[S2-BE-01] Content management APIs' 'Sprint 2 - Public Website Features (Weeks 3-4)' backend,critical-path,pts-8 <<'EOF_BODY'
**Sprint 2: Public Website Features (Weeks 3-4)** | Roadmap Phase 2 | **Estimate:** 8 pts
**Depends on:** S1-BE-03
**Note:** Week 3.

### Acceptance criteria
- [ ] CRUD endpoints for pages, news/updates and services
- [ ] Role-protected write endpoints, public read endpoints
- [ ] OpenAPI docs and example responses published
- [ ] Unit and integration tests

_Ticket ID: S2-BE-01. Sprint sync: BE leads by ~1 week. FE builds against mock data first, then swaps to live APIs._
EOF_BODY
issue '[S2-BE-02] Public data APIs' 'Sprint 2 - Public Website Features (Weeks 3-4)' backend,pts-5 <<'EOF_BODY'
**Sprint 2: Public Website Features (Weeks 3-4)** | Roadmap Phase 2 | **Estimate:** 5 pts
**Depends on:** S2-BE-01
**Note:** Week 4.

### Acceptance criteria
- [ ] Read-only endpoints for public site data
- [ ] Pagination, filtering and caching headers
- [ ] Documented with example responses

_Ticket ID: S2-BE-02. Sprint sync: BE leads by ~1 week. FE builds against mock data first, then swaps to live APIs._
EOF_BODY
issue '[S2-BE-03] Search functionality backend (basic)' 'Sprint 2 - Public Website Features (Weeks 3-4)' backend,pts-5 <<'EOF_BODY'
**Sprint 2: Public Website Features (Weeks 3-4)** | Roadmap Phase 2 | **Estimate:** 5 pts
**Depends on:** S2-BE-01
**Note:** Advanced discovery comes in Sprint 5.

### Acceptance criteria
- [ ] Keyword search across pages, news and services
- [ ] Paginated, ranked results
- [ ] Endpoint documented in OpenAPI

_Ticket ID: S2-BE-03. Sprint sync: BE leads by ~1 week. FE builds against mock data first, then swaps to live APIs._
EOF_BODY
issue '[S2-INT-01] Content API contract and handoff' 'Sprint 2 - Public Website Features (Weeks 3-4)' integration,pts-2 <<'EOF_BODY'
**Sprint 2: Public Website Features (Weeks 3-4)** | Roadmap Phase 2 | **Estimate:** 2 pts
**Depends on:** S1-INT-02
**Note:** Do this at the start of Week 3.

### Acceptance criteria
- [ ] Contracts and example responses for content endpoints agreed
- [ ] FE mock server updated with the same examples
- [ ] Handoff noted in the sprint channel

_Ticket ID: S2-INT-01. Sprint sync: BE leads by ~1 week. FE builds against mock data first, then swaps to live APIs._
EOF_BODY
issue '[S2-FE-01] Homepage' 'Sprint 2 - Public Website Features (Weeks 3-4)' frontend,pts-5 <<'EOF_BODY'
**Sprint 2: Public Website Features (Weeks 3-4)** | Roadmap Phase 2 | **Estimate:** 5 pts
**Depends on:** S1-FE-04
**Note:** Week 3, mock data.

### Acceptance criteria
- [ ] Responsive homepage built from design-system components
- [ ] Content areas fed by mock data
- [ ] Lighthouse performance and accessibility checked

_Ticket ID: S2-FE-01. Sprint sync: BE leads by ~1 week. FE builds against mock data first, then swaps to live APIs._
EOF_BODY
issue '[S2-FE-02] About section pages' 'Sprint 2 - Public Website Features (Weeks 3-4)' frontend,pts-3 <<'EOF_BODY'
**Sprint 2: Public Website Features (Weeks 3-4)** | Roadmap Phase 2 | **Estimate:** 3 pts
**Depends on:** S1-FE-04

### Acceptance criteria
- [ ] About pages routed and responsive
- [ ] Content driven by API-shaped data
- [ ] Navigation updated

_Ticket ID: S2-FE-02. Sprint sync: BE leads by ~1 week. FE builds against mock data first, then swaps to live APIs._
EOF_BODY
issue '[S2-FE-03] Services section' 'Sprint 2 - Public Website Features (Weeks 3-4)' frontend,pts-5 <<'EOF_BODY'
**Sprint 2: Public Website Features (Weeks 3-4)** | Roadmap Phase 2 | **Estimate:** 5 pts
**Depends on:** S1-FE-04
**Note:** Week 4.

### Acceptance criteria
- [ ] Services list and detail pages
- [ ] Loading, empty and error states
- [ ] Responsive layout

_Ticket ID: S2-FE-03. Sprint sync: BE leads by ~1 week. FE builds against mock data first, then swaps to live APIs._
EOF_BODY
issue '[S2-FE-04] News and updates UI' 'Sprint 2 - Public Website Features (Weeks 3-4)' frontend,pts-5 <<'EOF_BODY'
**Sprint 2: Public Website Features (Weeks 3-4)** | Roadmap Phase 2 | **Estimate:** 5 pts
**Depends on:** S1-FE-04

### Acceptance criteria
- [ ] News list with pagination and detail page
- [ ] Loading, empty and error states
- [ ] Responsive layout

_Ticket ID: S2-FE-04. Sprint sync: BE leads by ~1 week. FE builds against mock data first, then swaps to live APIs._
EOF_BODY
issue '[S2-FE-05] Connect public pages to live APIs' 'Sprint 2 - Public Website Features (Weeks 3-4)' frontend,pts-3 <<'EOF_BODY'
**Sprint 2: Public Website Features (Weeks 3-4)** | Roadmap Phase 2 | **Estimate:** 3 pts
**Depends on:** S2-BE-01, S2-BE-02, S2-FE-01, S2-FE-03, S2-FE-04
**Note:** Week 4.

### Acceptance criteria
- [ ] Mocks replaced with live API calls
- [ ] API errors handled gracefully
- [ ] Basic search UI calls the search endpoint

_Ticket ID: S2-FE-05. Sprint sync: BE leads by ~1 week. FE builds against mock data first, then swaps to live APIs._
EOF_BODY
# ---- Sprint 3 ----
issue '[S3-BE-01] Form submission system (5 e-service forms)' 'Sprint 3 - E-Services & Forms (Weeks 5-6)' backend,critical-path,pts-8 <<'EOF_BODY'
**Sprint 3: E-Services & Forms (Weeks 5-6)** | Roadmap Phase 3 | **Estimate:** 8 pts
**Depends on:** S1-BE-03
**Note:** Week 5.

### Acceptance criteria
- [ ] Endpoints and DTO validation for all 5 form types
- [ ] Submissions stored with status tracking
- [ ] Ownership rules: users see only their own submissions
- [ ] Documented with example payloads

_Ticket ID: S3-BE-01. Sprint sync: Payment is the critical path: BE must lead by 3-4 days. Form UI validation is independent of BE._
EOF_BODY
issue '[S3-BE-02] Payment integration' 'Sprint 3 - E-Services & Forms (Weeks 5-6)' backend,security,critical-path,pts-8 <<'EOF_BODY'
**Sprint 3: E-Services & Forms (Weeks 5-6)** | Roadmap Phase 3 | **Estimate:** 8 pts
**Depends on:** S3-BE-01
**Note:** Week 6. BE must lead FE by 3-4 days.

### Acceptance criteria
- [ ] Payment provider integrated (Stripe per the cost notes)
- [ ] Webhook handling with signature verification
- [ ] Payment status tracked and linked to submissions
- [ ] Test-mode credentials and flow documented

_Ticket ID: S3-BE-02. Sprint sync: Payment is the critical path: BE must lead by 3-4 days. Form UI validation is independent of BE._
EOF_BODY
issue '[S3-BE-03] Notification system' 'Sprint 3 - E-Services & Forms (Weeks 5-6)' backend,pts-5 <<'EOF_BODY'
**Sprint 3: E-Services & Forms (Weeks 5-6)** | Roadmap Phase 3 | **Estimate:** 5 pts
**Depends on:** S3-BE-01

### Acceptance criteria
- [ ] Email notifications on submission and status changes
- [ ] Templates are configurable
- [ ] Failures logged and retried

_Ticket ID: S3-BE-03. Sprint sync: Payment is the critical path: BE must lead by 3-4 days. Form UI validation is independent of BE._
EOF_BODY
issue '[S3-INT-01] Payment flow handoff and test credentials' 'Sprint 3 - E-Services & Forms (Weeks 5-6)' integration,critical-path,pts-2 <<'EOF_BODY'
**Sprint 3: E-Services & Forms (Weeks 5-6)** | Roadmap Phase 3 | **Estimate:** 2 pts
**Depends on:** S3-BE-02
**Note:** Hand off before FE payment UI starts.

### Acceptance criteria
- [ ] Payment flow documentation delivered to FE
- [ ] Test credentials and test-card scenarios shared
- [ ] Success, failure and cancel paths agreed

_Ticket ID: S3-INT-01. Sprint sync: Payment is the critical path: BE must lead by 3-4 days. Form UI validation is independent of BE._
EOF_BODY
issue '[S3-FE-01] Reusable form framework (wizards and validation)' 'Sprint 3 - E-Services & Forms (Weeks 5-6)' frontend,pts-5 <<'EOF_BODY'
**Sprint 3: E-Services & Forms (Weeks 5-6)** | Roadmap Phase 3 | **Estimate:** 5 pts
**Depends on:** S1-FE-04
**Note:** Week 5. Independent of BE.

### Acceptance criteria
- [ ] Multi-step wizard component with progress state
- [ ] Schema-based client-side validation with clear error messages
- [ ] Accessible form controls and keyboard flow

_Ticket ID: S3-FE-01. Sprint sync: Payment is the critical path: BE must lead by 3-4 days. Form UI validation is independent of BE._
EOF_BODY
issue '[S3-FE-02] E-service forms UI (5 forms)' 'Sprint 3 - E-Services & Forms (Weeks 5-6)' frontend,pts-8 <<'EOF_BODY'
**Sprint 3: E-Services & Forms (Weeks 5-6)** | Roadmap Phase 3 | **Estimate:** 8 pts
**Depends on:** S3-FE-01, S3-BE-01
**Note:** Week 5.

### Acceptance criteria
- [ ] All 5 forms built on the form framework
- [ ] Submit to live endpoints with success and error handling
- [ ] User can view submission status
- [ ] Split into one sub-issue per form if needed

_Ticket ID: S3-FE-02. Sprint sync: Payment is the critical path: BE must lead by 3-4 days. Form UI validation is independent of BE._
EOF_BODY
issue '[S3-FE-03] Payment UI integration' 'Sprint 3 - E-Services & Forms (Weeks 5-6)' frontend,critical-path,pts-5 <<'EOF_BODY'
**Sprint 3: E-Services & Forms (Weeks 5-6)** | Roadmap Phase 3 | **Estimate:** 5 pts
**Depends on:** S3-BE-02, S3-INT-01
**Note:** Week 6.

### Acceptance criteria
- [ ] Payment step in the forms flow
- [ ] Success, failure and cancel handling
- [ ] No card data stored in the app

_Ticket ID: S3-FE-03. Sprint sync: Payment is the critical path: BE must lead by 3-4 days. Form UI validation is independent of BE._
EOF_BODY
# ---- Sprint 4 ----
issue '[S4-BE-01] RBAC and secured admin APIs' 'Sprint 4 - Admin Dashboard (Weeks 7-8)' backend,security,critical-path,pts-8 <<'EOF_BODY'
**Sprint 4: Admin Dashboard (Weeks 7-8)** | Roadmap Phase 4 | **Estimate:** 8 pts
**Depends on:** S1-BE-03
**Note:** Week 7.

### Acceptance criteria
- [ ] Role and permission model implemented and enforced by guards
- [ ] Admin endpoints reject non-admin access (tested)
- [ ] Role definitions and permission matrix documented

_Ticket ID: S4-BE-01. Sprint sync: Admin APIs must be secured (RBAC) before FE wires up real data. FE mocks the layout in Week 7._
EOF_BODY
issue '[S4-BE-02] Reporting system' 'Sprint 4 - Admin Dashboard (Weeks 7-8)' backend,pts-5 <<'EOF_BODY'
**Sprint 4: Admin Dashboard (Weeks 7-8)** | Roadmap Phase 4 | **Estimate:** 5 pts
**Depends on:** S4-BE-01
**Note:** Week 8.

### Acceptance criteria
- [ ] Report endpoints for submissions, payments and user activity
- [ ] Date-range filters and export-ready data
- [ ] Performance verified on realistic data volume

_Ticket ID: S4-BE-02. Sprint sync: Admin APIs must be secured (RBAC) before FE wires up real data. FE mocks the layout in Week 7._
EOF_BODY
issue '[S4-BE-03] User management endpoints' 'Sprint 4 - Admin Dashboard (Weeks 7-8)' backend,pts-5 <<'EOF_BODY'
**Sprint 4: Admin Dashboard (Weeks 7-8)** | Roadmap Phase 4 | **Estimate:** 5 pts
**Depends on:** S4-BE-01

### Acceptance criteria
- [ ] List, view, update, deactivate users and assign roles
- [ ] Audit trail for role changes
- [ ] Documented in OpenAPI

_Ticket ID: S4-BE-03. Sprint sync: Admin APIs must be secured (RBAC) before FE wires up real data. FE mocks the layout in Week 7._
EOF_BODY
issue '[S4-INT-01] Role definitions and permission matrix handoff' 'Sprint 4 - Admin Dashboard (Weeks 7-8)' integration,security,pts-2 <<'EOF_BODY'
**Sprint 4: Admin Dashboard (Weeks 7-8)** | Roadmap Phase 4 | **Estimate:** 2 pts
**Depends on:** S4-BE-01
**Note:** Critical RBAC coordination.

### Acceptance criteria
- [ ] Permission matrix shared with FE
- [ ] FE and BE agree how permissions are exposed to the client

_Ticket ID: S4-INT-01. Sprint sync: Admin APIs must be secured (RBAC) before FE wires up real data. FE mocks the layout in Week 7._
EOF_BODY
issue '[S4-FE-01] Admin dashboard layout and shell' 'Sprint 4 - Admin Dashboard (Weeks 7-8)' frontend,pts-5 <<'EOF_BODY'
**Sprint 4: Admin Dashboard (Weeks 7-8)** | Roadmap Phase 4 | **Estimate:** 5 pts
**Depends on:** S1-FE-04
**Note:** Week 7, parallel with BE.

### Acceptance criteria
- [ ] Admin layout with navigation and overview widgets
- [ ] Built on mock data
- [ ] Responsive

_Ticket ID: S4-FE-01. Sprint sync: Admin APIs must be secured (RBAC) before FE wires up real data. FE mocks the layout in Week 7._
EOF_BODY
issue '[S4-FE-02] User management interface' 'Sprint 4 - Admin Dashboard (Weeks 7-8)' frontend,pts-5 <<'EOF_BODY'
**Sprint 4: Admin Dashboard (Weeks 7-8)** | Roadmap Phase 4 | **Estimate:** 5 pts
**Depends on:** S4-BE-03, S4-INT-01

### Acceptance criteria
- [ ] User list with search and filters
- [ ] Role assignment and deactivation flows
- [ ] Confirmations for destructive actions

_Ticket ID: S4-FE-02. Sprint sync: Admin APIs must be secured (RBAC) before FE wires up real data. FE mocks the layout in Week 7._
EOF_BODY
issue '[S4-FE-03] Content management UI' 'Sprint 4 - Admin Dashboard (Weeks 7-8)' frontend,pts-5 <<'EOF_BODY'
**Sprint 4: Admin Dashboard (Weeks 7-8)** | Roadmap Phase 4 | **Estimate:** 5 pts
**Depends on:** S2-BE-01, S4-FE-01

### Acceptance criteria
- [ ] Create, edit, publish and delete pages, news and services
- [ ] Form validation and error handling
- [ ] Unsaved-change warning

_Ticket ID: S4-FE-03. Sprint sync: Admin APIs must be secured (RBAC) before FE wires up real data. FE mocks the layout in Week 7._
EOF_BODY
issue '[S4-FE-04] Permission-aware admin UI and reports views' 'Sprint 4 - Admin Dashboard (Weeks 7-8)' frontend,security,pts-5 <<'EOF_BODY'
**Sprint 4: Admin Dashboard (Weeks 7-8)** | Roadmap Phase 4 | **Estimate:** 5 pts
**Depends on:** S4-BE-01, S4-BE-02
**Note:** Week 8.

### Acceptance criteria
- [ ] Routes and controls hidden or disabled by role
- [ ] Report views with filters
- [ ] Server-side authorization remains the source of truth

_Ticket ID: S4-FE-04. Sprint sync: Admin APIs must be secured (RBAC) before FE wires up real data. FE mocks the layout in Week 7._
EOF_BODY
# ---- Sprint 5 ----
issue '[S5-BE-01] Search and discovery system' 'Sprint 5 - Advanced Features (Weeks 9-10)' backend,pts-8 <<'EOF_BODY'
**Sprint 5: Advanced Features (Weeks 9-10)** | Roadmap Phase 5 | **Estimate:** 8 pts
**Depends on:** S2-BE-03
**Note:** Week 9. Tight API contract coordination.

### Acceptance criteria
- [ ] Advanced search: filters, facets, relevance tuning
- [ ] Search performance within the API target
- [ ] Contract shared with FE early

_Ticket ID: S5-BE-01. Sprint sync: AI endpoints must lead the chatbot UI by ~1 week. Maps use external APIs independently._
EOF_BODY
issue '[S5-BE-02] AI integration endpoints' 'Sprint 5 - Advanced Features (Weeks 9-10)' backend,security,critical-path,pts-8 <<'EOF_BODY'
**Sprint 5: Advanced Features (Weeks 9-10)** | Roadmap Phase 5 | **Estimate:** 8 pts
**Depends on:** S1-BE-03
**Note:** Week 10. Must lead the chatbot UI by ~1 week.

### Acceptance criteria
- [ ] Chat endpoint with authentication and rate limiting
- [ ] Provider errors and timeouts handled cleanly
- [ ] Prompt and response handling documented
- [ ] Endpoint contract and test examples shared with FE

_Ticket ID: S5-BE-02. Sprint sync: AI endpoints must lead the chatbot UI by ~1 week. Maps use external APIs independently._
EOF_BODY
issue '[S5-BE-03] Advanced analytics' 'Sprint 5 - Advanced Features (Weeks 9-10)' backend,pts-5 <<'EOF_BODY'
**Sprint 5: Advanced Features (Weeks 9-10)** | Roadmap Phase 5 | **Estimate:** 5 pts
**Depends on:** S4-BE-02

### Acceptance criteria
- [ ] Aggregated analytics endpoints
- [ ] Access restricted to admin roles
- [ ] Documented in OpenAPI

_Ticket ID: S5-BE-03. Sprint sync: AI endpoints must lead the chatbot UI by ~1 week. Maps use external APIs independently._
EOF_BODY
issue '[S5-INT-01] Search API contract review' 'Sprint 5 - Advanced Features (Weeks 9-10)' integration,pts-2 <<'EOF_BODY'
**Sprint 5: Advanced Features (Weeks 9-10)** | Roadmap Phase 5 | **Estimate:** 2 pts
**Depends on:** S5-BE-01
**Note:** Start of Week 9.

### Acceptance criteria
- [ ] Query, filter and result shape agreed
- [ ] Mock server updated

_Ticket ID: S5-INT-01. Sprint sync: AI endpoints must lead the chatbot UI by ~1 week. Maps use external APIs independently._
EOF_BODY
issue '[S5-FE-01] Advanced UI features' 'Sprint 5 - Advanced Features (Weeks 9-10)' frontend,pts-5 <<'EOF_BODY'
**Sprint 5: Advanced Features (Weeks 9-10)** | Roadmap Phase 5 | **Estimate:** 5 pts
**Depends on:** S1-FE-04
**Note:** Week 9.

### Acceptance criteria
- [ ] Agreed advanced UI interactions implemented
- [ ] Accessible and responsive
- [ ] Performance budget respected

_Ticket ID: S5-FE-01. Sprint sync: AI endpoints must lead the chatbot UI by ~1 week. Maps use external APIs independently._
EOF_BODY
issue '[S5-FE-02] Search and discovery UI' 'Sprint 5 - Advanced Features (Weeks 9-10)' frontend,pts-3 <<'EOF_BODY'
**Sprint 5: Advanced Features (Weeks 9-10)** | Roadmap Phase 5 | **Estimate:** 3 pts
**Depends on:** S5-BE-01, S5-INT-01

### Acceptance criteria
- [ ] Search page with filters and pagination
- [ ] Empty, loading and error states

_Ticket ID: S5-FE-02. Sprint sync: AI endpoints must lead the chatbot UI by ~1 week. Maps use external APIs independently._
EOF_BODY
issue '[S5-FE-03] Interactive maps and visualizations' 'Sprint 5 - Advanced Features (Weeks 9-10)' frontend,pts-5 <<'EOF_BODY'
**Sprint 5: Advanced Features (Weeks 9-10)** | Roadmap Phase 5 | **Estimate:** 5 pts
**Depends on:** S1-FE-04
**Note:** Independent of BE.

### Acceptance criteria
- [ ] Map integrated using external APIs
- [ ] Data visualizations for public data
- [ ] Fallback when the external service fails

_Ticket ID: S5-FE-03. Sprint sync: AI endpoints must lead the chatbot UI by ~1 week. Maps use external APIs independently._
EOF_BODY
issue '[S5-FE-04] Chatbot interface' 'Sprint 5 - Advanced Features (Weeks 9-10)' frontend,critical-path,pts-5 <<'EOF_BODY'
**Sprint 5: Advanced Features (Weeks 9-10)** | Roadmap Phase 5 | **Estimate:** 5 pts
**Depends on:** S5-BE-02
**Note:** Week 10.

### Acceptance criteria
- [ ] Chat UI with message history and typing/loading state
- [ ] Error and rate-limit handling
- [ ] Accessible keyboard and screen reader behavior

_Ticket ID: S5-FE-04. Sprint sync: AI endpoints must lead the chatbot UI by ~1 week. Maps use external APIs independently._
EOF_BODY
# ---- Sprint 6 ----
issue '[S6-BE-01] Unit tests for services' 'Sprint 6 - Testing & QA (Weeks 11-12)' backend,testing,pts-5 <<'EOF_BODY'
**Sprint 6: Testing & QA (Weeks 11-12)** | Roadmap Phase 6 | **Estimate:** 5 pts
**Depends on:** none
**Note:** Week 11.

### Acceptance criteria
- [ ] Unit tests cover service layer
- [ ] Coverage at or above 90%
- [ ] Tests run in CI

_Ticket ID: S6-BE-01. Sprint sync: Mostly parallel. E2E needs both BE and FE functional. Use mock servers where BE is not ready._
EOF_BODY
issue '[S6-BE-02] Integration tests for APIs' 'Sprint 6 - Testing & QA (Weeks 11-12)' backend,testing,pts-5 <<'EOF_BODY'
**Sprint 6: Testing & QA (Weeks 11-12)** | Roadmap Phase 6 | **Estimate:** 5 pts
**Depends on:** none
**Note:** Week 11.

### Acceptance criteria
- [ ] Integration tests for all public and admin endpoints
- [ ] Auth and role cases covered
- [ ] Tests run in CI

_Ticket ID: S6-BE-02. Sprint sync: Mostly parallel. E2E needs both BE and FE functional. Use mock servers where BE is not ready._
EOF_BODY
issue '[S6-BE-03] Security testing' 'Sprint 6 - Testing & QA (Weeks 11-12)' backend,testing,security,pts-5 <<'EOF_BODY'
**Sprint 6: Testing & QA (Weeks 11-12)** | Roadmap Phase 6 | **Estimate:** 5 pts
**Depends on:** none
**Note:** Week 12.

### Acceptance criteria
- [ ] Auth, RBAC, input-validation and payment webhook checks
- [ ] No critical vulnerabilities open
- [ ] Findings tracked as issues

_Ticket ID: S6-BE-03. Sprint sync: Mostly parallel. E2E needs both BE and FE functional. Use mock servers where BE is not ready._
EOF_BODY
issue '[S6-BE-04] Performance and load testing' 'Sprint 6 - Testing & QA (Weeks 11-12)' backend,testing,pts-5 <<'EOF_BODY'
**Sprint 6: Testing & QA (Weeks 11-12)** | Roadmap Phase 6 | **Estimate:** 5 pts
**Depends on:** none
**Note:** Week 12.

### Acceptance criteria
- [ ] Load test plan and results
- [ ] API response time under 200ms on key endpoints
- [ ] Bottlenecks logged and fixed or ticketed

_Ticket ID: S6-BE-04. Sprint sync: Mostly parallel. E2E needs both BE and FE functional. Use mock servers where BE is not ready._
EOF_BODY
issue '[S6-FE-01] Component and hook unit tests' 'Sprint 6 - Testing & QA (Weeks 11-12)' frontend,testing,pts-5 <<'EOF_BODY'
**Sprint 6: Testing & QA (Weeks 11-12)** | Roadmap Phase 6 | **Estimate:** 5 pts
**Depends on:** none
**Note:** Week 11.

### Acceptance criteria
- [ ] Component and hook tests with React Testing Library
- [ ] Coverage at or above 85%
- [ ] Tests run in CI

_Ticket ID: S6-FE-01. Sprint sync: Mostly parallel. E2E needs both BE and FE functional. Use mock servers where BE is not ready._
EOF_BODY
issue '[S6-FE-02] Frontend integration tests' 'Sprint 6 - Testing & QA (Weeks 11-12)' frontend,testing,pts-3 <<'EOF_BODY'
**Sprint 6: Testing & QA (Weeks 11-12)** | Roadmap Phase 6 | **Estimate:** 3 pts
**Depends on:** S1-INT-02
**Note:** Week 11. Mock server used where BE is not ready.

### Acceptance criteria
- [ ] Page-level tests against mock server
- [ ] Auth and form flows covered

_Ticket ID: S6-FE-02. Sprint sync: Mostly parallel. E2E needs both BE and FE functional. Use mock servers where BE is not ready._
EOF_BODY
issue '[S6-FE-03] End-to-end tests' 'Sprint 6 - Testing & QA (Weeks 11-12)' frontend,testing,pts-5 <<'EOF_BODY'
**Sprint 6: Testing & QA (Weeks 11-12)** | Roadmap Phase 6 | **Estimate:** 5 pts
**Depends on:** S6-INT-01
**Note:** Week 12.

### Acceptance criteria
- [ ] E2E suite covers core user flows
- [ ] Runs in CI against staging

_Ticket ID: S6-FE-03. Sprint sync: Mostly parallel. E2E needs both BE and FE functional. Use mock servers where BE is not ready._
EOF_BODY
issue '[S6-FE-04] Accessibility testing' 'Sprint 6 - Testing & QA (Weeks 11-12)' frontend,testing,pts-5 <<'EOF_BODY'
**Sprint 6: Testing & QA (Weeks 11-12)** | Roadmap Phase 6 | **Estimate:** 5 pts
**Depends on:** none
**Note:** Week 12.

### Acceptance criteria
- [ ] Automated and manual WCAG AA checks
- [ ] Critical and serious issues fixed

_Ticket ID: S6-FE-04. Sprint sync: Mostly parallel. E2E needs both BE and FE functional. Use mock servers where BE is not ready._
EOF_BODY
issue '[S6-FE-05] Cross-browser and mobile responsiveness testing' 'Sprint 6 - Testing & QA (Weeks 11-12)' frontend,testing,pts-3 <<'EOF_BODY'
**Sprint 6: Testing & QA (Weeks 11-12)** | Roadmap Phase 6 | **Estimate:** 3 pts
**Depends on:** none
**Note:** Week 12.

### Acceptance criteria
- [ ] Verified on current major browsers and common device sizes
- [ ] Issues fixed or ticketed

_Ticket ID: S6-FE-05. Sprint sync: Mostly parallel. E2E needs both BE and FE functional. Use mock servers where BE is not ready._
EOF_BODY
issue '[S6-INT-01] Full-stack integration and E2E user flows' 'Sprint 6 - Testing & QA (Weeks 11-12)' integration,testing,critical-path,pts-5 <<'EOF_BODY'
**Sprint 6: Testing & QA (Weeks 11-12)** | Roadmap Phase 6 | **Estimate:** 5 pts
**Depends on:** S6-BE-02
**Note:** Week 12. Needs BE and FE functional.

### Acceptance criteria
- [ ] Complete flows tested: auth, forms, payment, admin
- [ ] Full-stack performance checked
- [ ] Blocking defects fixed before Sprint 7

_Ticket ID: S6-INT-01. Sprint sync: Mostly parallel. E2E needs both BE and FE functional. Use mock servers where BE is not ready._
EOF_BODY
# ---- Sprint 7 ----
issue '[S7-BE-01] Production environment setup' 'Sprint 7 - Deployment & Launch (Weeks 13-14)' backend,devops,pts-5 <<'EOF_BODY'
**Sprint 7: Deployment & Launch (Weeks 13-14)** | Roadmap Phase 7 | **Estimate:** 5 pts
**Depends on:** S6-INT-01
**Note:** Week 13.

### Acceptance criteria
- [ ] Production Supabase and serverless/Vercel backend configured
- [ ] Environment configuration and secrets set
- [ ] Health check endpoint verified

_Ticket ID: S7-BE-01. Sprint sync: Sequential at the end: DB migration, then BE deploy, then FE deploy, then smoke tests._
EOF_BODY
issue '[S7-BE-02] Production database migration' 'Sprint 7 - Deployment & Launch (Weeks 13-14)' backend,database,critical-path,pts-5 <<'EOF_BODY'
**Sprint 7: Deployment & Launch (Weeks 13-14)** | Roadmap Phase 7 | **Estimate:** 5 pts
**Depends on:** S7-BE-01
**Note:** Must finish before full deployment.

### Acceptance criteria
- [ ] Migrations applied to production
- [ ] Rollback plan written and rehearsed on staging
- [ ] Data verified after migration

_Ticket ID: S7-BE-02. Sprint sync: Sequential at the end: DB migration, then BE deploy, then FE deploy, then smoke tests._
EOF_BODY
issue '[S7-BE-03] Monitoring setup' 'Sprint 7 - Deployment & Launch (Weeks 13-14)' backend,devops,pts-3 <<'EOF_BODY'
**Sprint 7: Deployment & Launch (Weeks 13-14)** | Roadmap Phase 7 | **Estimate:** 3 pts
**Depends on:** S7-BE-01

### Acceptance criteria
- [ ] Uptime, error and latency monitoring
- [ ] Alerts routed to the team

_Ticket ID: S7-BE-03. Sprint sync: Sequential at the end: DB migration, then BE deploy, then FE deploy, then smoke tests._
EOF_BODY
issue '[S7-BE-04] Backup system' 'Sprint 7 - Deployment & Launch (Weeks 13-14)' backend,devops,pts-3 <<'EOF_BODY'
**Sprint 7: Deployment & Launch (Weeks 13-14)** | Roadmap Phase 7 | **Estimate:** 3 pts
**Depends on:** S7-BE-02

### Acceptance criteria
- [ ] Automated database backups
- [ ] Restore tested

_Ticket ID: S7-BE-04. Sprint sync: Sequential at the end: DB migration, then BE deploy, then FE deploy, then smoke tests._
EOF_BODY
issue '[S7-FE-01] Production build and asset optimization' 'Sprint 7 - Deployment & Launch (Weeks 13-14)' frontend,devops,pts-3 <<'EOF_BODY'
**Sprint 7: Deployment & Launch (Weeks 13-14)** | Roadmap Phase 7 | **Estimate:** 3 pts
**Depends on:** none
**Note:** Week 13, parallel with BE setup.

### Acceptance criteria
- [ ] Optimized production build
- [ ] Page load under 2s on the target profile
- [ ] Bundle size checked

_Ticket ID: S7-FE-01. Sprint sync: Sequential at the end: DB migration, then BE deploy, then FE deploy, then smoke tests._
EOF_BODY
issue '[S7-FE-02] CDN configuration' 'Sprint 7 - Deployment & Launch (Weeks 13-14)' frontend,devops,pts-2 <<'EOF_BODY'
**Sprint 7: Deployment & Launch (Weeks 13-14)** | Roadmap Phase 7 | **Estimate:** 2 pts
**Depends on:** S7-FE-01

### Acceptance criteria
- [ ] CDN and caching rules configured on Vercel
- [ ] Cache headers verified

_Ticket ID: S7-FE-02. Sprint sync: Sequential at the end: DB migration, then BE deploy, then FE deploy, then smoke tests._
EOF_BODY
issue '[S7-FE-03] Domain configuration' 'Sprint 7 - Deployment & Launch (Weeks 13-14)' frontend,devops,pts-2 <<'EOF_BODY'
**Sprint 7: Deployment & Launch (Weeks 13-14)** | Roadmap Phase 7 | **Estimate:** 2 pts
**Depends on:** none

### Acceptance criteria
- [ ] Domain and HTTPS configured
- [ ] Redirects checked

_Ticket ID: S7-FE-03. Sprint sync: Sequential at the end: DB migration, then BE deploy, then FE deploy, then smoke tests._
EOF_BODY
issue '[S7-INT-01] Coordinated deployment, smoke tests and launch verification' 'Sprint 7 - Deployment & Launch (Weeks 13-14)' integration,devops,critical-path,pts-5 <<'EOF_BODY'
**Sprint 7: Deployment & Launch (Weeks 13-14)** | Roadmap Phase 7 | **Estimate:** 5 pts
**Depends on:** S7-BE-02, S7-FE-02, S7-FE-03
**Note:** Week 14.

### Acceptance criteria
- [ ] BE deployed first, then FE
- [ ] FE points to production API and endpoints verified
- [ ] Smoke tests pass
- [ ] Error tracking and performance monitoring confirmed
- [ ] Go/no-go recorded

_Ticket ID: S7-INT-01. Sprint sync: Sequential at the end: DB migration, then BE deploy, then FE deploy, then smoke tests._
EOF_BODY
echo "Done."