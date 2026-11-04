# Homepage Citizen’s Charter section

Scope: the user explicitly requested a task-first redesign of the homepage
`CitizensCharterSection`. This authorization applies to this section only. The
standalone completed Citizen Charter page, other completed sections, hero,
navigation, shared theme tokens, routes, API integrations and other homepage
sections were preserved.

## Behavior

- Six task shortcuts: four open verified sections of the official PDF; tax
  declaration and burial lot filter the office cards and move focus to results.
- Instant search matches the displayed service previews, full office names,
  acronyms and a small set of local keywords. It does not search the entire PDF
  or claim to query the live API service catalog.
- All existing 18 offices remain, plus the PDF-verified Business Permits & Licensing
  Office (BPLO), in four purpose groups. Internal/legislative
  offices start collapsed; searching reveals matches in this group automatically.
- Cards show two service previews and explicitly identify a PDF or office-contact
  destination. Unverified service counts have been removed.
- Three desktop columns, two tablet columns, one mobile column; existing site
  gutters, white cards, charcoal text and sky-blue controls. CSS is scoped in a
  module. No dependencies or global styles changed.

## Source verification, 4 November 2026

[Official municipal charter PDF](https://talibon.gov.ph/wp-content/uploads/2026/02/2025-CITIZENS-CHARTER-FINALE.pdf)
returned HTTP 200 and `application/pdf`, with 7,007,526 bytes (7.0 MB), 235 pages.
SHA-256: `34a07ae21a53d872c26311406854fe536f3885b7f87b5f7861563c53379dfb71`.

The cover was inspected. It does not establish a 2026 edition; the filename says
2025. The UI therefore uses “Citizen’s Charter” without an edition claim.
The source-check date is explicitly a link/file-size check, not a content revision
date. The server’s Last-Modified header is not presented as an editorial update.

Verified physical PDF page anchors (distinct from printed page numbers):

| Destination | Physical page |
| --- | --- |
| Agriculture office guide | 10 |
| Engineering office guide | 97 |
| Building permit | 102 |
| Civil registry office guide | 106 |
| Local birth, marriage and death certificate issuance | 121 |
| General medical consultation | 129 |
| Business permit / BPLO | 215 |

The business-permit shortcut goes directly to BPLO in the PDF, rather than
assuming a service route or assigning the task to the Treasurer. BPLO also has
its own card so searching “business permit” identifies the correct office. The existing
API-driven service detail page and older static service records are different
data sources; no new service routes were invented. A PDF viewer may ignore page
fragments; the full official document remains available through the same link.

Tourism, Cemetery and SB PDF coverage was not established. These cards use the
existing `/executive/directory` contact route. Other cards without a verified
page anchor explicitly say “Browse full charter (PDF)”. Preview topics largely
come from the pre-existing section; requirements, fees, processing times and
contact details have not been invented or duplicated.

## Validation

- TypeScript and production build passed; the existing large-bundle warning remains.
- React suite: 65 tests passed, including service keyword/acronym search, internal
  results, task destinations, empty state and reset.
- Browser checks: 12 passed across this section, barangays, social updates and
  location. Charter checked at 320, 375, 768, 1280 and 1920 pixels for responsive
  columns, overflow, filtering, internal disclosure and keyboard focus.
- Mobile/desktop section screenshots reviewed. Test screenshots hide the existing
  fixed site header only for the cropped artifact.
- Existing-file SHA-256 comparison against the task-start snapshot identified
  only `frontend/src/components/CitizensCharterSection.tsx` as changed.

Browser checks use API fixtures and block external navigation. The official PDF
was retrieved independently, but live API office contacts and end-to-end external
PDF viewer behavior remain unverified. Source-check date, PDF size and page
anchors should be reviewed when the municipality replaces the document.

## Solid-blue intro follow-up — 4 November 2026

Local only; no deployment. The heading/search/download/task area now has its
own sky-50 panel, borderless white controls/cards with soft shadows, and six
distinct 28px Lucide icons in 56px sky-600 squares. Cards tint sky-100 and lift
2px, with sky-700 icon hover states and no transitions/lift under reduced motion.
PDF guides announce “(opens in a new tab)” and retain their existing targets,
paths, page fragments and safe rel attributes. The two office task buttons retain
their original query/focus actions. Search content, placeholder and filtering
are unchanged. The download button uses sky-800 with a sky-900 size badge.

The new scoped `frontend/src/components/CharterIntro.module.css` styles only
the top panel, attached in `CitizensCharterSection.tsx`. The office-grid stylesheet
`CitizensCharterSection.module.css`, OfficeCard rendering, data module, links,
search algorithm and lower grid remain unchanged. At all four requested widths,
representative office-card computed styles/dimensions exactly match the baseline.
Screenshot pixels can differ from fractional crop positions; pixel identity of
office-grid screenshots is not claimed.

Updated tests: `frontend/test/react/charter-section.test.tsx` and
`frontend/test/browser/charter-section.spec.ts`. Coverage includes distinct hidden
icons, PDF semantics, keyboard order through search/download/all six tasks,
focus outlines, hover/reduced motion, 48px input height, responsive 1/2/3 task
columns and preserved office search/disclosure behavior. The toolbar stacks
below 1024px and shares a row from 1024px. No other source sections, dependencies,
API integrations or routes changed. This document records the refinement.

Contrast measurements: white icons on sky-600 4.02:1 (passes 3:1 non-text);
white button text on sky-800 7.51:1; slate-900/white 17.83:1; slate-700/sky-50
9.72:1; sky-900/white 9.48:1 and sky-900/sky-100 8.24:1. No small white text is
placed on sky-600. Search uses a sky-600 focus ring plus the requested 2px,
2px-offset sky-800 keyboard outline. Existing Tailwind tokens are reused.

Matching before/after captures at 360, 768, 1280 and 1920px, with office grid
captures and source/style baselines, are stored locally in
`frontend/node_modules/.cache/talweb-charter-blue/`. Open `comparison.html` in
that directory to review all four widths. Mobile and desktop captures were
visually inspected; browser checks also cover 320 and 375px. API responses were
fixtures and external navigation was blocked; live PDF/database availability
was not retested. Nothing was deployed.

Validation results: TypeScript and production build passed (existing bundle-size
warning retained), 21 Node tests and 67 React tests passed, and all 88 distinct
frontend browser cases passed across the default (44), admin (12), EServices
(22) and contract (10) suites. Initial parallel runs timed out in one chatbot
test, three contract cases and the 375px Charter case. The complete React and
contract suites and the affected Charter case passed sequentially, with no
assertion or timeout changes. The dedicated six-width Charter suite also passed.
