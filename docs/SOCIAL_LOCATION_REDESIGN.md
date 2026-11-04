# Social updates and location refinement

Local implementation on `preview/homepage-refinements`, starting SHA
`2f5dd57f08e4b60f8a17aa03d6dd9853ae61e606`. Existing uncommitted frontend
refinements were retained. No commit, push, deployment, migration or secret
configuration was performed.

## Behavior

- Homepage social updates read the same-origin `data/social-updates.json` cache.
  Up to three posts appear newest first, with locally cached images, dates and
  Facebook permalinks. Text posts have a compact heading instead of a blank
  image placeholder. Loading, empty and request-failure states remain compact.
- No Facebook iframe, SDK or Meta image requests are made by this section.
  Offices use their existing destinations, grouped into Official, Public safety
  and Community. There is one primary Follow on Facebook action.
- Location uses a locally hosted SVG street map with a Municipal Hall pin and
  visible OpenStreetMap attribution. Google Maps loads only on activation and
  can be closed. Directions use the named Municipal Hall destination.
- The address, office-hours contact link and municipality facts share the map
  panel. Mobile stacks the map above the information. White and light-gray
  sections alternate, with reduced padding.

## Activating real post previews

Configure repository variables `FACEBOOK_PAGE_ID` (the verified Information
Office Page ID) and `FACEBOOK_GRAPH_API_VERSION` (a currently supported version).
Store the authorized Page token in repository secret
`FACEBOOK_PAGE_ACCESS_TOKEN`. Never put it in a Vite variable or public JSON.
The token needs the Page read access approved for the relevant Meta app/Page.
Provider permissions and the live API response have not been verified here.

Set repository variable `SOCIAL_PREVIEWS_ENABLED=true` only after access and
publication of this public content are approved. The workflow runs every six
hours at minute 17 UTC, and supports manual dispatch. It requests Page posts,
caches images from Facebook's CDN locally, validates links and dates, and
atomically replaces the JSON only after successful processing. Failure retains
the previous cache. Unchanged content does not create a new commit.

The workflow commits only the public cache and image directory. Branch
protections must allow this bot or the operator must use a reviewed alternative.
Old images are retained to avoid breaking existing deployed versions; prune
unused assets during a deliberate maintenance pass.

**A cache refresh commit does not deploy the site.** This repository's production
release workflow is manual and requires release evidence. The latest committed
cache is included on the next authorized release. To update deployed previews
every six hours independently, the hosting owner must approve and connect a
cache publication path; no production-release gate has been bypassed here.

For a local refresh, supply the three Facebook variables through the process
environment and run `node ops/refresh-social-updates.mjs`. Missing credentials
leave the current cache untouched. The checked-in initial cache is deliberately
empty; no sample posts are published as municipal announcements.

Reference: https://developers.facebook.com/docs/pages-api/posts/ (documentation
fetch returned HTTP 429 during this task; real provider qualification remains
required).

## Content provenance and remaining verification

- Address: retained from the existing public footer. Owner: municipal content
  team; current content-owner signoff remains pending.
- Municipality coordinates, land area and Tagbilaran distance: retained from the
  existing Location section and user request, without claiming new verification.
  Coordinates are labeled municipality coordinates, distinct from the Hall pin.
- Hours: existing code contains default/seed hours. These were not promoted to
  verified visiting hours. The UI directs visitors to the municipal directory
  to confirm before visiting. Replace this with confirmed hours when provided.
- Office links: six existing destinations point to the same municipal Facebook
  page. Preserved pending verified office-specific URLs; the icons are functional
  category icons, not fabricated office logos.
- Map: OpenStreetMap API geometry retrieved 2026-11-04 from
  `https://www.openstreetmap.org/api/0.6/map?bbox=124.30,10.135,124.345,10.17`.
  SVG uses actual coastline and street geometry, simplified colors and sparse
  feature labels. Pin: centroid of building way `242255020`, approximately
  `10.1503385,124.3273241`. Map owner/source: OpenStreetMap contributors, ODbL,
  https://www.openstreetmap.org/copyright. This community map is not an official
  cadastral or surveyed map. No OSM raster tiles or external map requests are
  needed to display it.

## Local verification

- `npm.cmd --prefix frontend run lint`: passed (TypeScript).
- `npm.cmd --prefix frontend run build`: passed; existing bundle-size warning.
- `npm.cmd --prefix frontend test`: 21 passed.
- `npm.cmd --prefix frontend run test:react`: 57 passed, including five new
  cache, fallback and map-activation checks.
- `npm.cmd --prefix frontend run test:browser -- homepage-sections.spec.ts`:
  two passed in local Edge, at 375px and 1440px; mocked public APIs/social
  records, third-party requests blocked. Screenshots visually inspected.
- `node --test ops/test/social-updates.test.mjs`: three passed, including
  image caching, secret placement and preservation after provider failure.
- `git diff --check`: passed.

Initial sandbox runs failed because esbuild could not read ancestor directories;
the successful runs used the required Windows process access. The full browser
suite, real Facebook synchronization, real Google iframe service, hosted
deployment and municipal content-owner signoff were not verified.

No database/API contract changed. Rollback consists of restoring the two UI
components to their prior local versions and removing the new cache assets,
helper, tests and disabled workflow. Unrelated worktree edits must be preserved.
