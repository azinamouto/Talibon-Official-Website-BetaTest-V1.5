# TALWEB visual consistency audit — 2026-11-04

Authority: [FRONTEND_THEME.md](FRONTEND_THEME.md). Prior results remain in
[FRONTEND_REFINEMENT_AUDIT.md](FRONTEND_REFINEMENT_AUDIT.md).
This report describes a separate, targeted correction pass, not a redesign.

## Findings and decisions

| Impact | Verified finding | Correction |
| --- | --- | --- |
| High | At 375px, 28 page headings began behind the 137px fixed header; at 768px they began behind the 143px header. Most affected heading boxes started at 125px. | Add 24px of page-local clearance below 1024px to zero-inset information pages, the organizational chart, and Citizen Charter. Do not modify BaseLayout or navigation. |
| High | In Ordinances list mode at 375px, a card with a 341px inner width contained 427px of content. Its download action extended beyond the viewport and was clipped by the page. | Let narrow list cards wrap the existing download action onto a full-width second row; allow the title column to shrink and wrap. Preserve the selected view, record content, and link attributes. |
| Medium | The Downloadables Resources marker was hidden under the fixed header on mobile/tablet. | Add the same 24px clearance only below 1024px in its existing local stylesheet. |
| Medium | Compact content controls had inconsistent target sizes, including a 21px-high Clear all filters button. | Give buttons inside the opt-in section theme a 44px minimum target and center single-icon controls. Inline prose links, map attribution, protected navigation, and completed-section button styling are not globally changed. |
| Medium | Opt-in content retained CSS hover zoom, translation, transitions, and skeleton pulsing with reduced motion enabled. | Suppress those nonessential CSS effects only under `prefers-reduced-motion: reduce`. Normal-motion behavior and JavaScript animation/state code remain intact. |

The existing sky-blue palette, semantic state colors, white surfaces, typography,
card treatment, and varied section layouts were already sufficiently coherent to
retain. No new gradients, colors, font scale, content containers, or dependency
were introduced merely for consistency.

## Exact implementation files

Paths are relative to the repository root.

| File | Change |
| --- | --- |
| `frontend/src/styles/SectionTheme.module.css` | Opt-in clearance class, minimum button targets, icon alignment, and CSS reduced-motion rules. All utility selectors remain scoped through the existing local section class. |
| `frontend/src/pages/ContentPage.tsx` | Attach the clearance class to the existing information-page root. |
| `frontend/src/pages/OrganizationalChartPage.tsx` | Attach the clearance class to the existing populated chart-page root. |
| `frontend/src/pages/CitizenCharterPage.module.css` | Correct the verified mobile/tablet title overlap. |
| `frontend/src/pages/DownloadsPage.module.css` | Correct the verified mobile/tablet Resources-marker overlap. |
| `frontend/src/pages/EnactedOrdinancesPage.tsx` | Attach a local styling class to existing list cards, without changing the grid/list condition or handlers. |
| `frontend/src/pages/EnactedOrdinancesPage.module.css` | Shrink/wrap the list title and stack the download action below 640px. |
| `docs/FRONTEND_VISUAL_AUDIT.md` | This findings and validation record. |

### Justified exceptions for completed sections

- **Citizen Charter:** only its obscured heading clearance below 1024px changes.
- **Downloadables:** only its obscured Resources-marker clearance below 1024px
  changes. Its colors, controls, cards, content, and behavior retain their design.
- **Enacted Ordinances:** only the verified list-mode clipping is corrected.
  Grid markup, year/search logic, links, and view-state behavior are preserved.
- **EServices, Privacy Policy, Full Disclosure:** no implementation edits.

## Protected-area verification

- Captured a phase-start SHA-256 snapshot of 359 existing source, documentation,
  asset, workflow, and operations files. Only the seven implementation files
  listed above differ; the other 352 snapshot files retain their hashes.
- Home, Hero, Navbar, Footer, all existing homepage components/assets, BaseLayout,
  global CSS/tokens, App routes, Firebase files, API/service code, and existing
  social/location work are unchanged.
- Protected homepage viewport images have **zero changed pixels** at 375, 768,
  1280, and 1440px using identical fixtures and settled animations.
- The header/navigation regions have **zero changed pixels in all 28 paired
  screenshots** across the homepage and six completed routes at those widths.
- EServices, Privacy Policy, and Full Disclosure viewport images are identical
  at all four widths. Downloadables and Citizen Charter desktop images are also
  identical; mobile/tablet differences correspond to the documented clearance.
- Animated/hover Ordinances grid captures have small timing differences around
  controls. They were inspected visually rather than claimed pixel-identical.

## Executed validation

| Check | Result |
| --- | --- |
| TypeScript (`tsc --noEmit`) | Passed |
| Production build (`vite build`) | Passed after the final CSS correction; existing large-bundle warning retained |
| Existing Node tests | 21 passed |
| Existing React tests | 57 passed, including protected homepage section coverage |
| Existing browser contract suite | 10 passed |
| Existing remaining frontend browser suites | 62 passed: admin, authentication, EServices, public content, maps, homepage sections, and retired-workflow guards |
| Four-width before/after audit | 188 measured route states per phase: 46 route cases plus Ordinances list mode at each of four widths |
| Heading overlap after correction | None in the measured states |
| Document-level horizontal overflow | None in the measured states |
| Ordinances mobile list content width | Reduced from 427px to 341px within its 341px card |
| Focused checks at all four widths | List containment, grid/list preservation, download href/target, keyboard focus, minimum button dimensions, and icon alignment passed |
| Normal/hover text contrast | Rendered representative tourism button states exceeded 4.5:1 at all four widths |
| Reduced-motion CSS | Zero transition duration and no hover scale verified under reduced motion; normal transition behavior verified when preference is reset |
| Whitespace validation (`git diff --check`) | Passed |

Widths: 375px mobile, 768px tablet, 1280px laptop, 1440px desktop. Screenshots of
the corrected mobile/tablet headings, Resources marker, compact controls, and
mobile/desktop list layouts were inspected without hiding the protected header.
Before/after PNGs, pixel-comparison results, measurements, and test scripts are
local review artifacts under the ignored
`frontend/node_modules/.cache/talweb-visual-audit/` directory.

Browser validation used contract examples, synthetic records/sessions, image
fixtures, and blocked external service connections. It does not establish live
integration or the correctness of production records. The invalid authentication
callback intentionally continues to show its existing error state.

## Outstanding findings and limits

- Previously reported ordinances/resolutions HTTP 404 responses, unavailable
  services/news API, and Resolutions refresh/memoization issue remain assigned
  elsewhere. They were not fixed, hidden, or requalified in this visual pass.
- The prior PDF/image HTTP 200 results are historical availability checks. This
  pass does not claim a new live destination check.
- Resolutions currently presents a horizontally scrollable table as well as
  mobile cards. Both were retained: removing the table would also remove its
  current mobile sorting interaction and change UX.
- Inline text/attribution links were not expanded into blocks. The 44px checks
  concern content buttons, not a claim of universal target-size compliance.
- CSS reduced-motion behavior improved; existing JavaScript/Framer Motion
  animation and explicit smooth-scroll code were preserved. This is not a full
  WCAG conformance audit or a complete reduced-motion implementation review.
- Authenticated cases use synthetic sessions; live role-specific records,
  provider services, deployment, and every possible viewport remain unverified.

No backend, database query, endpoint, network request, authentication, routing,
state management, search/filter logic, download action, or content was changed.
No commit, push, or deployment was performed.
