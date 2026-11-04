# Barangay discovery section

Date: 2026-11-04 (Asia/Shanghai).

The owner's latest request explicitly authorizes redesigning the homepage's
Barangays section. It supersedes the earlier homepage protection only for this
component. Hero, navigation, the six completed pages, social/location work, and
other homepage sections remain unchanged from this pass's starting snapshot.

## Result

- Replace column-first rows with a row-first card grid: four columns from 1024px,
  two columns on tablet and mobile, including 320px screens.
- Each card has an initial badge and a location fact. At the narrowest width,
  the badge stacks above the name to preserve complete, readable names.
- All, Poblacion, Mainland, and Island buttons combine with instant name search.
  Matching ignores case, surrounding whitespace, and diacritics: `nino` finds
  Santo Niño. Results and the empty state update immediately.
- Eight cards appear initially, with a Browse all 25 / Show fewer control.
  Search and location selection show every matching barangay without a preview
  limit. Initial order is alphabetical; it does not imply popularity, proximity,
  recent updates, or a ranking.
- Poblacion is included in Mainland. Counts are All 25, Poblacion 1, Mainland 17,
  and Island 8. Visible helper text explains this overlap.
- A single View full directory link sits with the browsing controls. Cards are
  informational and have no arrow, pointer cursor, or fabricated detail link.
- White cards, charcoal type, solid sky-blue controls, subtle borders, visible
  focus, 44px controls, and reduced-motion CSS follow FRONTEND_THEME.md.

## Data provenance and destinations

The original 25 arrows all routed to `/about/barangays`. They did not represent
25 individual profile routes. The existing full directory fetches its data from
the About API; its name-only contract currently does not supply verified
officials or contact details. This change does not promise those details in the
homepage copy or alter that page/API.

The prior homepage list came from `INITIAL_BARANGAYS`, which also contains sample
officials and phone numbers. None of those fields are published in this section.
A separate, homepage-only factual reference avoids changing the shared CMS seed
or other team members' backend work.

