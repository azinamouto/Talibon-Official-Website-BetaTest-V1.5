# Connect with Talibon - social and location redesign

Local work on `ui-changes-continue`, 4 November 2026. This supersedes the separate
social/location layout. No commit, push, deployment, backend/API or credential
change is part of this task. Existing uncommitted refinements are preserved.

## Changed files

- `frontend/src/components/ConnectWithTalibon.tsx`: unified labelled section.
- `frontend/src/components/ConnectWithTalibon.module.css`: scoped layout, colors,
  responsive map panel, focus and reduced-motion styles.
- `frontend/src/components/SocialMediaUpdates.tsx`: featured fallback card,
  cached previews and six grouped office rows.
- `frontend/src/components/Location.tsx`: preview map, info panel and map actions.
- `frontend/src/pages/Home.tsx`: compose the two sections into the unified one.
- `frontend/public/images/facebook-supplied.jpg`: the user's decoded JPEG,
  225 x 138 pixels and 2,285 bytes; the image itself is unchanged.
- `frontend/test/react/connect-talibon.test.tsx` and
  `frontend/test/react/homepage-sections.test.tsx`.
- `frontend/test/browser/connect-talibon.spec.ts` and
  `frontend/test/browser/homepage-sections.spec.ts`.
- `docs/SOCIAL_LOCATION_REDESIGN.md`.

## Layout and behavior

The fluid container retains the established site gutters. Below 1024px, the
Information Office and More Talibon pages cards precede the map and its normal-flow
information panel. From 1024px the grid is 2/5 social, 3/5 map. The map fills the
right card, with a 36rem minimum height, a top-left 22rem information panel and
attribution kept clear. Mobile map height is 288px.

The supplied Facebook JPEG is used in the featured icon tile, Follow on Facebook
button and Abante Talibon row. Other glyphs use Lucide. Six 56px office rows retain
their existing URLs and names under Official, Public safety and Community.
Existing generic municipal Facebook destinations are retained as-is.

The cache/state/fetch block is byte-identical to the prior implementation:
`data/social-updates.json`, parseSocialCache, signal cancellation, timeout, date
formatting and credentials are unchanged. Available posts render inside the
Information Office card beneath its button. Text-only posts have no empty image
placeholder. Empty/error states retain the featured card and working Facebook
action, with the existing status wording available to screen readers rather than
an unavailable banner. No fake posts are added.

The existing `social-updates` and `location` IDs remain valid navigation anchors.
The address, unverified hours wording, contact route, 114.8km distance and
140.46km2 area are retained. Coordinates and the separate stats strip are removed
from the visible layout. No phone numbers or data sources are modified.

## Map decision and limitations

The user explicitly chose **Keep existing embed; preserve credentials**.

The existing muted local SVG is therefore the default preview, with its existing
single Municipal Hall pin and OpenStreetMap attribution. Tap to explore loads the
same Google iframe URL and Municipal Hall query. The old Close map overlay is
removed. Open in Maps and Get directions live in the information panel; directions
retain the exact Municipal Hall destination, not a generic town-center target.
No Google request is made before the tap. The iframe has a descriptive title and
is excluded from tab order; the external map/directions actions remain keyboard
accessible. No overlay covers the live iframe's bottom-corner attribution.

An embedded Google iframe does not expose its internal POI styles, duplicate
provider markers, zoom-only controls or gestureHandling options to the parent
application. These live-map internals remain provider-controlled under the user's
chosen approach. There are no fake query options or CSS filters that hide provider
credits. A future approved Maps JavaScript API setup would be needed to implement
those advanced controls; with a Map ID, styling belongs in Google Cloud.

