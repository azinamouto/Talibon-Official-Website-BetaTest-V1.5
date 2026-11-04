# Sprint 1 frontend foundation

## Electronic services placeholder refinement — 4 November 2026

The homepage `PopularServices` component now presents a centered "Coming soon"
message with two actions: the existing Citizen's Charter route
(`/transparency/charter`) and the unchanged electronic-services information route
(`/e-services`). The dedicated information page remains unchanged. No confirmed
planned-service list was found, so the optional panel and launch dates are omitted;
there is no empty desktop column.

Before: centered heading, "To Be Implemented", and an underlined information link.
After: centered sentence-case heading, availability badge, citizen guidance, and two rounded
buttons. Below 640px the buttons stack; at 768, 1280 and 1920px they wrap naturally
beside each other. No data, backend, global tokens, hero or navigation changes.

`PopularServices.module.css` reuses section-scoped solid-blue tokens for deep
blue (`#00598A`), light fill (`#F0F9FF`) and white surfaces without changing global
CMS-controlled branding. White/deep-blue contrast is approximately 7.5:1;
deep-blue/light-fill is 7.0:1 and slate-700/white is 10.4:1. Links have 48px minimum
height, 2px focus outlines with 2px offset and reduced-motion support.
The message uses 90% opacity for a softer coming-soon appearance and returns to
full opacity while a link has keyboard focus. Composited text retains AA contrast:
approximately 5.96:1 for primary-button text and 7.69:1 for body text.

React coverage checks content, preserved destinations and absent unconfirmed
promises. Playwright coverage targets 360, 768, 1280 and 1920px, link bounds,
keyboard order, focus styling and reduced motion, saving after screenshots.
Restored onto `ui-changes-continue` after the earlier branch switch left this work
in a stash, outside PR #101. TypeScript, production build, 21 Node tests, 71 React
tests and all four targeted browser checks passed. Screenshots were generated at
all four widths under ignored `frontend/test-results/electronic-services-*.png`.
The existing large-bundle build warning remains. Browser checks use synthetic
API responses and blocked external services. Local only; no deployment.

Tickets: S1-FE-02, S1-FE-03, S1-FE-04, S1-FE-05. Integration handoff:
[S1-INT-01](./SUPABASE_ENVIRONMENTS.md).

## Routing and layouts

`frontend/src/App.tsx` defines public routes and a protected staff route group
under `BaseLayout`. Existing URLs are preserved, including `/admin`, `/dashboard`,
`/cms` and `/manage/*`. Anonymous visitors go to `/login`, then return to the
original path, query and hash. Unverified, inactive or unauthorized accounts go to
`/access-denied`. Public content does not wait for auth initialization.

`ProtectedRoute` accepts an optional typed `roles` array. Without it, a verified,
active profile is required. Route checks provide UI behavior only; backend guards
and Supabase RLS remain authoritative. Never grant roles from user metadata or
browser profile writes.

`BaseLayout` owns the existing header/navigation/footer, skip link, offline notice
and global notifications. Route errors use `ErrorPage`, reset on navigation and
retain the layout. A second boundary catches application/provider failures.
Unknown URLs use the existing 404 page. Hosting must rewrite application URLs to
`index.html` (excluding API/static files) for direct links and reloads.

## Context conventions

Provider order: application error boundary → AppConfig → UI → Language → Auth →
Router. Typed hooks are `useAppConfig`, `useUI` and `useAuth`, exported from their
respective files in `frontend/src/contexts/`. All three throw a descriptive error
when used outside their provider.

- Auth owns SDK session, user, database profile, loading/error and recovery state.
- UI owns mobile navigation, connectivity and dismissible notifications. Call
  `notify(message, 'info' | 'success' | 'error')`; notices remain until dismissed.
- AppConfig contains immutable public application metadata (app name and Vite
  environment), with a typed provider override for tests/embedding. No secrets.
- Existing language state remains in LanguageContext.

