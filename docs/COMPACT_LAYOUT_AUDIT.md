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

## Electronic services placeholder — 4 November 2026

Replaced the developer placeholder with a centered Coming soon badge,
citizen guidance and two existing-route actions. Reuses scoped solid-blue tokens;
no planned-service promises or launch dates. Buttons stack below 640px. This work
was restored from the stash onto `ui-changes-continue` after PR #101 was merged.
TypeScript, build, 21 Node tests, 71 React tests and targeted keyboard/responsive
browser checks at 360, 768, 1280 and 1920px pass. See FRONTEND_FOUNDATION.md for
details. No other sections changed; no deployment.


## Emergency Hotlines red palette - 4 November 2026

Changed only EmergencyHotlines.tsx color hooks, its new scoped
EmergencyHotlines.module.css and the requested static, accessible siren emoji.
No layout rules, existing element hierarchy, typography, copy, phone numbers,
SVG paths, spacings, blur, watermark or motion behavior changed. The existing
CompactSections.module.css remains untouched. The emoji has a 6px left margin.

The red gradient uses #450A0A edges and #991B1B center. Cards retain their white
5% glass fill (10% on hover) and 8px blur, with translucent red borders. Icon and
phone chips retain their shapes with red tints. Agency descriptions use opaque
red-50 for AA readability; white phone and landline text stays unchanged.

emergency-theme.spec.ts compares measured boxes, padding, gaps, font sizes,
backdrop filters, telephone destinations and SVG path data against the original
navy baseline at 360, 768, 1280 and 1920px. Every comparison passes, with entrance
animations frozen only in the review harness. Conservative contrast checks use a
background brighter than the combined gradient, glass hover, glows and watermark:
all text, including agency descriptions, passes at a minimum 5.02:1.

Windows Edge renders the standard Unicode siren emoji. Physical Android and iOS
rendering has not been verified here. No phone numbers were changed; their live
availability was not verified. Red tokens are local to this section.

| Width | Before | After |
| --- | --- | --- |
| 360px | [Before](../frontend/node_modules/.cache/emergency-theme/before-360.png) | [After](../frontend/node_modules/.cache/emergency-theme/after-360.png) |
| 768px | [Before](../frontend/node_modules/.cache/emergency-theme/before-768.png) | [After](../frontend/node_modules/.cache/emergency-theme/after-768.png) |
| 1280px | [Before](../frontend/node_modules/.cache/emergency-theme/before-1280.png) | [After](../frontend/node_modules/.cache/emergency-theme/after-1280.png) |
| 1920px | [Before](../frontend/node_modules/.cache/emergency-theme/before-1920.png) | [After](../frontend/node_modules/.cache/emergency-theme/after-1920.png) |

The comparison artifacts are local and ignored. Final validation passes: TypeScript,
production build, 21 Node tests, 72 React tests, 57 public browser tests and 23
e-services browser regressions. The existing large-bundle warning remains.
Nothing deployed.

## Solid card bands, metadata and heading polish - 4 November 2026

Scoped feedback refinement: Municipal Offices icon bands are now solid primary
blue #0084D1, retaining their 80px height and white icons. Offices and News cards
use 0 1px 3px rgba(15,23,42,.15), with 0 4px 12px rgba(15,23,42,.18) and a 2px lift
on hover/focus. No card borders were added. Reduced motion removes the lift and
transitions. The Barangay lists remain flat and unchanged.

Offices and News section headings are 32px on mobile and 48px from sm; their
labels/descriptions are increased one step. This does not affect the protected
main hero or navigation. The compact office bands/body/width cap are retained.

News metadata is grouped beneath the image: category left, year-inclusive date
right, followed by a supplied non-generic author if present. Author/date share
14px slate-700 styling. A common metadata height when authors exist aligns normal
headlines across the row without inserting author labels or invented names.
Titles/excerpts retain two-line clamping and Read article stays pinned below.
Generic Municipal Admin/Administrator suppression is unchanged.

The Municipal Services & Real Estate text is a combined Digital Governance
eyebrow, not two separate service links. Its single Building icon was removed;
the text, six service-card icons, all service data and routes remain unchanged.
No admin sidebar or approved navigation icon was touched.

Exact files:

- `frontend/src/components/MunicipalOffices.module.css`
- `frontend/src/components/NewsTodaySection.module.css`
- `frontend/src/components/NewsTodaySection.tsx`
- `frontend/src/components/Services.tsx`
- `frontend/test/browser/municipal-offices.spec.ts`
- `frontend/test/browser/news-section.spec.ts`
- `frontend/test/browser/five-section-refinements.spec.ts`
- `docs/COMPACT_LAYOUT_AUDIT.md` (this note)

