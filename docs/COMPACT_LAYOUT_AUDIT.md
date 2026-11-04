# TALWEB compact section layout audit ? 4 November 2026

## Scope and exact files

The user?s attached compact-layout request explicitly authorizes spacing changes
in these homepage content sections. The protected hero, header/navigation,
branding, completed standalone pages and all other sections remain unchanged.

Implementation files, relative to the repository root:

- `frontend/src/components/CitizensCharterSection.module.css` ? smaller section,
  heading/category gaps, task-control padding, office-card padding and icon boxes.
  The existing three-column desktop grid, typography and content are retained.
- `frontend/src/components/CompactSections.module.css` ? new, opt-in layout module
  for the four components below; no shared/global styles or tokens changed.
- `frontend/src/components/Tourism.tsx` ? attach local layout hooks; shorter,
  matching 2:1 image frames capped at 280px, tighter alternating destination rows,
  smaller decorative numerals and section/header spacing. Existing motion props,
  images, destination descriptions and links are unchanged.
- `frontend/src/components/SocialMediaUpdates.tsx` ? attach local layout hooks;
  smaller section/status/post spacing and tighter social-group wrapping.
- `frontend/src/components/Location.tsx` ? attach local layout hooks; balanced
  tablet/desktop columns, smaller information-panel padding and facts row, 240px
  mobile map minimum. Content can grow naturally; nothing is clipped to a fixed
  panel height.
- `frontend/src/components/EmergencyHotlines.tsx` ? attach local layout hooks;
  icons beside agency names, compact padding/gaps, aligned call rows and a closer
  landline bar. Four columns at 1280px and up, two on tablet, one on mobile.
- `docs/COMPACT_LAYOUT_AUDIT.md` ? this report.

The existing global density rules already override some Tailwind padding/margin
utilities at desktop widths. Explicit module hooks avoid conflicting utilities;
those global rules were inspected and preserved. No new dependencies, routes,
state management, API behavior, data records or backend changes were introduced.

## Measured before and after

Section heights in CSS pixels, rounded for display; reduction computed from
unrounded measurements. Matching viewports: 1000px high, widths below. Identical
empty social-cache/API fixtures, existing 19 charter offices with staff category
collapsed, tourism assets genuinely unavailable. Motion settled before capture.
Content was never hidden to obtain these reductions.

| Width | Section | Before px | After px | Reduction |
| --- | --- | --- | --- | --- |
| 375 | charter | 4580 | 4169 | 9.0% |
| 375 | tourism | 1630 | 1346 | 17.4% |
| 375 | social-updates | 706 | 646 | 8.5% |
| 375 | location | 1038 | 874 | 15.8% |
| 375 | emergency | 1800 | 911 | 49.4% |
| 768 | charter | 2906 | 2506 | 13.8% |
| 768 | tourism | 1391 | 869 | 37.5% |
| 768 | social-updates | 417 | 397 | 4.8% |
| 768 | location | 920 | 520 | 43.5% |
| 768 | emergency | 942 | 636 | 32.4% |
| 1280 | charter | 2618 | 2238 | 14.5% |
| 1280 | tourism | 1542 | 1039 | 32.7% |
| 1280 | social-updates | 333 | 317 | 4.8% |
| 1280 | location | 552 | 500 | 9.4% |
| 1280 | emergency | 675 | 472 | 30.1% |
| 1440 | charter | 2598 | 2214 | 14.8% |
| 1440 | tourism | 1677 | 1124 | 33.0% |
| 1440 | social-updates | 333 | 317 | 4.8% |
| 1440 | location | 552 | 500 | 9.4% |
| 1440 | emergency | 675 | 466 | 31.0% |

The comparatively small social-section reduction is intentional: every social
link remains visible with a comfortable touch target. Charter mobile scrolling
remains necessary because all 15 public-office cards are retained.

## Content, behavior and protected-area checks

- Normalized visible text, every link label/href/target, and image src/alt values
  match the baseline in all 20 section/viewport pairs.
- Hero/header first-viewport screenshots have zero changed pixels at 375, 768,
  1280 and 1440px with identical fixtures and settled animations.
- SHA-256 comparison against the task-start snapshot: five existing
  implementation files changed; 311 other existing source/asset/documentation
  and Firebase files retain their hashes. The sixth implementation file is the
  new scoped CSS module.