For a new context: define a typed value; initialize `createContext<T | undefined>`;
export a provider and a guarded `useX` hook. Keep state local unless unrelated
components need it. Keep network operations in services. Stabilize exposed actions
with `useCallback` and provider objects with `useMemo`; clean up subscriptions and
discard stale async results. Add the provider above consumers in `App.tsx`, document
its responsibility here, and test lifecycle/race behavior where applicable.

Example:

```tsx
const { notify } = useUI();
const { appName } = useAppConfig();
const { user, signOut } = useAuth();
```

## Design system

Tailwind 4 uses CSS-first configuration: `src/styles/tokens.css` is imported by
`src/index.css`. A v3 `tailwind.config.js` is unnecessary. Tokens cover semantic
colors, fonts, text sizes/line heights, 4px spacing, panel padding and radii.
Existing brand tokens remain for content styling. Semantic action/text/control
tokens are independent of CMS branding to preserve contrast.

Import base controls from `src/components/ui/<Component>`:

```tsx
<Input label="Email address" type="email" autoComplete="email" required />
<Button type="submit" busy={saving}>Save</Button>
<Card>Content</Card>
<Alert tone="error">Could not save.</Alert>
<Modal open={open} title="Confirm action" onClose={() => setOpen(false)}>
  <Button onClick={confirm}>Confirm</Button>
</Modal>
```

Buttons default to `type="button"`; variants are primary, secondary and danger.
Inputs require a visible label and associate hint/error text via generated IDs.
Modal uses native `showModal()` with inert background, Tab/Shift+Tab containment,
Escape dismissal, scroll lock and focus restoration. Keep one modal open at a
time. Alerts use status/alert live regions. Controls use a visible two-color focus
indicator and at least 44px control height. Do not override token colors without
checking contrast. Existing page styles have not received a full WCAG audit.

## Authentication lifecycle

`observeAuthSession` subscribes before session bootstrap. SDK events update session
state synchronously; database work is deferred outside the auth callback lock.
Generation/request checks reject stale profile results after signout, account
switch or unmount. Profile failures are retryable and never grant access.

Supabase owns persistence, cross-tab synchronization and automatic token refresh.
There is no competing expiry/signout timer or broad local-storage listener.
`TOKEN_REFRESHED` updates the token without clearing the loaded profile. API
consumers should obtain the current SDK session rather than cache an access token.
Database/backend authorization still applies if a loaded profile becomes stale.

Logout uses SDK `scope: 'local'` (this browser session and its tabs, not all devices).
Server failures show an explicit notice based on the SDK's actual local session:
the installed SDK clears local credentials even if server revocation fails. Signup uses email confirmation
and requires administrator approval for staff access. Role assignment and account
verification are server/admin operations. Password recovery is handled on
`/login?type=recovery` and is not redirected away before password update.

