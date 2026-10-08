import { test, expect } from '@playwright/test';

test('public catalog and news render the shared contract server and search opens its service', async ({ page, context, request }) => {
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await context.route('http://127.0.0.1:54321/**', route => route.fulfill({ json: [] }));
  const services = await (await request.get('/api/services')).json();
  const news = await (await request.get('/api/news')).json();
  await page.goto('/services');
  await page.getByRole('link', { name: new RegExp(services.data[0].name) }).click();
  await expect(page.getByRole('heading', { name: services.data[0].name, exact: true, level: 1 })).toBeVisible();
  await page.goto('/news');
  await page.getByRole('link', { name: news.data[0].title, exact: true }).click();
  await expect(page.getByRole('heading', { name: news.data[0].title, exact: true, level: 1 })).toBeVisible();
  await page.getByTitle('Search', { exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search the site' }).fill(services.data[0].name);
  await page.getByRole('dialog').locator(`a[href="/services/${services.data[0].id}"]`).click();
  await expect(page.getByRole('heading', { name: services.data[0].name, exact: true, level: 1 })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/services/${services.data[0].id}$`));
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
