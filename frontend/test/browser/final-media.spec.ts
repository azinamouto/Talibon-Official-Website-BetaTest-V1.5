import { test, expect } from '@playwright/test';
for (const width of [375, 1280]) test(`published documents and photo gallery at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.route('**/api/**', route => route.fulfill({ json: [] }));
  await page.route('**/api/media?**', route => route.fulfill({ json: { data: route.request().url().includes('kind=document') ?
    [{ id: 'doc-test', title: 'Published test document', category: 'Test category', bytes: 200, download_url: '/api/media/doc-test/download' }] :
    [{ id: 'photo-test', title: 'Published test photo', alt_text: 'Test image', download_url: '/api/media/photo-test/download' }], hasMore: false } }));
  await page.route('**/api/media/photo-test/preview', route => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5XkAAAAASUVORK5CYII=', 'base64') }));
  await page.goto('/downloads');
  await expect(page.getByText('Published test document')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Download File' })).toHaveAttribute('href','/api/media/doc-test/download');
  await expect(page.getByRole('img', { name: 'Test image' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
test('empty media and unavailable media have distinct honest states', async ({ page }) => {
  await page.route('**/api/**', route => route.fulfill({ json: [] }));
  await page.route('**/api/media?**', route => route.fulfill({ json: { data: [], hasMore: false } }));
  await page.goto('/downloads'); await expect(page.getByText('No downloadable files are currently published.')).toBeVisible();
  await expect(page.getByText('No photos are currently published.')).toBeVisible();
  await page.route('**/api/media?**', route => route.fulfill({ status: 503, json: { message: 'Unavailable' } }));
  await page.reload(); await expect(page.getByText('Photos are temporarily unavailable.')).toBeVisible();
});
