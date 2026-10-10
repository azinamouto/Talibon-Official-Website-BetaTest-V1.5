import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await context.route('http://127.0.0.1:54321/**', route => route.fulfill({ json: [] }));
  await context.route('**/api/**', route => route.fulfill({ json: [] }));
});

for (const width of [375, 1280]) test(`live-record map fallback and local assistant at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 850 });
  await page.route('http://127.0.0.1:54321/rest/v1/tourism_spots?**', route => route.fulfill({ json: [
    { id: 'test-location', name: 'Published destination', description: 'Published information', location: 'Published address', google_maps_link: 'https://www.google.com/maps?q=10.15,124.33' },
    { id: 'missing-coordinate', name: 'Address only destination', description: '', location: 'Address without a pin', google_maps_link: null },
  ] }));
  const aiRequests: string[] = [];
  page.on('request', request => { if (/\/api\/chat|generativelanguage|api\.openai/.test(request.url())) aiRequests.push(request.url()); });
  await page.goto('/tourism/map');
  await expect(page.getByRole('table')).toContainText('With verified coordinates1');
  await expect(page.getByText(/The map service is unavailable/)).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('link', { name: /Directions to Published/ })).toBeVisible();
  await expect(page.getByText('Address without a pin')).toBeVisible();
  const trigger = page.getByRole('button', { name: 'Open Municipal Assistant Chat' });
  await trigger.click();
  const question = page.getByRole('textbox', { name: 'Your question' });
  await expect(question).toBeFocused();
  await question.fill('How do I apply for a business permit?');
  await question.press('Enter');
  await expect(page.getByRole('log')).toContainText('Open E-Services and choose Business Permit');
  await question.press('Escape');
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(page.getByRole('log')).toContainText('business permit?');
  await page.getByText(/Browse all topics/).click();
  await expect(page.getByRole('button', { name: 'Track an application' })).toBeVisible();
  await page.getByRole('button', { name: 'Track an application' }).click();
  await expect(page.getByRole('log')).toContainText('My submissions');
  await expect(page.getByRole('dialog')).toBeVisible();
  const dialog = await page.getByRole('dialog').boundingBox();
  expect(dialog!.x).toBeGreaterThanOrEqual(0);
  expect(dialog!.y).toBeGreaterThanOrEqual(0);
  expect(dialog!.x + dialog!.width).toBeLessThanOrEqual(width);
  expect(aiRequests).toEqual([]);
  await page.screenshot({ path: `test-results/assistant-map-${width}.png` });
  await page.getByRole('button', { name: 'Clear conversation' }).click();
  await expect(page.getByRole('log')).toBeEmpty();
});

test('empty live directory contains no invented destinations or statistics', async ({ page }) => {
  await page.goto('/tourism/map');
  await expect(page.getByText('No public locations have been posted yet.')).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(0);
  await expect(page.locator('.leaflet-container')).toHaveCount(0);
  await expect(page.getByText('12+', { exact: true })).toHaveCount(0);
});
