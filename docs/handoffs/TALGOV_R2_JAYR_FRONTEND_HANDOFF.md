
# TALGOV R2 — FRONTEND DEVELOPMENT HANDOFF

**Assigned Developer:** Jayr  
**Role:** Frontend Developer  
**Project:** Talibon Official Website — R2  
**Repository:** azinamouto/Talibon-Official-Website-BetaTest-V1.5  
**Base Branch:** `main`  
**AI Coding Agent:** OpenAI Codex  
**Development Environment:** Windows PowerShell  

---

## 1. MY RESPONSIBILITIES

I am responsible for frontend development, UI improvements, responsive layouts, accessibility, and browser-test regressions.

AJ handles backend development, Neon PostgreSQL, authentication, security, storage, and API implementation.

### My scope

- React, TypeScript, Vite, and CSS
- Frontend component corrections
- Responsive UI and accessibility
- Frontend API integration
- Frontend unit and browser tests
- UI regression fixes

### Strict boundaries

1. I must only modify files inside `frontend/`.
2. I must not modify `backend/`, database migrations, or security configurations.
3. I must preserve the existing TalGov R2 architecture.
4. I must never invent or replace official LGU information with fabricated data.
5. I must not reactivate disabled e-services, applications, payments, or tracking.
6. I must not bypass authentication or weaken security.
7. I must never push directly to `main`.
8. All frontend changes require testing and a pull request.
9. If an issue originates from the backend, I must document it and report it to AJ.
10. I must not deploy the application without authorization.

---

## 2. GET THE LATEST CODE FROM MAIN

Before starting development, I must open PowerShell inside my TalGov repository.

### Step 1 — Verify Git status

```powershell
git status --short
git remote -v
```

I must confirm that my `origin` remote points to the correct TalGov repository.

If I have uncommitted changes, I must preserve them before switching branches.

### Step 2 — Update main

```powershell
git fetch origin

git switch main

git pull --ff-only origin main
```

If `git switch main` fails because I have uncommitted changes, I must stop and resolve them safely.

### Step 3 — Verify the handoff document

```powershell
Test-Path "docs/handoffs/TALGOV_R2_JAYR_FRONTEND_HANDOFF.md"
```

Expected result:

```text
True
```

I can open it using:

```powershell
code docs/handoffs/TALGOV_R2_JAYR_FRONTEND_HANDOFF.md
```

I must verify that the latest integration changes are present before continuing.

---

## 3. CREATE MY FRONTEND DEVELOPMENT BRANCH

I must never work directly on `main`.

After updating `main`, I create my frontend branch:

```powershell
git switch -c fix/talgov-r2-frontend-regressions
```

Verify:

```powershell
git branch --show-current
git status --short
```

Expected branch:

```text
fix/talgov-r2-frontend-regressions
```

If the branch already exists, I must inspect it before switching rather than overwriting existing work.

---

## 4. INSTALL FRONTEND DEPENDENCIES

From the repository root:

```powershell
cd frontend

npm ci

npx playwright --version

npx playwright test --list
```

I must not modify dependency versions unless a verified compatibility issue requires it.

The previously recorded Playwright baseline was:

- 126 browser tests
- 113 passed
- 13 failed

These results are historical and must be verified against the latest `main`.

---

## 5. EXISTING FRONTEND ISSUES

The previous integration test run recorded 13 failures across four test files.

| Test File | Failures | Initial Observation |
|---|---:|---|
| `downloads-layout.spec.ts` | 4 | Expected DOWNLOADABLES heading not found |
| `emergency-theme.spec.ts` | 4 | Siren element exists but has empty text |
| `five-section-refinements.spec.ts` | 4 | Emergency background color differs from test expectation |
| `office-slideshow.spec.ts` | 1 | Slideshow autoplay assertion failure |

### Important observations

**Downloads**

The test expects an exact heading named `DOWNLOADABLES`.

I must determine whether the heading was unintentionally removed or intentionally changed during UI development.

**Emergency theme**

The `Siren` element exists, but its text content is empty.

