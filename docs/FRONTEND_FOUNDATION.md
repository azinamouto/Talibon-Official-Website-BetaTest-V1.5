# Sprint 1 frontend foundation

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