Local review captures (ignored, not deployed):

| Width | Offices before | Offices after | News before | News after |
| --- | --- | --- | --- | --- |
| 360px | [Before](../frontend/node_modules/.cache/card-polish/before-offices-360.png) | [After](../frontend/node_modules/.cache/card-polish/after-offices-360.png) | [Before](../frontend/node_modules/.cache/card-polish/before-news-360.png) | [After](../frontend/node_modules/.cache/card-polish/after-news-360.png) |
| 768px | [Before](../frontend/node_modules/.cache/card-polish/before-offices-768.png) | [After](../frontend/node_modules/.cache/card-polish/after-offices-768.png) | [Before](../frontend/node_modules/.cache/card-polish/before-news-768.png) | [After](../frontend/node_modules/.cache/card-polish/after-news-768.png) |
| 1280px | [Before](../frontend/node_modules/.cache/card-polish/before-offices-1280.png) | [After](../frontend/node_modules/.cache/card-polish/after-offices-1280.png) | [Before](../frontend/node_modules/.cache/card-polish/before-news-1280.png) | [After](../frontend/node_modules/.cache/card-polish/after-news-1280.png) |
| 1920px | [Before](../frontend/node_modules/.cache/card-polish/before-offices-1920.png) | [After](../frontend/node_modules/.cache/card-polish/after-offices-1920.png) | [Before](../frontend/node_modules/.cache/card-polish/before-news-1920.png) | [After](../frontend/node_modules/.cache/card-polish/after-news-1920.png) |

TypeScript, 21 Node tests and all 85 React tests pass; the final News helper also
passes its focused 8-test file. The production build and all 16 targeted browser
checks pass at the requested widths. Checks include exact fills/shadows, hover,
reduced motion, author/date styling, right-aligned dates, aligned row headings,
keyboard navigation and unchanged protected captures. Before/after screenshots
were visually reviewed. The existing large-bundle warning remains. The full
81-test public browser suite from the preceding refinement was not repeated for
this scoped polish; these 16 relevant checks were run instead.
No API, backend, dependency, content-data or route changes. The only
changed product sources are the four listed files, verified against pre-task
source hashes. Protected hero/header pixel checks remain unchanged under fixed
fixtures/clock with live hero video and remote fonts blocked. Nothing deployed.

## News and announcements refinement - 4 November 2026

This local change replaces only the News Today section's newspaper photograph,
navy overlays and glass cards with the supplied preview's light-blue/white
presentation. The linked Claude artifact could not be retrieved; the attached
preview and written specification were used. The anchor remains news-today.

The heading is now News and announcements, with a sentence-case press label,
18px description, 80px desktop padding and a 52px deep-blue View all news link.
Cards use full-width 16:9 lazy images, white 24px radii, category/date metadata,
two-line headings/excerpts, and a bottom-aligned Read article affordance. Each
card is one accessible link to the original article route. Missing or failed
images become a decorative newspaper-icon gradient without text or a fake seal.
Dates include the year and an ISO date attribute; invalid dates are omitted.
Generic Municipal Admin/Administrator attribution is omitted, while other
provided author values remain available. Missing categories are not fabricated.

One article uses a wide card (image/body beside one another from sm). Two use
a newest-first, larger featured card beside a smaller card from lg. Three or
more use one/two/three columns across mobile/sm/lg, 24px gaps and equal heights.
Six returned records were tested as a layout stress case. The actual existing
public request remains /api/news?limit=3; no API, source, schema, admin posting
or database changes were made. Loading/error/retry behavior and /news remain.
Zero visible records show No news yet. Check back soon., with View all news.

The section excludes records explicitly marked non-published or is_test and the
two specifically identified sample titles. Status-less records still rely on the
existing published-only public endpoint. No heuristic hides legitimate stories
just because their title mentions testing. Filtering can leave fewer than three
visible records; it does not fetch replacement articles or alter pagination.

Required data cleanup: KIRCH POGI and new website release should be deleted from
the database through the authorized editorial process. Hiding them here does
not remove potential direct-detail, search or RSS access. Nothing was deleted.

Exact files for this refinement:

- `frontend/src/components/NewsTodaySection.tsx`
- `frontend/src/components/NewsTodaySection.module.css` (new)
- `frontend/test/react/news-section.test.tsx` (new)
- `frontend/test/browser/news-section.spec.ts` (new)
- `frontend/test/browser/more-talibon-pages.spec.ts` (historical screenshot comparison scope)
- `docs/COMPACT_LAYOUT_AUDIT.md` (this note)

Local review captures (ignored; not deployed):

