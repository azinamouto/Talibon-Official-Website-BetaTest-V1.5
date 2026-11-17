import { test, expect, type BrowserContext, type Page } from '@playwright/test';

const admin = { id: '11111111-1111-4111-8111-111111111111', role: 'admin' as const };
const target = { id: '22222222-2222-4222-8222-222222222222', email: 'editor@example.test', role: 'editor' as const, active: true, version: 3 };
const events = [{ id: 'event-1', source: 'authentication', action: 'mfa.success', actorId: null,
  subjectId: target.id, occurredAt: '2026-11-02T00:00:00.000Z' }];

async function isolate(context: BrowserContext) {
  await context.route('**/api/**', route => route.fulfill({ status: 404, json: {} }));
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.fallback() : route.abort());
  await context.route('**/api/admin/media?page=*', route => route.fulfill({ json: { data: [], hasMore: false } }));
  await context.route('**/api/admin/media/options', route => route.fulfill({ json: { categories: [], sources: [] } }));
}

async function staffSession(context: BrowserContext, role: 'admin' | 'editor') {
  await context.route('**/api/staff/me', route => route.fulfill({ json: { id: admin.id, role } }));
  await context.route('**/api/staff?*', route => route.fulfill({ json: {
    data: role === 'admin' ? [target] : [], pagination: { page: 1, limit: 50, hasMore: false },
  } }));
  await context.route('**/api/staff/audit?*', route => route.fulfill({ json: {
    data: role === 'admin' ? events : [], pagination: { page: 1, limit: 50, hasMore: false },
  } }));
}

test('R2 staff portal remains responsive with authorized records', async ({ page, context }, info) => {
  // Bound the cold Vite/module startup separately from the rendered UI assertions.
  test.setTimeout(60000);
  await isolate(context);
  await staffSession(context, 'admin');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/admin', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'CMS Administration' })).toBeVisible();
  await page.getByRole('navigation', { name: 'CMS navigation' }).getByRole('button', { name: 'Staff management' }).click();
  await expect(page.getByText('editor@example.test')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('admin-mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: info.outputPath('admin-desktop.png'), fullPage: true });
  await page.getByRole('navigation', { name: 'CMS navigation' }).getByRole('button', { name: 'Audit logs' }).click();
  await expect(page.getByRole('heading', { name: 'Audit logs' })).toBeVisible();
});

test('staff portal redirects unauthenticated visitors to staff-only sign in', async ({ page, context }) => {
  await isolate(context);
  await context.route('**/api/staff/me', route => route.fulfill({ status: 401, json: { message: 'Unauthorized' } }));
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/staff\/login$/);
  await expect(page.getByRole('heading', { name: 'Staff sign in' })).toBeVisible();
  await expect(page.getByLabel('Staff email')).toBeVisible();
  await expect(page.getByRole('link', { name: /sign up|register/i })).toHaveCount(0);
});

test('staff sign in requires MFA before opening the portal and stores no browser token', async ({ page, context }) => {
  await isolate(context);
  let verified = false;
  await context.route('**/api/staff/me', route => route.fulfill(verified
    ? { json: admin } : { status: 401, json: { message: 'Unauthorized' } }));
  await context.route('**/api/staff-auth/sign-in/email', route => route.fulfill({ json: { success: true, mfaRequired: true } }));
  await context.route('**/api/staff-auth/two-factor/verify-totp', async route => {
    expect(route.request().postDataJSON()).toEqual({ code: '123456' });
    verified = true;
    await route.fulfill({ json: { success: true } });
  });
  await context.route('**/api/staff?*', route => route.fulfill({ json: { data: [], pagination: { page: 1, limit: 50, hasMore: false } } }));
  await context.route('**/api/staff/audit?*', route => route.fulfill({ json: { data: [], pagination: { page: 1, limit: 50, hasMore: false } } }));
  const legacyRequests: string[] = [];
  page.on('request', request => { if (/\/api\/(auth|admin\/users|admin\/reports)/.test(request.url())) legacyRequests.push(request.url()); });
  await page.goto('/staff/login');
  await page.getByLabel('Staff email').fill('admin@example.test');
  await page.getByLabel('Password', { exact: true }).fill('synthetic-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByLabel('Authenticator code')).toBeVisible();
  await page.getByLabel('Authenticator code').fill('123456');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'CMS Administration' })).toBeVisible();
  expect(await page.evaluate(() => Object.keys(localStorage).filter(key => /auth|token/i.test(key)))).toEqual([]);
  expect(legacyRequests).toEqual([]);
});

