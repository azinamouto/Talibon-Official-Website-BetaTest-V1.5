import { test, expect } from '@playwright/test';

const service = { id: '11111111-1111-4111-8111-111111111111', slug: 'business-permit', name: 'Business permit', description: 'Apply for a municipal permit.', requirements: ['Valid ID'], fees: 'None', processing_time: '3 days', office_responsible: 'mayor' };
const news = { id: '22222222-2222-4222-8222-222222222222', slug: 'municipal-update', title: 'Municipal update', summary: 'Official update summary', content: 'Published article content.\nSecond paragraph.', date: '2026-10-08', category: 'UPDATE' };
const listing = (data: unknown[], page = 1, total = data.length) => ({ data, pagination: { page, limit: 12, total, totalPages: Math.ceil(total / 12) } });

test.beforeEach(async ({ context }) => {
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await context.route('http://127.0.0.1:54321/**', route => route.fulfill({ json: [] }));
  await context.route('**/api/**', route => route.fulfill({ json: [] }));
});

for (const width of [375, 1280]) {
  test(`services and news list/detail flows at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/services?**', route => route.fulfill({ json: listing([service]) }));
    await page.route('**/api/news?**', route => {
      const params = new URL(route.request().url()).searchParams;
      const number = Number(params.get('page') || 1);
      expect(route.request().headers()['x-api-version']).toBe('1');
      return route.fulfill({ json: listing([{ ...news, title: number === 2 ? 'Older update' : news.title }], number, 13) });
    });
    await page.route(`**/api/news/${news.id}`, route => route.fulfill({ json: { data: news } }));
    await page.goto('/services');
    await page.getByRole('link', { name: /Business permit/ }).click();
    await expect(page).toHaveURL(/\/services\/business-permit$/);
    await expect(page.getByRole('heading', { name: 'Business permit', exact: true })).toBeVisible();
    await expect(page.getByText('Valid ID', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.goto('/news/updates');
    await expect(page.getByRole('link', { name: 'Municipal update', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByRole('link', { name: 'Older update' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
    await page.goBack();
    await expect(page.getByRole('link', { name: 'Municipal update', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('link', { name: 'Municipal update', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Municipal update', exact: true })).toBeVisible();
    await expect(page.getByText('Published article content.', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}

for (const path of ['/services', '/news', '/services/business-permit', `/news/view/${news.id}`]) {
  test(`${path} has loading, retry, empty/not-found states`, async ({ page }) => {
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    let fail = true;
    await page.route('**/api/**', async route => {
      if (fail) { await pending; return route.fulfill({ status: 503, json: { message: 'Database internals must not be shown' } }); }
      return route.fulfill(path.includes('/news/view/') ? { status: 404, json: {} } : { json: listing([]) });
    });
    await page.goto(path);
    await expect(page.getByText(/Loading (content|Article Details)/)).toBeVisible();
    release();
    await expect(page.getByRole('alert')).toContainText('Unable to load content');
    await expect(page.getByRole('alert')).not.toContainText('Database internals');
    fail = false;
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByText(/No Services Published|No news found|Service not found|Article Not Found/i)).toBeVisible();
  });
}

test('news filters reset pagination and use backend query parameters', async ({ page }) => {
  await page.route('**/api/news?**', route => route.fulfill({ json: listing([news], Number(new URL(route.request().url()).searchParams.get('page') || 1), 13) }));
  await page.goto('/news/updates?page=2');
  await page.getByRole('searchbox', { name: 'Search news' }).fill('coastal & health');
  const request = page.waitForRequest(request => request.url().includes('/api/news?') && request.url().includes('q='));
  await page.getByRole('button', { name: 'Search news', exact: true }).click();
  const params = new URL((await request).url()).searchParams;
  expect(params.get('q')).toBe('coastal & health');
  expect(params.get('page')).toBe('1');
  expect(params.get('category')).toBe('UPDATE');
});

test('site search calls search API, retries failures and opens service and page results', async ({ page }) => {
  await page.route('**/api/services?**', route => route.fulfill({ json: listing([service]) }));
  await page.route(`**/api/services/${service.id}`, route => route.fulfill({ json: { data: service } }));
  let fail = true;
  await page.route('**/api/search?**', route => {
    expect(new URL(route.request().url()).searchParams.get('q')).toBe('permit');
    return route.fulfill(fail ? { status: 503, json: {} } : { json: { data: [{ ...service, type: 'services', title: service.name, snippet: service.description }, { id: news.id, type: 'pages', title: 'Permit information', snippet: 'Municipal page' }] } });
  });
  await page.route(`**/api/pages/${news.id}`, route => route.fulfill({ json: { data: { title: 'Permit information', content: 'Published municipal page.' } } }));
  await page.goto('/services');
  await page.getByTitle('Search', { exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search the site' }).fill('permit');
  await expect(page.getByRole('alert')).toContainText('Search is temporarily unavailable');
  fail = false;
  await page.getByRole('button', { name: 'Try again' }).click();
  await page.getByRole('dialog').getByRole('link', { name: /Business permit/ }).click();
  await expect(page).toHaveURL(new RegExp(`/services/${service.id}$`));
  await expect(page.getByText('Valid ID', { exact: true })).toBeVisible();
  await page.getByTitle('Search', { exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search the site' }).fill('permit');
  await page.getByRole('link', { name: /Permit information/ }).click();
  await expect(page.getByText('Published municipal page.')).toBeVisible();
});
