# Solid-blue theme and protected-hero audit - 4 November 2026

Authority: FRONTEND_THEME.md and the user's updated solid-blue/protected-hero
instruction. The task-start workspace already contained prior refinements;
those edits were preserved. Comparisons use a task-start snapshot, not Git HEAD.

## Outcome and scope

- Primary `#0084D1`; deep `#00598A`; light background `#F0F9FF`; white cards;
  near-black main text. Existing scoped tokens are adapted through the new
  opt-in `SolidTheme.module.css`. Global variables and app/hero/header ancestors
  are untouched. No old #86D7FA/#B7E7FC palette remains in active scoped CSS.
- Homepage content: weather accents, quick links, news/events/ORTS, Our Story,
  service navigator/popular services, barangays, municipal offices, services,
  Charter, transparency, tourism, social updates, location and emergency accents.
- Existing information/content roots, services/news/search/detail shells,
  organization/resolutions/tourism-map pages, auth and dashboard-preview roots
  inherit the updated existing SectionTheme adapter. No auth/admin logic changed.
- Six standalone pages: EServices, Downloadables, Citizen Charter, Privacy Policy,
  Full Disclosure and Enacted Ordinances retain their approved layouts/features.
- Footer contact, hotline and government-link columns opt in individually. The
  footer brand/seal/wordmark/social block remains outside the theme.
- Pale gradient card accents become solid accents. Small white-text actions use
  deep blue for AA contrast. Normal/hover icon fills use the primary/deep pair;
  existing group-hover PDF icons switch to white on deep-blue fills.
- No content, routes, URLs, APIs, queries, state, data modules, dependencies,
  backend/database files, media assets, layout dimensions or animation logic changed.
  No deployment, commit or push.

## Exact files modified/added

- `docs/FRONTEND_SOLID_BLUE_AUDIT.md`
- `docs/FRONTEND_THEME.md`
- `frontend/src/components/About.module.css`
- `frontend/src/components/About.tsx`
- `frontend/src/components/BarangaySelector.module.css`
- `frontend/src/components/CitizensCharterSection.module.css`
- `frontend/src/components/CompactSections.module.css`
- `frontend/src/components/EmergencyHotlines.tsx`
- `frontend/src/components/Footer.tsx`
- `frontend/src/components/GadImsSystem.tsx`
- `frontend/src/components/LguEventsSection.tsx`
- `frontend/src/components/Location.tsx`
- `frontend/src/components/MunicipalOffices.tsx`
- `frontend/src/components/NewsTodaySection.tsx`
- `frontend/src/components/OrtsUpdatesSection.tsx`
- `frontend/src/components/PopularServices.tsx`
- `frontend/src/components/QuickAccess.module.css`
- `frontend/src/components/ServiceNavigator.tsx`
- `frontend/src/components/Services.tsx`
- `frontend/src/components/SocialMediaUpdates.tsx`
- `frontend/src/components/Tourism.tsx`
- `frontend/src/components/TransparencyGovernance.tsx`
- `frontend/src/components/WeatherWidget.tsx`
- `frontend/src/pages/CitizenCharterPage.module.css`
- `frontend/src/pages/DownloadsPage.module.css`
- `frontend/src/pages/EServicesPage.module.css`
- `frontend/src/pages/EnactedOrdinancesPage.module.css`
- `frontend/src/pages/FullDisclosurePage.module.css`
- `frontend/src/pages/PrivacyPolicyPage.module.css`
- `frontend/src/styles/SectionTheme.module.css`
- `frontend/src/styles/SolidTheme.module.css`

## Protected component evidence

Hero.tsx, Navbar.tsx, Home.tsx, layout roots, index.css, tokens.css and constants
retain their task-start SHA-256 hashes. No theme class is attached to an ancestor
of the hero/header. Their runtime token scope remains separate.

| Width | Hero changed pixels | Header/navigation changed pixels |
| --- | --- | --- |
| 375px | 0 | 0 |
| 768px | 0 | 0 |
| 1280px | 0 | 0 |
| 1440px | 0 | 0 |

Both regions were captured separately before/after with the same Edge browser,
viewport, fixed date/time, settled animations and API/media fixtures. The fixed
clock avoids treating the protected live clock as a theme regression. All eight
comparisons are pixel-identical. No protected offending changes required rollback.

## Responsive/content evidence

104 measured section/page states per phase cover the homepage and ten standalone
routes across 375, 768, 1280 and 1440px. All retain their text and link destinations;
none has document-level horizontal overflow. Representative homepage, mobile and
desktop page screenshots were reviewed. Four final GAD chart captures additionally verify its palette-only
changes. Existing uneven content heights and
animation sequencing were not redesigned for palette consistency.

The source diff for TSX adds only scoped style hooks or changes decorative CSS
class names. API hooks, handlers, route values, copy, images, officials and phone
numbers remain as they were; this work does not verify their accuracy.

## Validation

- TypeScript passed.
- Production build passed; existing large-bundle warning remains.
- Existing Node suite: 21 passed (run directly with Node after the restricted npm
  wrapper failed to read an environment path; no product fix was needed).
- Existing React suite: 67 passed with a single-worker run.
- Existing browser suites: 88 passed (44 default, 10 contracts, 12 admin,
  22 EServices). Dedicated scope/hover checks passed: no palette tokens reach
  the hero, header, body or footer branding; the PDF hover is white on deep blue.
- Four additional GAD chart viewport checks passed at 375/768/1280/1440px;
  categories/values are unchanged, palette fills are exact and dark outlines
  keep the light segments and legend dots visible. No overflow was detected.
- Focus, hover, keyboard interaction, search/filter counts, empty states, dialogs,
  map controls and reduced motion retain existing automated coverage.
- White/primary is about 4.02:1: appropriate for non-text icons or qualifying large
  type, not small text. White/deep is about 7.51:1. Deep/light background is about
  7.05:1. Existing rendered contrast tests validate labels and active controls.
- Whitespace and preservation checks passed.

## Intentional differences and limits

Protected hero/header/footer branding retain original gold/other colors. Dark
photo scrims, content imagery/maps and meaningful weather/emergency, success,
warning, error, destructive and disabled indicators retain their own colors.
These are deliberate exceptions, not remaining pale-gradient theme leakage.
Footer branding controls stay outside the palette scope. Map artwork retains its
existing marker color; the mapping service, coordinates and data were preserved.

Visual checks use synthetic API data, neutral image fixtures, blocked remote
video/fonts and a fixed clock. Pixel identity is established under those matching
conditions; live media loading, live records, external destinations and every
possible state were not revalidated. Existing missing destination photos remain
separate asset work. No images or PDFs were substituted in product code.

Review artifacts, source snapshots, 208 state measurements, PNGs and pixel results
are local under ignored `frontend/node_modules/.cache/talweb-solid-theme/`.