References: [Supabase auth events](https://supabase.com/docs/reference/javascript/auth-onauthstatechange),
[Tailwind theme configuration](https://tailwindcss.com/docs/theme).

## Verification

From the repository root:

```sh
npm run lint --prefix frontend
npm run test --prefix frontend
npm run test:browser --prefix frontend
npm run build --prefix frontend
```

The browser suite starts its own Vite server on 127.0.0.1:5174, uses synthetic public
configuration, and intercepts Supabase/API calls. No live account is touched.
Default browser is installed Microsoft Edge. Else install Playwright Chromium and
set `PLAYWRIGHT_CHANNEL=chromium`. Tests cover login return URLs, persistence,
refresh, role denial, recovery, logout/cross-tab behavior, 404/error pages and modal
keyboard behavior. Unit tests cover stale async results, configuration and numeric
AA contrast. Build requires public environment variables as described in the handoff.

Live dev/staging authentication and FE/BE approval remain integration acceptance
steps; mocked browser tests do not certify remote settings, migrations or RLS.

### Verification evidence (2026-10-07)

| Boundary | Result |
| --- | --- |
| TypeScript | `npm run lint`: passed |
| Session races, configuration, token contrast | 13 Node tests passed |
| Browser → Supabase SDK → controlled Auth/profile responses → UI | 10 Edge scenarios passed; logout server-failure case passed after a focused correction/rerun |
| Production bundle | Vite build passed with synthetic local public configuration; existing monolithic app produces a >500 kB chunk warning |
| Real Supabase Auth → deployed database | Pending separate dev/staging provisioning and synthetic test accounts |

The browser checks found and resolved dashboard query reset on reload, modal Tab
wrap into browser chrome, and a mismatch between logout error wording and the
installed SDK's local credential removal. No live data validation is claimed.

## Municipal offices preview refinement - 4 November 2026

Local only; no deployment. The supplied screenshot and written specification are
the visual reference because the linked Claude artifact could not be retrieved.
The centered introduction, four officials in their original order, titles, names,
icons and existing directory route are preserved. The existing Abante Talibon!
label also remains. The faded TALIBON watermark is removed from this section only.

Scoped styling uses #F0F9FF, white 24px-radius cards, 120px primary-to-deep-blue
icon bands, 24px body padding, prominent 20px names, role pills, permanent arrow
tiles and a 52px deep-blue view-all link. The grid is one column below 640px,
two from 640px and four from 1024px. Equal card heights and bottom-aligned roles
allow long titles and names to wrap. Hover/focus lifts by 2px, with a stronger
shadow and darker arrow; reduced motion removes the lift and transitions.

The original office cards were not links and had no individual destinations.
Each whole-card link therefore uses the existing /executive/directory route;
no office-specific URLs were invented. Its accessible name combines the unchanged
office title and official's name. The mayor's pill now says Municipal Mayor;
the other three say Department head. All icons are decorative and hidden from AT.

Exact files for this refinement:

- `frontend/src/components/MunicipalOffices.tsx`
- `frontend/src/components/MunicipalOffices.module.css` (new)
- `frontend/test/react/municipal-offices.test.tsx` (new)
- `frontend/test/browser/municipal-offices.spec.ts` (new)
- `docs/FRONTEND_FOUNDATION.md` (this note)

Before/after screenshots, retained locally in ignored review artifacts:

| Width | Before | After |
| --- | --- | --- |
| 360px | [Before](../frontend/node_modules/.cache/municipal-offices/before-offices-360.png) | [After](../frontend/node_modules/.cache/municipal-offices/after-offices-360.png) |
| 768px | [Before](../frontend/node_modules/.cache/municipal-offices/before-offices-768.png) | [After](../frontend/node_modules/.cache/municipal-offices/after-offices-768.png) |
| 1280px | [Before](../frontend/node_modules/.cache/municipal-offices/before-offices-1280.png) | [After](../frontend/node_modules/.cache/municipal-offices/after-offices-1280.png) |
| 1920px | [Before](../frontend/node_modules/.cache/municipal-offices/before-offices-1920.png) | [After](../frontend/node_modules/.cache/municipal-offices/after-offices-1920.png) |

Contrast: white on deep blue 7.51:1; sky-950 on sky-100 12.10:1;
slate-700 on white 10.35:1. All exceed AA normal-text requirements. Large white
icons against primary blue exceed the 3:1 non-text requirement. Primary blue is
not used as a small-white-text button background.

Validation: TypeScript and production build passed; all 21 Node, 75 React and
69 public browser tests passed. The existing large-bundle warning remains.
Keyboard navigation through all four cards and the view-all link passed at
360, 768, 1280 and 1920px, with no horizontal overflow. A focused normal-hover and
reduced-motion rerun also passed at all four widths. Before/after screenshots were
visually reviewed at all four widths. Header and main hero comparisons
show zero changed pixels at these widths, and at 375 and 1440px in the existing
protected-region audit. Protected comparisons use a fixed clock, reduced motion, matching network
fixtures and blocked remote hero video/fonts, not arbitrary live-video frames.
No global styles, design tokens, protected components or data sources change.

SHA-256 checks against all 209 pre-task source files confirm that MunicipalOffices.tsx
is the only changed existing source file and its offices array is byte-identical.
MunicipalOffices.module.css is the sole new product source file for this task.

Content discrepancy requiring LGU verification: this section still lists
Hon. Michael I. Doria as Municipal Mayor, while Our Story lists Hon. Janette
Aurestila-Garcia. Neither name or title was edited or independently reverified.
