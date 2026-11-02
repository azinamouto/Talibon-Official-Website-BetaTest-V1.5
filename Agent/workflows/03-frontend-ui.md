# Workflow: React public site and admin UI
**When:** `frontend/src/` and public UI.

1. Follow existing React 19 / TS / Vite / Tailwind patterns; minimal, readable, white-dominant, restrained green accents, responsive and keyboard accessible.
2. Public pages never require editor login. E-services remains the approved informational notice; do not expose citizen forms/checkout via deep links.
3. CMS is photo/document management only. Avoid adding news editing without separate approval.
4. Client must call versioned backend interfaces, never use database admin credentials or privileged browser SQL.
5. Provide clear loading/empty/error states; no fabricated success, paid receipts, fees or municipal statistics.
6. Test 375px and desktop, keyboard focus, semantic headings and reduced-motion where relevant.
**Verify:** `npm --prefix frontend run lint`, `npm --prefix frontend run build`, `npm --prefix frontend test`, `npm --prefix frontend run test:react`; run scoped Playwright specs if available.