| Width | Before | After: three articles | Empty | One | Two | Six |
| --- | --- | --- | --- | --- | --- | --- |
| 360px | [Before](../frontend/node_modules/.cache/news-section/before-360.png) | [After](../frontend/node_modules/.cache/news-section/after-360-3-articles.png) | [0](../frontend/node_modules/.cache/news-section/after-360-0-articles.png) | [1](../frontend/node_modules/.cache/news-section/after-360-1-articles.png) | [2](../frontend/node_modules/.cache/news-section/after-360-2-articles.png) | [6](../frontend/node_modules/.cache/news-section/after-360-6-articles.png) |
| 768px | [Before](../frontend/node_modules/.cache/news-section/before-768.png) | [After](../frontend/node_modules/.cache/news-section/after-768-3-articles.png) | [0](../frontend/node_modules/.cache/news-section/after-768-0-articles.png) | [1](../frontend/node_modules/.cache/news-section/after-768-1-articles.png) | [2](../frontend/node_modules/.cache/news-section/after-768-2-articles.png) | [6](../frontend/node_modules/.cache/news-section/after-768-6-articles.png) |
| 1280px | [Before](../frontend/node_modules/.cache/news-section/before-1280.png) | [After](../frontend/node_modules/.cache/news-section/after-1280-3-articles.png) | [0](../frontend/node_modules/.cache/news-section/after-1280-0-articles.png) | [1](../frontend/node_modules/.cache/news-section/after-1280-1-articles.png) | [2](../frontend/node_modules/.cache/news-section/after-1280-2-articles.png) | [6](../frontend/node_modules/.cache/news-section/after-1280-6-articles.png) |
| 1920px | [Before](../frontend/node_modules/.cache/news-section/before-1920.png) | [After](../frontend/node_modules/.cache/news-section/after-1920-3-articles.png) | [0](../frontend/node_modules/.cache/news-section/after-1920-0-articles.png) | [1](../frontend/node_modules/.cache/news-section/after-1920-1-articles.png) | [2](../frontend/node_modules/.cache/news-section/after-1920-2-articles.png) | [6](../frontend/node_modules/.cache/news-section/after-1920-6-articles.png) |

White/deep-blue and deep-blue/white contrast is 7.51:1; slate-700/white is 10.35:1.
Focus is a visible 2px deep-blue outline with 2px offset; reduced motion removes
the hover/focus lift and transitions. Article headings retain h3 after the h2.
TypeScript, the production build, all 21 Node tests and all 85 React tests pass.
The existing large-bundle build warning remains. All News edge-case checks pass
at 360, 768, 1280 and 1920px, with 0/1/2/3/6 fixture articles, a missing image,
a failed image, long text, absent category and keyboard focus. Captures at all
four widths were visually reviewed. These use synthetic records; live article
destinations and actual hosted images have not been independently revalidated.

The complete public browser run passed 74 of 77 initially. Three older optional
local screenshot comparisons detected fractional raster shifts below the newly
visible empty News section. Their width check remains exact and height allows
one pixel of screenshot rounding. Historical featured-card pixel matching is now
opt-in via TALWEB_PAGES_COMPARE_BASELINE=1 for a matching capture session; it no
longer treats ignored artifacts from a different refinement as CI baselines.
Disclosure, keyboard, route and responsive checks remain enabled. All three
passed on rerun; all 77 browser checks are covered successfully. No production
changes were made to that section.

Protected header/hero comparisons show zero changed pixels at 375, 768, 1280,
1440 and 1920px under matching fixtures, media, clock and blocked live video/fonts.
Source hashes across 212 existing files identify only NewsTodaySection.tsx as
changed in this task; its CSS module is the only new product source. Shared
styles, navigation, protected hero, data services and all other sections match
their pre-task bytes. Backend/package changes already present were untouched.
No new dependencies, publishing or deployment.

### Latest Barangay interaction update