I must determine whether an approved SVG/icon redesign replaced the emoji. I must not revert an intentional design change just to pass a test.

**Five-section refinements**

The browser recorded:

```text
Expected: rgb(185, 28, 28)
Received: rgb(114, 11, 11)
```

I must identify the approved design before changing the CSS or test expectations.

**Office slideshow**

The autoplay assertion failed.

I must inspect the implementation, timers, focus behavior, and Playwright fake-clock setup.

### API warnings

The earlier browser run also produced Vite proxy `ECONNREFUSED` messages.

The default Playwright configuration starts Vite but does not automatically start the NestJS backend.

I must distinguish backend/environment availability from actual frontend regressions.

I must not fake official government responses to make tests pass.

---

## 6. STRICT CODEX DEVELOPMENT PROMPT

I will open Codex in my editor or terminal and provide the following prompt.

### COPY THIS INTO CODEX

```text
ROLE: Senior React/TypeScript Frontend Engineer.

PROJECT: TalGov R2 — Talibon Official Website.
BRANCH: fix/talgov-r2-frontend-regressions
TOKEN BUDGET TARGET: 8,000 tokens.

OBJECTIVE:
Diagnose and resolve existing frontend browser regressions
without altering backend code or approved LGU information.

STRICT RULES:
1. Modify frontend/** only.
2. Never edit backend/**, database/**, or ops/**.
3. Preserve approved UI and responsive design.
4. Never invent LGU content, official data, or API responses.
5. Never reactivate disabled e-services or payments.
6. Never weaken authentication or security.
7. Never remove, skip, or weaken tests to force success.
8. Avoid unrelated refactors and dependency changes.
9. Do not commit, push, merge, rebase, or deploy.
10. Stop and report backend-owned contract problems to AJ.

BASELINE:
126 Playwright tests: 113 passed, 13 failed.

FAILURES:
- downloads-layout.spec.ts: 4
- emergency-theme.spec.ts: 4
- five-section-refinements.spec.ts: 4
- office-slideshow.spec.ts: 1

KNOWN OBSERVATIONS:
- DOWNLOADABLES heading not found.
- Siren element has empty text.
- Emergency color expected rgb(185,28,28),
  actual rgb(114,11,11).
- Office slideshow autoplay assertion failed.
- Vite proxy ECONNREFUSED appeared during testing.

TASKS:
1. Inspect Git status and relevant frontend files.
2. Read the four failing Playwright specs.
3. Inspect associated React components and CSS.
4. Determine actual root causes.
5. Distinguish obsolete assertions from real regressions.
6. Apply minimal frontend-only implementation fixes.
7. Add or adjust tests only with evidence.
8. Run targeted Playwright tests.
9. Run frontend lint, build, and unit tests.
10. Run the full browser suite after targeted tests pass.

TOKEN CONTROL:
- Read only relevant files.
- Avoid repository-wide dumps.
- Reuse existing reports.
- No unnecessary refactors.
- No repeated full-suite runs without reason.
- Final report limited to 500 tokens.

FINAL REPORT:
- Root causes
- Files modified
- Tests passed/failed
- Remaining issues
- Backend handoff items
- Recommended PR summary

Do not claim the frontend is fully verified unless all
required checks actually pass.
```

---

## 7. REVIEW CODEX CHANGES

After Codex finishes, I must inspect the modifications.

From the repository root:

```powershell
git status --short

git diff --stat

git diff --check
```

I must verify that only `frontend/` files changed.

I must review every unexpected file modification.

I must not blindly accept Codex changes involving authentication behavior, official data, or API contracts.

---

## 8. RUN FRONTEND VERIFICATION

From the `frontend` directory:

```powershell
cd frontend
```

### Step 1 — Lint

```powershell
npm run lint
```

### Step 2 — Build

```powershell
npm run build
```

### Step 3 — Unit tests

Inspect available test scripts:

```powershell
npm run
```

Run the repository's configured frontend unit-test command.

### Step 4 — Target the four affected Playwright files

