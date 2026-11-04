# Our Story / Heritage & Progress refinement - 4 November 2026

This layout refinement supersedes the earlier color-only record. Scope is the
Our Story component; the custom homepage hero, navigation and global styles are
unchanged. The existing Electronic Services and Emergency Hotlines refinements
remain separate local work on `ui-changes-continue`. Nothing is deployed.

## Changed files

- `frontend/src/components/About.tsx`
- `frontend/src/components/About.module.css`
- `frontend/public/images/heritage-coast.jpg`
- `frontend/public/images/mayor-janette.webp`
- `frontend/test/react/our-story.test.tsx`
- `frontend/test/browser/our-story.spec.ts`
- `docs/OUR_STORY_THEME_REFINEMENT.md`

## Result

The desktop grid uses three columns, with story content spanning two columns and
vertically centered alongside the mayor card. Mobile stacks the mayor below the
Vision and Mission cards. The heading is 36px below 640px and 48px above, with an
18px introduction and a sentence-case label. Vision and Mission use dl/dt/dd,
44px solid-blue icon squares, 20px titles and translucent white 15% cards.

The existing coastal photo is now a lazy-loaded decorative img with object-cover.
Mobile uses a 75% slate-950 overlay. Desktop uses 90% left, 70% middle and 10%
right: the middle was increased from 60% after real-photo testing found a 4.34:1
Mission-text contrast at 1920px. The mayor glass card includes a local dark scrim
to keep white text legible on the lightly shaded sea. This leaves the rest of the
right-hand scenery visible.

The history button and mayor badge use the brand deep-blue token (#00598A) with
white text, rather than primary blue (#0084D1), because primary blue/white is only
4.02:1 for small text. Icon squares and the portrait ring use primary blue. The
history link has a 2px white focus outline, offset 2px, a 48px touch target and
reduced-motion support.

All story, Vision, Mission, mayor name and title copy is preserved, along with
`/about/history`. No Message from the Mayor button is added: `/about/mayor`
redirects to a historical list, not a mayor-message page. The displayed name
**Hon. Janette Aurestila-Garcia** and title must be verified against the current
officeholder by the LGU; they have not been changed or independently verified.

## Photos and provenance

Both assets retain the exact original downloaded image bytes; there is no generated
portrait or identity alteration. A CSS face crop within the 144px circle excludes
the seal and embedded lettering from the existing portrait. The circle has a white
backing and a 4px primary-blue ring.

- Coastal JPEG: 2000 x 1330, 318,360 bytes (311 KiB), already compressed at the
  original w=2000/q=80 URL. This is a suitably bounded full-width asset.
- Mayor WebP: 818 x 900, 125,766 bytes (123 KiB), lazy-loaded.

Original source URLs:

- https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2000&q=80
- https://talibon.gov.ph/wp-content/themes/yootheme/cache/28/MUNICIPAL-Mayoe2-28d8fb46.webp

The local copies avoid live hotlink failures. Browser tests load these real image
bytes; unrelated API responses are synthetic and external services are blocked.
The retained coastal image is the existing stock photograph, not newly verified
photography of Talibon.

## Validation and before/after captures

TypeScript, production build, 21 Node tests, 72 React tests, all 57 public browser
tests and all 23 e-services browser regressions pass. The existing large-bundle
warning remains. Windows fork
workers stalled during a React run; the complete suite passed with a single
thread worker and no test behavior or timeout changes. Source checks confirm no
hero, header, navigation, shared token, API or backend edits for this task.

Real-photo pixel sampling passes AA for every text line at each requested width:
minimum ratios are 6.96:1 at 360px, 6.55:1 at 768px, 5.89:1 at 1280px and 5.01:1
at 1920px. The 14px history-label and mayor-badge white text uses deep blue for
7.51:1 contrast. Keyboard focus, reduced motion, stacking and document overflow
checks pass. Photo bytes match the original downloads by SHA-256.

| Width | Before | After |
| --- | --- | --- |
| 360px | [Before](../frontend/node_modules/.cache/talweb-story-review/before-360.png) | [After](../frontend/node_modules/.cache/talweb-story-review/after-360.png) |
| 768px | [Before](../frontend/node_modules/.cache/talweb-story-review/before-768.png) | [After](../frontend/node_modules/.cache/talweb-story-review/after-768.png) |
| 1280px | [Before](../frontend/node_modules/.cache/talweb-story-review/before-1280.png) | [After](../frontend/node_modules/.cache/talweb-story-review/after-1280.png) |
| 1920px | [Before](../frontend/node_modules/.cache/talweb-story-review/before-1920.png) | [After](../frontend/node_modules/.cache/talweb-story-review/after-1920.png) |

Captures and contrast measurements are local ignored artifacts. Text-background
sampling hides text and the fixed header only during the review capture; these
styles are not shipped. Production text is compared against every pixel beneath
its rendered line boxes in the actual photo at each requested width.