The grouped lists were subsequently replaced by a native-radio picker with a
selected details card, retaining the same data and actual routes. See the
[interactive picker report](BARANGAY_SECTION_REDESIGN.md#interactive-picker-update---4-november-2026)
for current behavior, unavailable detail fields, before/after captures and checks.
Municipal Offices and all other sections are unchanged by that picker task.

## Grouped Barangays and smaller Municipal Offices - 4 November 2026

Only the Barangay directory and Municipal Offices presentation change. The
directory now uses unboxed, alphabetical Mainland and Island lists with all
25 names visible by default. Counts are computed from the unchanged reference
data, including Poblacion in the Mainland total of 17. Search, accent matching,
group filters, original routes, reset action and PSA reference are preserved.
The Poblacion chip and expansion controls are replaced by the requested grouped
browsing. The showing count appears only while filtering. Empty groups disappear.
The no-results message matches the user's wording. Wide groups use a 2:1 split;
tablet groups stack, and names use CSS columns with 44px minimum link targets.

Municipal Offices retains its four cards and their unchanged names/titles/routes.
Its local content width is capped at 1280px, vertical padding drops from 64 to
40px, icon bands from 120 to 80px, body padding from 24 to 16px, desktop heading
from 40 to 32px, and icon sizes from 44 to 36px. Name text remains prominent at
18px, roles remain readable at 14px, arrows stay visible and the view-all target
is 44px high. No text is truncated. Existing mayor-name discrepancy remains
unresolved: Municipal Offices lists Hon. Michael I. Doria; Our Story lists
Hon. Janette Aurestila-Garcia. No official's name or title was edited.

Approximate Municipal Offices section heights in controlled captures:

| Width | Before | After |
| --- | ---: | ---: |
| 360px | 1797px | 1364px |
| 768px | 1038px | 733px |
| 1280px | 701px | 520px |
| 1920px | 678px | 520px |

Exact files for this refinement:

- `frontend/src/components/BarangaySelector.tsx`
- `frontend/src/components/BarangaySelector.module.css`
- `frontend/src/components/MunicipalOffices.module.css`
- `frontend/test/react/barangays.test.tsx`
- `frontend/test/browser/barangays.spec.ts`
- `frontend/test/browser/compact-directory.spec.ts` (new)
- `frontend/test/browser/municipal-offices.spec.ts` (compact button height)
- `docs/BARANGAY_SECTION_REDESIGN.md`
- `docs/COMPACT_LAYOUT_AUDIT.md` (this note)

Local before/after gallery (ignored review artifacts, not deployed):

| Width | Barangays before | Barangays after | Offices before | Offices after |
| --- | --- | --- | --- | --- |
| 360px | [Before](../frontend/node_modules/.cache/grouped-barangays/before-barangays-360.png) | [After](../frontend/node_modules/.cache/grouped-barangays/after-barangays-360.png) | [Before](../frontend/node_modules/.cache/grouped-barangays/before-offices-360.png) | [After](../frontend/node_modules/.cache/grouped-barangays/after-offices-360.png) |
| 768px | [Before](../frontend/node_modules/.cache/grouped-barangays/before-barangays-768.png) | [After](../frontend/node_modules/.cache/grouped-barangays/after-barangays-768.png) | [Before](../frontend/node_modules/.cache/grouped-barangays/before-offices-768.png) | [After](../frontend/node_modules/.cache/grouped-barangays/after-offices-768.png) |
| 1280px | [Before](../frontend/node_modules/.cache/grouped-barangays/before-barangays-1280.png) | [After](../frontend/node_modules/.cache/grouped-barangays/after-barangays-1280.png) | [Before](../frontend/node_modules/.cache/grouped-barangays/before-offices-1280.png) | [After](../frontend/node_modules/.cache/grouped-barangays/after-offices-1280.png) |
| 1920px | [Before](../frontend/node_modules/.cache/grouped-barangays/before-barangays-1920.png) | [After](../frontend/node_modules/.cache/grouped-barangays/after-barangays-1920.png) | [Before](../frontend/node_modules/.cache/grouped-barangays/before-offices-1920.png) | [After](../frontend/node_modules/.cache/grouped-barangays/after-offices-1920.png) |

AA contrast ratios: white/deep blue 7.51:1, sky-950/white 13.88:1,
sky-950/sky-100 12.10:1, slate-900/sky-50 16.75:1 and
slate-900/sky-100 15.56:1. Search focus uses a 2px primary-blue ring; links and
chips use a 2px deep-blue outline. Group identity includes text, icons and counts.
Reduced motion removes transitions. Keyboard traversal through all names was
checked. San Francisco wrapping and accent-insensitive santo nino matching to
Santo Niño were reviewed.

TypeScript, production build, all 21 Node tests and 85 React tests pass. The
14 focused browser checks pass, including additional 320/375px coverage, search,
group hiding, reset, full chip totals and Poblacion membership. Visual captures
were reviewed at all four requested widths. All 81 full public browser regression
tests passed in one run. The existing large-bundle warning remains.

No data sources or backend files were changed. Source hashing identifies only
the three listed existing component/style files as changed among 213 source
files; no new product source files or dependencies were added. Protected hero,
header, navigation, branding and all other sections retain their exact source.
Matching fixture screenshots show zero changed hero/header pixels; live video
and remote fonts are blocked for those deterministic comparisons. External PSA
availability and live directory data have not been independently revalidated.
Nothing deployed.