```powershell
npx playwright test `
  test/browser/downloads-layout.spec.ts `
  test/browser/emergency-theme.spec.ts `
  test/browser/five-section-refinements.spec.ts `
  test/browser/office-slideshow.spec.ts `
  --workers=1
```

### Step 5 — Full browser verification

Only after the targeted tests have passed:

```powershell
npx playwright test --workers=1
```

The full suite must pass before I report browser qualification as complete.

Any failure must be documented honestly.

---

## 9. VERIFY OWNERSHIP BOUNDARIES

From the repository root:

```powershell
cd ..

git diff --name-only
```

All application modifications must be inside:

```text
frontend/
```

If backend files were modified unexpectedly, I must inspect and preserve those changes and coordinate with AJ before proceeding.

I must not discard unrelated changes.

---

## 10. COMMIT MY FRONTEND WORK

After verifying and reviewing my modifications:

```powershell
git add frontend/

git diff --cached --check

git diff --cached --stat
```

Then:

```powershell
git commit -m "fix(frontend): resolve TalGov R2 browser regressions"
```

Confirm:

```powershell
git status --short

git log -1 --oneline
```

I must not include backend code or unrelated files.

---

## 11. PUSH MY BRANCH TO GITHUB

I push only my frontend development branch:

```powershell
git push -u origin fix/talgov-r2-frontend-regressions
```

I must never use force push or push directly to `main`.

If I do not have permission to push to the canonical repository, I must use my authorized fork and open a PR from it.

---

## 12. CREATE MY PULL REQUEST

### Pull Request Details

**Base:** `main`

**Compare:** `fix/talgov-r2-frontend-regressions`

**Title:**

```text
fix(frontend): resolve TalGov R2 browser regressions
```

### PR Description Template

```markdown
## Summary

Resolved frontend browser regressions in TalGov R2.

## Scope

- Frontend-only changes
- No backend changes
- No database changes
- No production deployment

## Fixes

- Downloads layout:
- Emergency theme:
- Five-section refinements:
- Office slideshow:

## Verification

- Lint:
- Build:
- Unit tests:
- Targeted Playwright:
- Full Playwright:

## Remaining Issues

Document any unresolved issues and blockers.

## Reviewer

AJ — Backend / Integration Lead
```

I must include actual test results, not assumed results.

---

## 13. HOW I WORK WITH AJ

### My ownership

Frontend:
- React components
- CSS and responsive layout
- Accessibility
- Client-side integration
- Frontend automated tests
- Visual regressions

### AJ's ownership

Backend:
- NestJS APIs
- Neon PostgreSQL
- Better Auth and MFA
- Authentication and authorization
- Media storage
- Backend security
- API contracts
- Deployment qualification

If I discover a backend problem, I must report:

1. The failing API endpoint.
2. Expected versus actual behavior.
3. Reproduction steps.
4. Relevant HTTP status and sanitized error.
5. The frontend impact.

I must not attempt an unauthorized backend fix.

---

## 14. COMPLETION CHECKLIST

- [ ] Updated local `main`
- [ ] Created my frontend development branch
- [ ] Confirmed the latest R2 code
- [ ] Inspected all four failing test files
- [ ] Identified actual failure causes
- [ ] Applied frontend-only fixes
- [ ] Passed lint
- [ ] Passed build
- [ ] Passed unit tests
- [ ] Passed targeted browser tests
- [ ] Passed full browser suite
- [ ] Verified no backend modifications
- [ ] Reviewed Git diff
- [ ] Committed verified frontend changes
- [ ] Pushed frontend branch
- [ ] Opened PR targeting `main`
- [ ] Submitted evidence for AJ's review

---

## FINAL RULEs

**I own the frontend. AJ owns the backend.**

I must deliver clean, tested, reviewable frontend work without changing the verified backend architecture.

A passing local frontend suite does not authorize production deployment.

**TalGov R2 remains production NO-GO until all required security, staging, recovery, and LGU approval gates are satisfied.**

---

*TalGov R2 — Frontend Development Handoff*  
*Assigned Developer: Jayr*  
*Maintained for coordinated frontend/backend development.*
