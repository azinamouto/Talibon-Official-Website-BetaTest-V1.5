import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await context.route('http://127.0.0.1:54321/**', route => route.fulfill({ json: [] }));
});

for (const width of [375, 1280]) {
  test(`About routes render contract examples without horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const [path, heading, endpoint] of [
      ['profile', 'Brief Profile', 'about/profile'], ['history', 'Brief History', 'about/history'],
      ['mayors', 'List of Mayors', 'about/mayors'], ['departments', 'Departments', 'about/departments'],
      ['barangays', 'Barangay Profiles', 'about/barangays'], ['demographics', 'Demographics', 'about/demographics'],
      ['location', 'Location', 'about/location'], ['vicinity', 'Vicinity Map', 'about/vicinity-map'],
      ['industry', 'Industry', 'about/industry'], ['services', 'Government Services', 'services?limit=100'],
      ['hymn', 'Talibon Hymn', 'about/hymn'], ['seal', 'Official Seal', 'about/seal'],
    ]) {
      const response = page.waitForResponse(response => response.url().endsWith('/api/' + endpoint));
      await page.goto('/about/' + path);
      expect((await response).status()).toBe(200);
      await expect(page.getByRole('heading', { name: heading, exact: true, level: 1 })).toBeVisible();
      await expect(page.getByRole('status', { name: 'Loading content' })).toHaveCount(0);
      await expect(page.getByRole('alert')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
    expect(errors).toEqual([]);
    await page.goto('/about');
    await expect(page).toHaveURL(/\/about\/profile$/);
    await expect(page.getByRole('main')).toContainText('BRIEF PROFILE OF TALIBON');
    await page.goto('/about/mayor');
    await expect(page).toHaveURL(/\/about\/mayors$/);
  });
}

test('About failure is retryable and empty lists do not invent content', async ({ page }) => {
  let fail = true;
  await page.route('**/api/about/profile', route => fail ? route.fulfill({ status: 503, json: { message: 'Unavailable' } }) : route.continue());
  await page.goto('/about/profile');
  await expect(page.getByRole('alert')).toContainText('Error Loading Content');
  fail = false;
  await page.getByRole('button', { name: 'Retry loading content' }).click();
  await expect(page.getByRole('main')).toContainText('BRIEF PROFILE OF TALIBON');
  await page.route('**/api/about/departments', route => route.fulfill({ json: [] }));
  await page.goto('/about/departments');
  await expect(page.getByRole('main')).toContainText('No content available at this time.');
});
