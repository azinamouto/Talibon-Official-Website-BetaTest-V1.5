# TALWEB frontend theme reference

## Current official solid-blue direction - 4 November 2026

This specification supersedes the previous pale sky-blue palette for eligible,
non-protected sections. It authorizes color/styling refinements, not new layouts,
content, routes, APIs, data models or business logic.

| Role | Official color |
| --- | --- |
| Primary blue: icon fills, decorative accents, suitable selected elements | `#0084D1` |
| Deep blue: small text links, filled controls, emphasis and focus | `#00598A` |
| Light section background and quiet hover/tint surfaces | `#F0F9FF` |
| Card surface | `#FFFFFF` |
| Main text | Dark charcoal / near-black (`#171717`) |
| Supporting text | Dark charcoal/slate; ensure AA contrast |

Use solid fills and restrained borders/shadows. Do not randomly mix the former
pale gradient into the new solid-blue UI. Existing approved layouts, typography,
spacing, responsive behavior, images, links and animations must be preserved.

### Contrast and states

- White on primary blue is approximately 4:1: suitable for non-text icons and
  qualifying large text, but NOT normal/small text. Use deep blue for small
  white-text buttons and selected controls; it exceeds 7:1 against white.
- Use deep blue for links and focus outlines on white/light-blue surfaces.
- Use primary blue for suitable icons, icon boxes, decorative rules and rings.
- White cards and dark text retain the information hierarchy.
- Hover/active/focus states must remain discernible. Use the same blue family;
  a subtle brightness adjustment, underline, shadow or existing lift is enough.
- Preserve semantic success, warning, error, destructive, disabled and loading
  colors. Weather/emergency indicators are not arbitrary category decorations.
- Preserve dark/photo scrims and white typography where needed for readability.
  These are contrast treatments, not permission to reintroduce pale gradients.
- Respect keyboard focus and reduced-motion preferences.

## ABSOLUTE PROTECTION: custom homepage hero and approved branding

The USER-CUSTOMIZED MAIN HOMEPAGE HERO IS LOCKED. Never change its background,
overlay, colors/gradients, typography/content, buttons/icons, spacing, dimensions,
layout, responsiveness, animations/transitions, functionality or component
structure. Also preserve the approved header/navigation, logos and branding.

Do not edit shared global variables/styles if they could indirectly affect these
protected regions. Do not attach section-theme classes to `Home`, `Hero`,
`Navbar`, `BaseLayout`, the app root, or any ancestor of the hero/header.
Protected gold/other original colors are intentional and must NOT be normalized.

Before applying future theme changes, capture matching hero and header baselines.
Compare them pixel by pixel at 375, 768, 1280 and 1440px under identical fixtures,
clock, viewport, media/animation and browser conditions. Investigate any difference
and revert the offending change. Report fixture/live-media limitations honestly.

## Scoped implementation

`frontend/src/styles/SolidTheme.module.css` provides opt-in section tokens:
`--talweb-primary`, `--talweb-deep`, `--talweb-background`, `--talweb-card`,
`--talweb-text` and `--talweb-muted`. Local aliases adapt existing utilities.
These variables apply only to explicitly opted-in content roots, never globally.
The photo and office-category variants retain their existing compositions.

`SectionTheme.module.css` remains an opt-in adapter for existing information,
service/news, auth and dashboard-preview roots. Completed standalone pages and
modern homepage sections compose the same solid-theme class locally. This latest
instruction permits their theme colors to update; their approved layouts and
features remain protected from unnecessary redesign.

Footer contact/government columns may opt in individually. The footer brand,
seal, wordmark, social/branding block and surrounding branding styles remain
unchanged. Other global navigation, overlays and protected branding stay outside
the opt-in scopes.

## Previous palette - historical only

The earlier reference was `#86D7FA` to `#B7E7FC` (center approximately `#9FDEFB`).
It is no longer the active palette for eligible sections. Older audit/redesign
reports describe their implementation at that time; they do not override this
specification or authorize changing protected original hero/branding styles.

No backend/database changes or deployment are authorized by this theme task.