Primary references: [Google map controls](https://developers.google.com/maps/documentation/javascript/controls)
and [gesture handling](https://developers.google.com/maps/documentation/javascript/interaction).

## Accessibility and validation

White cards, brand light background (#F0F9FF), primary-blue icon squares (#0084D1)
and deep-blue buttons (#00598A) reuse the scoped theme tokens. Small text is
slate-700 or darker. All controls have 2px deep-blue focus outlines with 2px offset;
external links announce their new-tab behavior and use noopener noreferrer.
Decorative icons and the Facebook image are hidden from assistive technology.
Reduced-motion preferences disable transitions.

TypeScript, the production build, 21 Node tests, 74 React tests, all 61 public
browser tests and all 23 e-services browser regressions pass. The existing
large-bundle warning remains. Checks cover cached
previews, empty/error fallback, all four requested widths, supplied image loading,
the 2:3 desktop grid, mobile stacking, minimum map height, unoccluded static
attribution, correct directions URL and keyboard map activation. Every link and
button has its focus outline checked at every requested width. Normal UI text
contrast is at least 7.05:1; deep blue on the light hover fill is 6.21:1 and dark
blue on the light chip fill is 13.02:1. White on deep blue is 7.51:1. Primary-blue
icon tiles have 4.02:1 icon contrast. Google requests are intercepted with an
iframe fixture: this is not a live provider-service verification. Physical-phone
directions testing is not available here and remains outstanding.

A source hash comparison identifies only Home.tsx, SocialMediaUpdates.tsx and
Location.tsx changed among 206 pre-existing source files. The other 203 source
files, including the hero, header, branding, completed sections, cache parser,
authentication and API services, retain their exact bytes. The two new source
files are the wrapper component and its CSS module.

## Local before/after gallery

These review artifacts are ignored and are not deployed.

| Width | Before: social | Before: location | After: combined |
| --- | --- | --- | --- |
| 360px | [Social](../frontend/node_modules/.cache/connect-talibon/before-social-updates-360.png) | [Location](../frontend/node_modules/.cache/connect-talibon/before-location-360.png) | [Combined](../frontend/node_modules/.cache/connect-talibon/after-360.png) |
| 768px | [Social](../frontend/node_modules/.cache/connect-talibon/before-social-updates-768.png) | [Location](../frontend/node_modules/.cache/connect-talibon/before-location-768.png) | [Combined](../frontend/node_modules/.cache/connect-talibon/after-768.png) |
| 1280px | [Social](../frontend/node_modules/.cache/connect-talibon/before-social-updates-1280.png) | [Location](../frontend/node_modules/.cache/connect-talibon/before-location-1280.png) | [Combined](../frontend/node_modules/.cache/connect-talibon/after-1280.png) |
| 1920px | [Social](../frontend/node_modules/.cache/connect-talibon/before-social-updates-1920.png) | [Location](../frontend/node_modules/.cache/connect-talibon/before-location-1920.png) | [Combined](../frontend/node_modules/.cache/connect-talibon/after-1920.png) |

## More Talibon pages disclosure - 4 November 2026

This local refinement changes only the secondary pages card. It starts closed;
one full-width native button exposes its expanded state and controls a generated
unique panel id. Enter, Space or a click toggle it. The isolated component accepts
an optional defaultOpen prop, stores no preference and does not close on link clicks.
The six existing names, order and Facebook URLs are preserved. Group headings are
removed. The Information Office featured card, cache behavior, map and all other
section sources/styles remain unchanged.

The card uses white, #F0F9FF, primary-blue icon tiles and deep-blue controls from
the existing scoped tokens. The six 48px rows form one column below 640px and two
above it. Names ellipsize visually while retaining the full accessible name and
new-tab announcement. All links retain target=_blank and rel=noopener noreferrer.
The Abante entry uses the existing library's Facebook glyph; the featured card's
supplied Facebook image is untouched. The 200ms grid-row/chevron transitions are
disabled for reduced motion. Closed content has visibility:hidden, inert and
tabIndex=-1 on its links, so it is excluded from keyboard and screen-reader access.

Exact files for this refinement:

- `frontend/src/components/SocialMediaUpdates.tsx`
- `frontend/src/components/MoreTalibonPages.tsx` (new)
- `frontend/src/components/MoreTalibonPages.module.css` (new)
- `frontend/test/react/more-talibon-pages.test.tsx` (new)
- `frontend/test/react/connect-talibon.test.tsx`
- `frontend/test/react/homepage-sections.test.tsx`
- `frontend/test/browser/more-talibon-pages.spec.ts` (new)
- `frontend/test/browser/connect-talibon.spec.ts`
- `docs/SOCIAL_LOCATION_REDESIGN.md` (this note)

Local before/after captures (ignored review artifacts, not deployed):

| Width | Before | Closed | Open |
| --- | --- | --- | --- |
| 360px | [Before](../frontend/node_modules/.cache/more-talibon-pages/before-360.png) | [Closed](../frontend/node_modules/.cache/more-talibon-pages/after-closed-360.png) | [Open](../frontend/node_modules/.cache/more-talibon-pages/after-open-360.png) |
| 768px | [Before](../frontend/node_modules/.cache/more-talibon-pages/before-768.png) | [Closed](../frontend/node_modules/.cache/more-talibon-pages/after-closed-768.png) | [Open](../frontend/node_modules/.cache/more-talibon-pages/after-open-768.png) |
| 1280px | [Before](../frontend/node_modules/.cache/more-talibon-pages/before-1280.png) | [Closed](../frontend/node_modules/.cache/more-talibon-pages/after-closed-1280.png) | [Open](../frontend/node_modules/.cache/more-talibon-pages/after-open-1280.png) |
| 1920px | [Before](../frontend/node_modules/.cache/more-talibon-pages/before-1920.png) | [Closed](../frontend/node_modules/.cache/more-talibon-pages/after-closed-1920.png) | [Open](../frontend/node_modules/.cache/more-talibon-pages/after-open-1920.png) |

Contrast: white/deep blue 7.51:1, deep blue/white 7.51:1, slate-700/white
10.35:1; white/primary-blue icons 4.02:1, exceeding the 3:1 non-text minimum.
Validation: TypeScript, production build and all 21 Node tests pass. The full
React run covered 77 tests: 76 passed initially; an unrelated assistant keyboard
test exceeded its 5s limit under concurrent build/browser load. Its unchanged
32-test file passed on isolated rerun (the keyboard test completed in 2.08s).
All 77 React checks are therefore covered successfully without relaxing timeouts.

The full public browser run covered 73 tests. All new disclosure checks passed
at 360, 768, 1280 and 1920px. Four existing Connect keyboard checks needed their
test setup to enter keyboard modality after the new mouse toggle click; another
test encountered a Vite navigation interruption. All five passed on rerun after
the setup correction. All 73 checks are covered successfully. Existing main
hero/header pixel audits remain unchanged; featured-card pixels match at all
four widths. Map dimensions are unchanged and its screenshots were reviewed.

Additional live-DOM checks confirm a 200ms normal transition, 0ms with reduced
motion, zero collapsed panel height, and visible ellipsis with a full accessible
name for a deliberately long label. Open/closed captures were visually reviewed
at all four requested widths. The existing large-bundle build warning remains.

SHA-256 comparison of 210 pre-task source files finds only SocialMediaUpdates.tsx
changed; its featured-card/cache markup is retained. The isolated component and
CSS module are the only new product sources. Shared styles, map source, theme
tokens, hero, navigation, branding and all other existing sources match exactly.
The map naturally moves upward below the collapsed card on mobile; its source,
dimensions and content are unchanged. Fixture screenshots are not live map checks.
Nothing is deployed or published.
