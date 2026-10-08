import { test, expect, type Page, type BrowserContext } from '@playwright/test';

const user = { id: '11111111-1111-4111-8111-111111111111', email: 'staff@example.test', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
function session(expires = 3600) {
  const exp = Math.floor(Date.now() / 1000) + expires;
  const token = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: user.id, exp, aud: 'authenticated', role: 'authenticated' })).toString('base64url')}.test`;
  return { user, access_token: token, refresh_token: 'test-refresh-token', expires_in: expires, expires_at: exp, token_type: 'bearer' };
}
async function mockApi(context: BrowserContext, role = 'citizen', failLogout = false) {
  const requests: string[] = [];
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await context.route('http://127.0.0.1:54321/**', async route => {
    const url = new URL(route.request().url());
    requests.push(url.pathname + url.search);
    if (url.pathname.endsWith('/token')) return route.fulfill({ json: session() });
    if (url.pathname.endsWith('/logout')) return route.fulfill({ status: failLogout ? 500 : 204, ...(failLogout ? { json: { message: 'offline' } } : {}) });
    if (url.pathname.endsWith('/user')) return route.fulfill({ json: user });
    if (url.pathname.endsWith('/profiles')) return route.fulfill({ json: { ...user, full_name: 'Test Staff', role, is_verified: true, is_active: true } });
    return route.fulfill({ json: [] });
  });
  await context.route('**/api/**', route => route.fulfill({ json: {} }));
  await context.route('**/api/auth/me', route => route.fulfill({ json: { success: true, data: { user, profile: { role }, permissions: role === 'admin' ? ['users:read', 'reports:read', 'content:manage'] : [] } } }));
  await context.route(/\/api\/(admin\/users|pages\/manage|news\/manage|services\/manage)/, route => route.fulfill({ json: { data: [], pagination: { page: 1, total: 0, totalPages: 0 } } }));
  return requests;
}
async function login(page: Page) {
  await page.getByLabel('Email address', { exact: true }).fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill('testing-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}
async function seed(page: Page, expires = 3600) {
  await page.addInitScript(value => localStorage.setItem('sb-127-auth-token', JSON.stringify(value)), session(expires));
}
test('protected URL redirects to login and returns staff to the original location', async ({ page, context }) => {
  await mockApi(context, 'admin');
  await page.goto('/manage/news?tab=news');
  await expect(page).toHaveURL(/\/login$/);
  await login(page);
  await expect(page).toHaveURL(/\/manage\/news\?tab=news$/);
  await expect(page.getByText('Access denied', { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page).toHaveURL(/\/manage\/news\?tab=news$/);
  await expect(page.getByText('Loading your session...')).toHaveCount(0);
});
test('citizens cannot enter staff routes; modal traps focus, Escape restores focus, logout clears session', async ({ page, context }) => {
  await mockApi(context);
  await page.goto('/admin');
  await login(page);
  await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
  const open = page.getByRole('main').getByRole('button', { name: 'Sign out', exact: true });
  await open.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(open).toBeFocused();
  await open.click();
  await dialog.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('sb-127-auth-token'))).toBeNull();
});
test('expired persisted session refreshes without bouncing to login', async ({ page, context }) => {
  const requests = await mockApi(context, 'admin');
  await seed(page, -30);
  await page.goto('/admin');
  await expect(page.getByText('Loading your session...')).toHaveCount(0);
  await expect(page).toHaveURL(/\/admin(?:\?tab=overview)?$/);
  await expect.poll(() => requests.some(url => url.includes('grant_type=refresh_token'))).toBe(true);
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toHaveCount(0);
});
test('recovery is accessible with a verified staff session', async ({ page, context }) => {
  await mockApi(context, 'admin');
  await seed(page);
  await page.goto('/login?type=recovery');
  await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible();
  await page.getByLabel('New password', { exact: true }).fill('a-new-testing-password');
  await page.getByRole('button', { name: 'Choose a new password' }).click();
  await expect(page).toHaveURL(/\/admin(?:\?tab=overview)?$/);
});
test('public 404 and invalid callback have useful recovery links', async ({ page, context }) => {
  await mockApi(context);
  await page.goto('/missing-page');
  await expect(page.getByRole('heading', { name: 'Municipal Resource Missing' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Return to Homepage' })).toHaveAttribute('href', '/');
  await page.goto('/auth/callback?error=access_denied');
  await expect(page.getByRole('alert')).toContainText('invalid or has expired');
  await expect(page.getByRole('link', { name: 'Return to sign in' })).toBeVisible();
});
test('mobile login has labelled controls, visible focus and no horizontal overflow', async ({ page, context }) => {
  await mockApi(context);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/login');
  const input = page.getByLabel('Email address', { exact: true });
  await input.focus();
  expect(await input.evaluate(el => getComputedStyle(el).outlineStyle)).toBe('solid');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/login-mobile.png' });
});

test('refresh keeps the mounted staff page and does not reload the profile', async ({ page, context }) => {
  const requests = await mockApi(context, 'admin');
  await page.goto('/admin');
  await login(page);
  await expect(page).toHaveURL(/\/admin(?:\?tab=overview)?$/);
  const before = requests.filter(url => url.startsWith('/rest/v1/profiles')).length;
  await page.evaluate(async () => {
    const path = '/src/lib/supabase.ts';
    const { supabase } = await import(/* @vite-ignore */ path);
    const { error } = await supabase.auth.refreshSession();
    if (error) throw error;
  });
  await expect(page).toHaveURL(/\/admin(?:\?tab=overview)?$/);
  expect(requests.filter(url => url.startsWith('/rest/v1/profiles')).length).toBe(before);
  await expect(page.getByRole('alert')).toHaveCount(0);
});
test('server logout failure reports the SDK local signout accurately', async ({ page, context }) => {
  await mockApi(context, 'citizen', true);
  await page.goto('/login');
  await login(page);
  await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
  await page.getByRole('main').getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('server sign-out could not be confirmed');
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('sb-127-auth-token'))).toBeNull();
});
test('logout is synchronized to another open tab', async ({ page, context }) => {
  await mockApi(context);
  await page.goto('/login');
  await login(page);
  await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
  const other = await context.newPage();
  await other.goto('/admin');
  await expect(other.getByRole('heading', { name: 'Access denied' })).toBeVisible();
  await page.getByRole('main').getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(other.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
});
test('route rendering errors preserve the layout and show recovery actions', async ({ page, context }) => {
  await mockApi(context);
  await page.route('**/src/pages/NotFound.tsx*', route => route.fulfill({
    contentType: 'application/javascript', body: 'export default function NotFound() { throw new Error("Test render failure"); }',
  }));
  await page.goto('/missing-page');
  await expect(page.getByRole('heading', { name: 'Something went wrong' })).toBeVisible();
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reload page' })).toBeVisible();
});