test('admin can perform a versioned role change only after entering a fresh MFA code', async ({ page, context }) => {
  await isolate(context);
  await staffSession(context, 'admin');
  let role = 'editor';
  await context.route('**/api/staff?*', route => route.fulfill({ json: {
    data: [{ ...target, role }], pagination: { page: 1, limit: 50, hasMore: false },
  } }));
  await page.goto('/admin?tab=staff');
  await expect(page.getByText('editor@example.test')).toBeVisible();
  await page.getByRole('button', { name: 'Make admin' }).click();
  await expect(page.getByRole('status')).toContainText('Enter a current authenticator code');
  await page.getByLabel('Current authenticator code').fill('654321');
  await context.route('**/api/staff-auth/two-factor/verify-totp', route => {
    expect(route.request().postDataJSON()).toEqual({ code: '654321' });
    return route.fulfill({ json: { success: true } });
  });
  await context.route(`**/api/staff/${target.id}/role`, route => {
    expect(route.request().postDataJSON()).toEqual({ version: 3, role: 'admin' });
    role = 'admin';
    return route.fulfill({ json: { success: true } });
  });
  await page.getByRole('button', { name: 'Make admin' }).click();
  await expect(page.getByRole('status')).toContainText('Staff access action completed');
  await expect(page.getByText('admin · Active')).toBeVisible();
});

test('editors cannot view staff administration or audit', async ({ page, context }) => {
  await isolate(context);
  await staffSession(context, 'editor');
  const adminRequests: string[] = [];
  page.on('request', request => { if (/\/api\/staff(?:\?|\/audit)/.test(request.url())) adminRequests.push(request.url()); });
  await page.goto('/admin?tab=audit');
  await expect(page.getByRole('heading', { name: 'CMS Administration' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Staff management' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Audit logs' })).toHaveCount(0);
  expect(adminRequests).toEqual([]);
});