- Names: [PSA PSGC — Talibon](https://psa.gov.ph/classification/psgc/barangays/0701243000),
  listing 25 barangays as of 31 July 2025; checked on 4 November 2026.
- Island membership: [ESSC's Talibon Island Barangays Forum report](https://essc.org.ph/content/accompanying-talibon-island-barangays-in-seeking-climate-resilience-pathways-the-talibon-island-barangays-forum/),
  reporting work with Talibon MPDO and the 25 June 2026 forum. Its eight named
  island communities are Busalian, Calituban, Cataban, Guindacpan, Mahanay,
  Nocnocan, Sag, and Suba. Search indexing exposed the report text; a direct
  browser-tool fetch returned a cache miss.
- Mainland membership is inferred as the complement of those eight island
  communities within the PSA's 25-name list. Poblacion remains a separate quick
  filter within Mainland, not a third mutually exclusive geography.

Compared with the homepage's previous seed names, this section now includes
Busalian, Calituban, Cataban, Nocnocan, Rizal, Sag, and Zamora instead of
Cantomimbo, Masacon, Nonoc, San Gregorio, San Juan, Santa Cruz, and Santo Rosario.
The shared seed and full-directory API were preserved; their content alignment
is a separate follow-up.

No officials, phone numbers, population estimates, unofficial seals, precise
barangay boundaries, or current-location assumptions were introduced. Location
filtering supplies the second browsing method; no speculative map was added.

## Files

- `frontend/src/components/BarangaySelector.tsx`: discovery UI and local state.
- `frontend/src/components/BarangaySelector.module.css`: isolated layout/styles.
- `frontend/src/data/barangayDirectory.ts`: sourced names and geographic reference.
- `frontend/test/react/barangays.test.tsx`: preview, expansion, geographic/query
  intersection, diacritic matching, empty state/reset, and honest destinations.
- `frontend/test/browser/barangays.spec.ts`: responsive layout and interactions.
- `docs/BARANGAY_SECTION_REDESIGN.md`: implementation and provenance record.

## Validation

- TypeScript passed.
- Production build passed, retaining the existing bundle-size warning.
- React suite: 61 passed, including four new barangay tests.
- Responsive barangay browser tests: five passed at 320, 375, 768, 1280, and
  1920px. They verify row-first order, column counts, no section overflow,
  filters, search, reset, expansion/collapse, link destination, keyboard focus,
  reduced-motion behavior, and minimum button height.
- Existing social/location browser checks: two passed at 375 and 1440px.
- Final section screenshots visually reviewed. Cropped artifacts hide the fixed
  header only during capture to prevent it from covering the section image.
- A phase-start hash comparison confirmed that BarangaySelector.tsx is the
  only pre-existing source/document/asset file changed. All other edits in this
  pass are the new files listed above; prior worktree changes were retained.

Browser service requests were mocked or blocked. These results validate local
discovery behavior, not live directory data, source-site uptime, or content-owner
approval. No backend, API, routing, authentication, deployment, or dependency
change was made.

## Solid-blue follow-up — 4 November 2026

The user authorized a local styling update to this section only. Cards, search
and inactive chips now use white fills with soft shadows on sky-50; thin borders
are removed. Badges are 56px sky-600 squares with bold 24px white letters. Cards
tint sky-100 and lift 2px on hover, with all transitions/lift disabled for reduced
motion. Typography uses slate-900/800/700 and sky-900, with a sentence-case label.
The grid is one column below 640px, two from 640px and four from 1024px. The
toolbar stacks below desktop; its full-directory action aligns right on desktop.

Accessibility adjustment: white on sky-600 measures **4.02:1**, which fails AA
for the small control labels. Active chips and the browse/reset buttons therefore
use sky-700 (**5.86:1**) with white text; count badges and the directory button use
sky-800 (**7.51:1**). The 24px bold badge letters qualify as large text and pass
their 3:1 threshold on sky-600. Sky-900 text measures 9.48:1 on white and 8.24:1
on sky-100; slate-900 on white is 17.83:1 and slate-700 on sky-50 is 9.72:1.
Existing Tailwind color tokens are reused without changing global/CMS tokens or
the quick-links strip. These contrast values describe the measured sRGB rendering.

Each card is now a keyboard-accessible link to the **existing full directory**,
`/about/barangays`, with its name and type as its accessible name. There are no
invented individual barangay routes. The filter fieldset explicitly references
its visible legend. Live result announcements, hidden decorative icons/letters,
the search ring and 2px/2px-offset sky-800 action focus outlines are retained or
strengthened. All 25 source records, A–Z sorting, initial eight-card preview,
instant search, filter totals (25/1/17/8), expansion/reset behavior, Poblacion’s
Mainland note and PSA link remain intact. The data module is unchanged.

Changed files: `frontend/src/components/BarangaySelector.tsx`, its existing
`BarangaySelector.module.css`, `frontend/test/react/barangays.test.tsx`,
`frontend/test/browser/barangays.spec.ts`, and this document. Only those two
component files changed among existing source files. No dependencies, APIs,
backend, other sections or deployment settings changed; nothing was deployed.

Matching before/after captures at 360, 768, 1280 and 1920px were reviewed with no
section/document overflow. The self-contained local review page is
`frontend/node_modules/.cache/talweb-barangay-blue/comparison.html`; matching PNGs
and measurements are alongside it. The cropped images hide the fixed header
only during capture. Mobile is intentionally taller because the requested grid
now stacks into one column while retaining all eight preview cards.

Validation passed: TypeScript/build, 21 Node tests, 66 React tests, and 87 browser
tests across all frontend configurations (43 default, 12 admin, 22 EServices,
10 contracts).
Barangay browser checks additionally cover 320/375px, keyboard traversal from
search through chips/directory/cards, focus, hover, reduced motion and contrast.
Early assertions were corrected for equivalent CSS color serialization and
test-only smooth-scroll timing. An unrelated About contract timeout passed on
retry without product/test-timeout changes. Browser checks use fixtures; live
directory records and external PSA availability are not established by this pass.

Protected viewport comparisons were pixel-identical at 360, 768 and 1280px.
At 1920px, the only difference was 604 pixels inside the header’s live date/time
text (x1585–1706, y13–20); protected source files retain their original hashes.