- No document-level horizontal overflow or out-of-viewport text/control bounds
  in the five measured sections at any requested width.
- Tourism?s three image frames have matching heights at each width:
  171.5, 174, 251.6 and 280px respectively. Existing alternating desktop layout
  and Motion animation props remain intact.
- All five emergency call links retain their exact numbers and `tel:` targets,
  original phone-number typography and at least 44px target height once the
  preserved entry animation settles. Keyboard focus is visible. The dark
  emergency background and existing agency indicator colors are preserved.
- Google map open/close controls work by keyboard; the original iframe source,
  directions URL, coordinates, contact link and geographic values are retained.
- The emergency section?s decorative blurred shapes extend its internal scroll
  bounds, as before. Its existing `overflow-hidden` contains them; the document
  and actual content do not overflow.

## Missing tourism assets ? outside spacing scope

All three referenced files are absent from this checkout?s `frontend/public`:

- `/images/danajon_bank.jpg`
- `/images/holy_trinity.jpg`
- `/images/sandbars.jpg`

Real browser image checks report `naturalWidth === 0` before and after. These
blank areas are caused by missing assets, amplified by the old image sizing.
URLs were not changed and unrelated replacements were not inserted. Compact,
neutral, consistently sized frames keep the layout stable while preserving alt
text. Restoring the approved photos remains separate asset work; this pass does
not claim that the missing images have been fixed or that production/CDN files
have been checked.

## Validation and limits

- TypeScript: passed.
- Final production build: passed; existing large-bundle warning remains.
- Node suite: 21 passed.
- React suite: 65 passed. The first run, concurrent with the build and browser
  capture, timed out in the unrelated chatbot conversation test (64 passed).
  The complete suite passed on rerun without code or timeout changes.
- Existing Charter, barangay, social and location browser regressions: 12 passed.
- Dedicated four-width layout checks: passed for bounds, 44px phone targets,
  phone keyboard focus, matching tourism frames and map toggling.
- Matching before/after screenshots were captured and representative mobile,
  tablet and desktop outputs visually reviewed. Only the fixed site header was
  hidden for cropped section artifacts; protected viewport captures include it.
- Whitespace validation: passed.

Browser checks use fixtures and block external connections. Live API data,
external social destinations, Google?s remote map rendering and phone-number
accuracy are not revalidated by this styling pass. No text, contact number,
service result or unavailable integration was fabricated.

Local before/after PNGs, measurements, verification scripts and comparisons are
under the ignored `frontend/node_modules/.cache/talweb-compact/` directory.

## Quick-links strip follow-up — 4 November 2026

Local only; no deployment. The user separately authorized this strip’s redesign.
`frontend/src/components/QuickAccess.tsx` now uses semantic nav/ul/li/link markup,
the heading “What do you need today?”, six sentence-case task labels, and six
distinct decorative Lucide icons. All six route values are unchanged, including
the first two links both pointing to `/services`.

`frontend/src/components/QuickAccess.module.css` removes the old width cap,
distributes equal-width cells across the existing site gutters, uses three
columns below 768px and six from the explicit `md` breakpoint upward, and allows
13px bold slate labels to wrap. Existing Tailwind sky-600/sky-700 tokens provide
solid blue icon boxes, white icons, hover lift, visible keyboard focus, and
motion-free hover/press states with `prefers-reduced-motion`.

Tests changed: `frontend/test/react/homepage-sections.test.tsx` adds the new
labels, preserved routes, semantic list and distinct/aria-hidden icon checks;
`frontend/test/browser/quick-access.spec.ts` checks 360, 768, 1280 and 1920px,
equal/full-width columns, wrapping/overflow, touch targets, hover, keyboard focus,
reduced motion and rendered contrast. All four browser checks passed and their
section screenshots were reviewed. Labels measured 17.83:1 against white;
white icons measured 4.02:1 normally and 5.86:1 on hover, exceeding the applicable
AA text (4.5:1) and non-text/icon (3:1) thresholds. The sky-700 focus outline also
exceeds 3:1 against white.

Typecheck, production build, 21 Node tests and 66 React tests passed; the existing
bundle-size warning remains. Source hash comparison found only QuickAccess.tsx
changed among the 195 existing source files, plus the new scoped stylesheet.
No other sections, dependencies, APIs, routes or deployment settings changed.
Browser checks used local API fixtures and an isolated configuration against
the existing preview server; they do not establish live destination availability.