test('municipal dashboard uses complete content totals and supported modules on desktop and mobile', async ({ page, context }, info) => {
  await isolate(context);
  await staffSession(context, 'admin');
  const photo = { id: 'synthetic-photo', title: 'Synthetic published photo', kind: 'photo', mime: 'image/png', bytes: 1024, description: '', alt_text: 'Test image', category_id: 'photo-category', processing: 'ready', publication: 'published', version: 1 };
  const documentAsset = { ...photo, id: 'synthetic-document', title: 'Synthetic draft document', kind: 'document', mime: 'application/pdf', publication: 'draft' };
  await context.route('**/api/admin/media?page=*', route => route.fulfill({ json: { data: [photo, documentAsset], hasMore: true } }));
  await context.route('**/api/admin/content/dashboard', route => route.fulfill({ json: {
    counts: [{ kind: 'news', publication: 'draft', total: 4 }, { kind: 'news', publication: 'published', total: 12 },
      { kind: 'news', publication: 'archived', total: 3 }, { kind: 'downloadables', publication: 'published', total: 2 }],
    media: [{ kind: 'photo', publication: 'published', total: 120 }, { kind: 'document', publication: 'draft', total: 10 }],
    recent: [{ id: 'synthetic-news', kind: 'news', title: 'Synthetic municipal update', publication: 'draft', updated_at: '2026-11-17T00:00:00Z' }],
    activity: [{ action: 'content.publish', resource_id: 'synthetic-news', occurred_at: '2026-11-17T00:00:00Z' }],
  } }));
  const requests: string[] = [];
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) requests.push(request.url()); });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/admin');
  await expect(page.getByText('Synthetic municipal update')).toBeVisible();
  for (const [label, value] of [['Municipal records', '21'], ['Published records', '14'], ['Drafts awaiting publication', '4'], ['Media library files', '130']]) {
    await expect(page.getByText(label, { exact: true }).locator('..').locator('dd')).toHaveText(value);
  }
  await expect(page.getByText('Totals include all municipal records and library files. Archived records: 3.')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Your recent activity' }).getByText('content.publish')).toBeVisible();
  const moduleLabels = ['News & Updates', 'Tourism', 'Events & Festivals', 'Transparency', 'Local Government', 'Galleries', 'Downloadables',
    'Photos', 'Documents', 'Source approvals', 'Staff management', 'Audit logs'];
  const navigation = page.getByRole('navigation', { name: 'CMS navigation' });
  await expect(navigation.getByRole('button')).toHaveCount(13);
  for (const label of moduleLabels) await expect(navigation.getByRole('button', { name: label, exact: true })).toBeVisible();
  await expect(page.locator('a[href*="eservices"]')).toHaveCount(0);
  await expect(navigation.getByRole('button', { name: 'Dashboard overview' })).toHaveAttribute('aria-current', 'page');
  await page.screenshot({ path: info.outputPath('cms-dashboard-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: 'Collapse sidebar' }).click();
  await navigation.getByRole('button', { name: 'Photos', exact: true }).focus();
  await expect(navigation.getByRole('button', { name: 'Photos', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Photos', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: photo.title })).toBeVisible();
  await expect(page.getByRole('heading', { name: documentAsset.title })).toHaveCount(0);
  await navigation.getByRole('button', { name: 'Documents', exact: true }).click();
  await expect(page.getByRole('heading', { name: documentAsset.title })).toBeVisible();
  await expect(page.getByRole('heading', { name: photo.title })).toHaveCount(0);
  await navigation.getByRole('button', { name: 'Dashboard overview' }).click();
  await page.setViewportSize({ width: 320, height: 812 });
  await expect(page.getByRole('heading', { name: 'Dashboard overview' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const label of moduleLabels) {
    const button = navigation.getByRole('button', { name: label, exact: true });
    await expect(button).toBeVisible();
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  await page.screenshot({ path: info.outputPath('cms-dashboard-mobile.png'), fullPage: true });
  expect(requests.some(url => new URL(url).pathname === '/api/admin/content/dashboard')).toBe(true);
  expect(requests.filter(url => new URL(url).pathname.startsWith('/api/admin/content') && new URL(url).pathname !== '/api/admin/content/dashboard')).toEqual([]);
  expect(requests.filter(url => /\/api\/(?:admin\/users|admin\/reports|payments|applications)/.test(url))).toEqual([]);
  expect(requests.filter(url => /\/api\/staff(?:\?|\/audit)/.test(url))).toEqual([]);
});

test('staff pages preserve returned pagination and do not fetch audit data until selected', async ({ page, context }) => {
  await isolate(context);
  await staffSession(context, 'admin');
  await context.route('**/api/staff?*', route => {
    const current = Number(new URL(route.request().url()).searchParams.get('page'));
    return route.fulfill({ json: { data: [{ ...target, email: current === 1 ? target.email : 'second-page@example.test' }], pagination: { page: current, limit: 50, hasMore: current === 1 } } });
  });
  const auditRequests: string[] = [];
  page.on('request', request => { if (new URL(request.url()).pathname === '/api/staff/audit') auditRequests.push(request.url()); });
  await page.goto('/admin?tab=staff');
  await expect(page.getByText(target.email)).toBeVisible();
  await page.getByRole('button', { name: 'Next staff page' }).click();
  await expect(page.getByText('second-page@example.test')).toBeVisible();
  await expect(page.getByText('Staff page 2', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next staff page' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Previous staff page' })).toBeEnabled();
  expect(auditRequests).toEqual([]);
});

test('audit error is visible and refresh recovers without inventing records', async ({ page, context }) => {
  await isolate(context);
  await staffSession(context, 'admin');
  let unavailable = true;
  await context.route('**/api/staff/audit?*', route => route.fulfill(unavailable
    ? { status: 503, json: { message: 'Synthetic unavailable response' } }
    : { json: { data: events, pagination: { page: 1, limit: 50, hasMore: false } } }));
  await page.goto('/admin?tab=audit');
  await expect(page.getByRole('alert')).toContainText('Could not load staff access records');
  await expect(page.getByText('mfa.success', { exact: true })).toHaveCount(0);
  unavailable = false;
  await page.getByRole('button', { name: 'Refresh records' }).click();
  await expect(page.getByText('mfa.success', { exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('sign out preserves protected login routing', async ({ page, context }) => {
  await isolate(context);
  let signedIn = true;
  await context.route('**/api/staff/me', route => route.fulfill(signedIn
    ? { json: admin } : { status: 401, json: {} }));
  await context.route('**/api/staff-auth/sign-out', route => {
    signedIn = false;
    return route.fulfill({ json: { success: true } });
  });
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Dashboard overview' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/staff\/login$/);
  await expect(page.getByRole('heading', { name: 'Staff sign in' })).toBeVisible();
});

test('CMS routes use their own shell while public pages retain public navigation and footer', async ({ page, context }) => {
  await isolate(context);
  await staffSession(context, 'admin');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/admin', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'CMS Administration' })).toBeVisible();
  await expect(page.getByRole('contentinfo')).toHaveCount(0);
  await expect(page.locator('a[href*="eservices"]')).toHaveCount(0);
  await page.goto('/missing-page', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Municipal Resource Missing' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Home', exact: true }).first()).toBeVisible();
  await expect(page.getByRole('contentinfo')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'CMS navigation' })).toHaveCount(0);
});
