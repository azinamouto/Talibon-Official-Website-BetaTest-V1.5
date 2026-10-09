import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await context.route('http://127.0.0.1:54321/**', route => route.fulfill({ json: [] }));
});

for (const width of [375, 1280]) {
  test(`search filters, pagination and history against the contract mock at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/search?q=municipal&limit=1');
    await expect(page.getByRole('region', { name: 'Search results' })).toContainText('3 results');
    await expect(page.getByRole('button', { name: 'Previous', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByRole('navigation', { name: 'Pagination' })).toContainText('Page 2 of 3');
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
    await page.getByLabel('Content type').selectOption('services');
    await expect(page).toHaveURL(/page=1/);
    await expect(page.getByRole('region', { name: 'Search results' })).toContainText('1 results');
    await page.getByLabel('Content type').focus();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Category or department')).toBeFocused();
    await page.getByLabel('Category or department').selectOption('mayor');
    await page.getByLabel('Sort by').selectOption('date');
    await page.getByLabel('Results per page').selectOption('20');
    await page.reload();
    await expect(page.getByLabel('Sort by')).toHaveValue('date');
    await expect(page.getByLabel('Category or department')).toHaveValue('mayor');
    await expect(page.getByRole('region', { name: 'Search results' }).getByRole('link')).toHaveAttribute('href', /\/services\//);
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page.getByRole('region', { name: 'Search results' })).toContainText('3 results');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.goBack();
    await expect(page.getByLabel('Content type')).toHaveValue('services');
    await expect(page.getByLabel('Category or department')).toHaveValue('mayor');
    await page.getByRole('region', { name: 'Search results' }).getByRole('link').click();
    await expect(page.getByRole('heading', { name: 'Municipal information', level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('idle, empty, out-of-range and malformed URL states', async ({ page }) => {
  const calls: string[] = [];
  page.on('request', request => { if (request.url().includes('/api/search?')) calls.push(request.url()); });
  await page.goto('/search');
  await expect(page.getByRole('status')).toContainText('Enter a search term');
  expect(calls).toHaveLength(0);
  await page.getByRole('searchbox', { name: 'Search the site' }).fill('no-such-result');
  await page.getByRole('search').getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByText('No results found. Try another search term or clear the filters.')).toBeVisible();
  await page.goto('/search?q=municipal&page=99&limit=1');
  await page.getByRole('button', { name: 'Go to first page' }).click();
  await expect(page.getByRole('navigation', { name: 'Pagination' })).toContainText('Page 1 of 3');
  await page.goto('/search?q=municipal&type=invalid&sort=bad&page=-1&limit=999');
  await expect(page.getByLabel('Content type')).toHaveValue('all');
  await expect(page.getByLabel('Results per page')).toHaveValue('10');
  await expect(page.getByRole('region', { name: 'Search results' })).toContainText('3 results');
  const before = calls.length;
  await page.goto(`/search?q=${'x'.repeat(101)}`);
  await expect(page.getByRole('alert')).toContainText('100 characters');
  expect(calls).toHaveLength(before);
});

test('loading, rate-limit and service errors allow retry', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let status = 503;
  await page.route('**/api/search?**', async route => {
    if (status === 503) { await gate; return route.fulfill({ status: 503, json: {} }); }
    if (status === 429) return route.fulfill({ status: 429, json: {}, headers: { 'Retry-After': '1' } });
    return route.continue();
  });
  await page.goto('/search?q=municipal');
  await expect(page.getByRole('region', { name: 'Search results' })).toHaveAttribute('aria-busy', 'true');
  await expect(page.getByRole('status')).toContainText('Loading content');
  release();
  await expect(page.getByRole('alert')).toContainText('Unable to load content');
  status = 429;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('alert')).toContainText('Too many requests');
  status = 200;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('region', { name: 'Search results' })).toContainText('3 results');
});

test('superseded search responses cannot replace the current results', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/search?**', async route => {
    if (new URL(route.request().url()).searchParams.get('q') === 'old') {
      await gate;
      return route.fulfill({ json: { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 }, facets: { byType: { news: 0, services: 0, pages: 0 }, byCategory: {} } } });
    }
    return route.continue();
  });
  await page.goto('/search?q=old');
  await expect(page.getByRole('status')).toContainText('Loading content');
  await page.getByRole('searchbox', { name: 'Search the site' }).fill('municipal');
  await page.getByRole('search').getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Search results' })).toContainText('3 results');
  release();
  await expect(page.getByRole('region', { name: 'Search results' })).toContainText('3 results for “municipal”');
});

test('popup links to full search and results navigate by content type', async ({ page }) => {
  await page.goto('/news');
  await page.getByTitle('Search', { exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search the site' }).fill('municipal');
  await page.getByRole('link', { name: 'View all results and filters' }).click();
  await expect(page).toHaveURL(/\/search\?q=municipal/);
  await expect(page.getByRole('dialog')).not.toBeVisible();
  for (const [type, prefix] of [['news', '/news/view/'], ['pages', '/pages/']]) {
    await page.goto(`/search?q=municipal&type=${type}`);
    await page.getByRole('region', { name: 'Search results' }).getByRole('link').click();
    expect(new URL(page.url()).pathname).toContain(prefix);
    await expect(page.getByRole('heading', { name: 'Municipal information', level: 1 })).toBeVisible();
  }
});
