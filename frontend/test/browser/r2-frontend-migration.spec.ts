import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await context.route('**/api/**', route => route.fulfill({ json: [] }));
  await context.route('**/api/media?**', route => route.fulfill({ json: { data: [], hasMore: false } }));
  await context.route('**/api/staff/me', route => route.fulfill({ status: 401, json: { message: 'Unauthorized' } }));
});

test('download and legislative pages omit incomplete placeholder records', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.route('**/api/forms/downloadable', route => route.fulfill({ json: [{ id: 'test-form', title: 'Unpublished form', url: '#' }] }));
  await page.route('**/api/legislative/ordinances', route => route.fulfill({ json: [{ id: 'test-ordinance', title: 'Unpublished ordinance', date: '2024-01-01' }] }));
  await page.route('**/api/legislative/resolutions', route => route.fulfill({ json: [{ id: 'test-resolution', title: 'Unpublished resolution', date: '2024-01-01' }] }));

  await page.goto('/downloads');
  await expect(page.getByText('No downloadable files are currently published.')).toBeVisible();
  await expect(page.getByText('Unpublished form')).toHaveCount(0);

  await page.goto('/legislative/ordinances');
  await expect(page.getByText('No published ordinances are currently available.')).toBeVisible();
  await expect(page.getByText('Unpublished ordinance')).toHaveCount(0);

  await page.goto('/legislative/resolutions');
  await expect(page.getByText('No published resolutions are currently available.')).toBeVisible();
  await expect(page.getByText('Unpublished resolution')).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});

test('organizational chart and tourism map render from same-origin API records', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.route('**/api/executive/chart', route => route.fulfill({ json: {
    title: 'Organizational Chart',
    mayor: { name: 'Test Mayor', role: 'Municipal Mayor' },
    level2: [],
    departments: [],
  } }));
  await page.route('**/api/tourism/spots', route => route.fulfill({ json: [
    { id: 'test-location', name: 'Test Location', description: 'Public listing', location: 'Test address', google_maps_link: null },
  ] }));

  await page.goto('/executive/chart');
  await expect(page.getByText('Test Mayor')).toBeVisible();
  await page.goto('/tourism/map');
  await expect(page.getByRole('heading', { name: 'Public location coverage' })).toBeVisible();
  await expect(page.getByText('Test Location')).toBeVisible();
  await expect(page.getByText('Test address')).toBeVisible();
  await expect(page.getByText(/Map coordinates are not available/)).toBeVisible();
  expect(pageErrors).toEqual([]);
});
