import { test, expect, type Page, type BrowserContext } from '@playwright/test';

const paymentsEnabled = process.env.TEST_SUBMISSION_PAYMENTS !== 'false';
const id = '22222222-2222-4222-8222-222222222222';
const user = { id: '11111111-1111-4111-8111-111111111111', email: 'citizen@example.test', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const application = { id, ticketId: `TAL-${id}`, documentType: 'Barangay Clearance', fullName: 'Juan Cruz', email: user.email, barangay: 'poblacion', mobileNumber: '09171234567', purpose: 'Employment', details: { sitioPurok: 'Purok 1', yearsOfResidency: 5 }, attachments: [], status: 'Submitted', version: 1, submittedAt: '2026-10-08T00:00:00Z', updatedAt: '2026-10-08T00:00:00Z', history: [{ id: 'history-1', status: 'Submitted', remarks: 'Application received.', createdAt: '2026-10-08T00:00:00Z' }] };
async function setup(page: Page, context: BrowserContext, signedIn = true) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const token = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: user.id, exp, aud: 'authenticated', role: 'authenticated' })).toString('base64url')}.test`;
  const session = { user, access_token: token, refresh_token: 'test-refresh', expires_in: 3600, expires_at: exp, token_type: 'bearer' };
  if (signedIn) await page.addInitScript(value => localStorage.setItem('sb-127-auth-token', JSON.stringify(value)), session);
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await context.route('http://127.0.0.1:54321/**', route => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill({ json: path.endsWith('/token') ? session : path.endsWith('/user') ? user : path.endsWith('/profiles') ? { ...user, full_name: '', role: 'citizen', is_verified: true, is_active: true } : [] });
  });
  await context.route('**/api/**', route => route.fulfill({ json: {} }));
  await context.route('**/api/forms/submissions**', route => {
    expect(route.request().headers().authorization).toBe(`Bearer ${token}`);
    if (route.request().method() === 'POST') return route.fulfill({ status: 201, json: { ...application, ...route.request().postDataJSON() } });
    return route.fulfill({ json: new URL(route.request().url()).pathname.endsWith('/submissions') ? { data: [application], pagination: { page: 1, limit: 10, total: 1 } } : { success: true, request: application } });
  });
  await context.route('**/api/payments/submissions/*', route => route.fulfill({ json: { status: 'awaiting_assessment', amount: 0, currency: 'PHP' } }));
}
async function applicant(page: Page) {
  await page.getByLabel('Full legal name', { exact: true }).fill('Juan Cruz');
  await page.getByLabel('Barangay', { exact: true }).selectOption('poblacion');
  await expect(page.getByLabel('Account email')).toHaveValue(user.email);
  await expect(page.getByLabel('Account email')).toHaveAttribute('readonly', '');
  await page.getByLabel('Mobile number', { exact: true }).fill('09171234567');
  await page.getByLabel('Purpose of request').fill('Employment');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
}
const cases: [string, Record<string, string>, Record<string, string | number>][] = [
  ['Barangay Clearance', { 'Sitio / Purok': 'Purok 1', 'Years of residency': '5' }, { sitioPurok: 'Purok 1', yearsOfResidency: 5 }],
  ['Certificate of Indigency', { 'Residential address': 'Purok 1', 'Monthly income (PHP)': '0', 'Family members': '4', 'Reason for assistance': 'Medical assistance' }, { address: 'Purok 1', monthlyIncome: 0, familyMembers: 4, reason: 'Medical assistance' }],
  ['Business Permit', { 'Business name': 'Cruz Store', 'Business address': 'Purok 1', 'Nature of business': 'Retail', 'DTI / SEC registration number': 'DTI-123' }, { businessName: 'Cruz Store', businessAddress: 'Purok 1', natureOfBusiness: 'Retail', dtiSecRegNo: 'DTI-123' }],
  ['Building Permit', { 'Property address': 'Purok 1', 'Lot number': 'LOT-1', 'Tax declaration number': 'TD-1', 'Construction type': 'Residential', 'Estimated construction cost (PHP)': '500000', 'Floor area (square metres)': '60', 'Engineer / Architect': 'Maria Santos' }, { propertyAddress: 'Purok 1', lotNumber: 'LOT-1', taxDeclarationNo: 'TD-1', constructionType: 'Residential', estimatedCost: 500000, floorArea: 60, engineerArchitect: 'Maria Santos' }],
  ['Zoning Clearance', { 'Property address': 'Purok 1', 'Lot number': 'LOT-1', 'Tax declaration number': 'TD-1' }, { propertyAddress: 'Purok 1', lotNumber: 'LOT-1', taxDeclarationNo: 'TD-1' }],
];
for (const [type, values, details] of cases) test(`${type}: typed submission, review, progress and status`, async ({ page, context }) => {
  await setup(page, context);
  const posts: unknown[] = [];
  page.on('request', request => { if (request.method() === 'POST' && request.url().endsWith('/api/forms/submissions')) posts.push(request.postDataJSON()); });
  await page.goto(`/e-services?type=${encodeURIComponent(type)}`);
  await applicant(page);
  await expect(page.getByRole('heading', { name: 'Step 2 of 4: Service details' })).toBeFocused();
  for (const [label, value] of Object.entries(values)) {
    const control = page.getByLabel(label, { exact: true });
    if (label === 'Construction type') await control.selectOption(value); else await control.fill(value);
  }
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByLabel(Object.keys(values)[0], { exact: true })).toHaveValue(Object.values(values)[0]);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Submit application', exact: true }).click();
  await expect(page.getByText('Application submitted', { exact: true })).toBeVisible();
  expect(posts).toEqual([{ documentType: type, fullName: 'Juan Cruz', barangay: 'poblacion', email: user.email, mobileNumber: '09171234567', purpose: 'Employment', attachments: [], details }]);
  await expect(page.locator('[aria-current="step"]')).toContainText('Payment & status');
  expect(await page.evaluate(() => Object.keys(localStorage).filter(key => /request|submission|payment/i.test(key)))).toEqual([]);
  await page.getByRole('link', { name: 'View submission status' }).click();
  await expect(page.getByText('Current status: Submitted')).toBeVisible();
  await expect(page.getByText('Application received.')).toBeVisible();
});

test('schema errors are linked, focusable, keyboard navigable and mobile fits', async ({ page, context }, testInfo) => {
  await setup(page, context); await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/e-services?type=Barangay%20Clearance');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('alert')).toBeFocused();
  await page.getByRole('link', { name: 'Full legal name: Full legal name is required.' }).click();
  await expect(page.getByLabel('Full legal name', { exact: true })).toBeFocused();
  await page.keyboard.press('Tab'); await expect(page.getByLabel('Barangay', { exact: true })).toBeFocused();
  await applicant(page);
  await page.getByLabel('Sitio / Purok').fill('Purok 1');
  await page.getByLabel('Years of residency').fill('-1');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByLabel('Years of residency')).toHaveAttribute('aria-invalid', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('eservices-mobile.png'), fullPage: true });
});
test('submission failures retain review and never fabricate success; retry saves once', async ({ page, context }) => {
  await setup(page, context); let attempts = 0;
  await context.route('**/api/forms/submissions', async route => {
    attempts++;
    await new Promise(resolve => setTimeout(resolve, 200));
    await route.fulfill({ status: attempts === 1 ? 503 : 201, json: attempts === 1 ? {} : application });
  });
  await page.goto('/e-services?type=Barangay%20Clearance'); await applicant(page);
  await page.getByLabel('Sitio / Purok').fill('Purok 1'); await page.getByLabel('Years of residency').fill('5');
  await page.getByRole('button', { name: 'Continue', exact: true }).click(); await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Submit application', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('temporarily unavailable');
  await expect(page.getByText('Application submitted', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Juan Cruz', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Submit application', exact: true }).evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
  await expect(page.getByText('Application submitted', { exact: true })).toBeVisible(); expect(attempts).toBe(2);
});
test('signed-out visitors must sign in; private tracking 404 is recoverable', async ({ page, context }) => {
  await setup(page, context, false); await page.goto('/e-services?type=Business%20Permit');
  await expect(page.getByRole('heading', { name: 'Sign in to apply' })).toBeVisible();
  await setup(page, context); await page.goto('/e-services?track=not-owned');
  await context.route('**/api/forms/submissions/not-owned', route => route.fulfill({ status: 404, json: {} }));
  await page.reload(); await expect(page.getByRole('alert')).toContainText('not found in your account');
  await expect(page.getByRole('button', { name: 'Refresh status' })).toBeEnabled();
});
test('citizen login returns to the requested form through the existing service link', async ({ page, context }) => {
  await setup(page, context, false);
  await page.goto('/e-services?service=business_permit');
  await page.getByRole('main').getByRole('link', { name: 'Sign in', exact: true }).click();
  await page.getByLabel('Email address', { exact: true }).fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill('testing-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/e-services\?service=business_permit$/);
  await expect(page.getByRole('heading', { name: 'Business Permit', exact: true })).toBeVisible();
  await expect(page.getByLabel('Account email')).toHaveValue(user.email);
});
test('listing pagination and throttled lookup have recovery controls', async ({ page, context }) => {
  await setup(page, context);
  await context.route('**/api/forms/submissions?*', route => {
    const current = Number(new URL(route.request().url()).searchParams.get('page'));
    return route.fulfill({ json: { data: current === 1 ? [application] : [{ ...application, id: 'other', ticketId: 'TAL-PAGE-TWO' }], pagination: { page: current, limit: 10, total: 11 } } });
  });
  await page.goto('/e-services?view=submissions');
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.getByRole('link', { name: /TAL-PAGE-TWO/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next page' })).toBeDisabled();
  await context.route('**/api/forms/submissions/TAL-PAGE-TWO', route => route.fulfill({ status: 429, json: {} }));
  await page.getByRole('link', { name: /TAL-PAGE-TWO/ }).click();
  await expect(page.getByRole('alert')).toContainText('Too many requests');
  await expect(page.getByRole('button', { name: 'Refresh status' })).toBeEnabled();
});
test('submissions list reads live pagination and refreshes current status', async ({ page, context }) => {
  await setup(page, context); await page.goto('/e-services?view=submissions');
  await expect(page.getByRole('link', { name: /Barangay Clearance TAL-/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next page' })).toBeDisabled();
  await page.getByRole('link', { name: /Barangay Clearance TAL-/ }).click();
  await expect(page.getByText('Current status: Submitted')).toBeVisible();
  await context.route('**/api/forms/submissions/TAL-*', route => route.fulfill({ json: { success: true, request: { ...application, status: 'Approved' } } }));
  await page.getByRole('button', { name: 'Refresh status' }).click(); await expect(page.getByText('Current status: Approved')).toBeVisible();
});
test('success URL alone cannot assert payment or create a receipt', async ({ page, context }) => {
  await setup(page, context); await page.goto('/payment/success?reference=FAKE');
  await expect(page.getByText(/Payment has not been verified here/)).toBeVisible();
  await expect(page.getByText(/Payment confirmed|OFFICIAL RECEIPT/)).toHaveCount(0);
});
test('payments remain unavailable by default', async ({ page, context }) => {
  test.skip(paymentsEnabled, 'Run with TEST_SUBMISSION_PAYMENTS=false');
  await setup(page, context); let calls = 0;
  page.on('request', request => { if (request.url().includes('/api/payments/')) calls++; });
  await page.goto(`/payment/success?submission=${id}`);
  await expect(page.getByText(/Online payment is not available yet/)).toBeVisible(); expect(calls).toBe(0);
});
test('pending payment cannot be retried; server confirmation supplies the receipt', async ({ page, context }) => {
  test.skip(!paymentsEnabled); await setup(page, context);
  await context.route('**/api/payments/submissions/*', route => route.fulfill({ json: { status: 'pending', amount: 100, currency: 'PHP' } }));
  await page.goto(`/payment/success?submission=${id}`);
  await expect(page.getByText(/Payment confirmation is pending/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue to secure checkout' })).toHaveCount(0);
  await context.route('**/api/payments/submissions/*', route => route.fulfill({ json: { status: 'paid', amount: 100, currency: 'PHP', receiptReference: 'SERVER-123' } }));
  await page.getByRole('button', { name: 'Check payment status' }).click();
  await expect(page.getByText('Payment confirmed by the payment service.')).toBeVisible();
  await expect(page.getByText('Receipt reference: SERVER-123')).toBeVisible();
});
for (const outcome of ['cancel', 'failure']) test(`${outcome}: saved application, checkout retry and safe redirect`, async ({ page, context }) => {
  test.skip(!paymentsEnabled); await setup(page, context);
  await context.route('**/api/payments/submissions/*', route => route.fulfill({ json: { status: outcome === 'cancel' ? 'cancelled' : 'failed', amount: 100, currency: 'PHP' } }));
  await context.route('**/api/payments/submission-checkout', route => {
    const payload = route.request().postDataJSON(); expect(payload.submissionId).toBe(id); expect(payload).not.toHaveProperty('amount'); expect(payload).not.toHaveProperty('card');
    expect(payload.successUrl).toContain(`/payment/success?submission=${id}`);
    return route.fulfill({ json: { url: 'https://checkout.xendit.co/test-invoice' } });
  });
  await context.route('https://checkout.xendit.co/**', route => route.fulfill({ contentType: 'text/html', body: '<h1>Provider checkout</h1>' }));
  await page.goto(`/payment/${outcome}?submission=${id}`);
  await expect(page.getByText(/Your application remains saved/)).toBeVisible();
  await page.getByRole('button', { name: 'Continue to secure checkout' }).click();
  await expect(page).toHaveURL('https://checkout.xendit.co/test-invoice');
});
test('checkout failure and invalid redirect stay recoverable', async ({ page, context }) => {
  test.skip(!paymentsEnabled); await setup(page, context);
  await context.route('**/api/payments/submissions/*', route => route.fulfill({ json: { status: 'unpaid', amount: 100, currency: 'PHP' } }));
  await context.route('**/api/payments/submission-checkout', route => route.fulfill({ status: 503, json: {} }));
  await page.goto(`/payment/failure?submission=${id}`);
  await page.getByRole('button', { name: 'Continue to secure checkout' }).click(); await expect(page.getByRole('alert')).toContainText('temporarily unavailable');
  await context.route('**/api/payments/submission-checkout', route => route.fulfill({ json: { url: 'https://attacker.example/checkout' } }));
  await page.getByRole('button', { name: 'Continue to secure checkout' }).click(); await expect(page.getByRole('alert')).toContainText('unsupported checkout address');
  await expect(page).toHaveURL(/\/payment\/failure/);
});
