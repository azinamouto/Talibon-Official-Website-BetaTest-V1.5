import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { charterGroups, charterPdf } from '../../src/data/charterDirectory';

test.beforeEach(async ({ context }) => {
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await context.route('**/api/**', route => route.fulfill({ json: [] }));
});
for (const width of [320, 360, 768, 1280, 1920]) {
  test(`charter task tiles, office rows and search at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
    const section = page.getByRole('region', { name: 'What do you need to do today?', exact: true });
    const tasks = section.getByRole('list', { name: 'Start with a task', exact: true });
    expect(await section.locator('#charter-title').evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(34);
    const tileRadii = await tasks.locator('a, button').evaluateAll(items => items.map(item => getComputedStyle(item).borderTopLeftRadius));
    expect(new Set(tileRadii).size).toBe(1);
    await expect(tasks.locator(':scope > li')).toHaveCount(6);
    expect(await tasks.evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(width >= 1024 ? 3 : width >= 640 ? 2 : 1);
    const directory = section.getByRole('region', { name: 'Offices, grouped by what they handle', exact: true });
    const civil = directory.getByRole('list', { name: 'Civil & business services', exact: true });
    const rows = civil.getByRole('article');
    expect(await rows.first().locator('ul li').first().evaluate(el => getComputedStyle(el, '::before').content)).toBe('"–"');
    await expect(rows).toHaveCount(7);
    const bounds = await rows.evaluateAll(items => items.map(item => { const r = item.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width }; }));
    expect(new Set(bounds.map(r => r.x)).size).toBe(1);
    expect(new Set(bounds.map(r => r.width)).size).toBe(1);
    expect(bounds[1].y).toBeGreaterThan(bounds[0].y);
    const controls = tasks.locator('a, button');
    for (const control of await controls.all()) {
      await control.focus();
      await expect(control).toHaveCSS('outline-width', '3px');
      await expect(control).toHaveCSS('outline-offset', '5px');
    }
    await expect(tasks.getByRole('link', { name: /Apply for a business permit/ })).toHaveAttribute('href', `${charterPdf}#page=215`);
    await expect(tasks.getByRole('link', { name: /Apply for a building permit/ })).toHaveAttribute('href', `${charterPdf}#page=102`);
    for (const office of charterGroups.flatMap(group => group.offices).slice(0, 15)) {
      const row = directory.getByRole('article', { name: office.name, exact: true });
      const link = row.getByRole('link');
      await expect(link).toHaveAttribute('href', office.contacts ? '/executive/directory' : `${charterPdf}${office.page ? `#page=${office.page}` : ''}`);
      if (!office.contacts) await expect(link).toHaveAttribute('target', '_blank');
    }
    const search = section.getByRole('searchbox', { name: 'Search offices and services' });
    await search.fill('birth certificate');
    await expect(section.getByRole('status')).toHaveText('1 matching office');
    await expect(directory.getByRole('heading', { name: 'Local Civil Registry Office' })).toBeVisible();
    await search.fill('HRMO');
    await expect(directory.getByRole('heading', { name: 'Human Resource Management Office' })).toBeVisible();
    await search.fill('unmatched-service-999');
    await expect(directory.getByRole('heading', { name: 'No offices found' })).toBeVisible();
    await section.getByRole('button', { name: 'Show all offices' }).click();
    const summary = section.locator('summary');
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(summary).toHaveAttribute('aria-expanded', 'true');
    await expect(directory.getByRole('heading', { name: 'Human Resource Management Office' })).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(summary).toHaveAttribute('aria-expanded', 'false');
    await tasks.getByRole('button', { name: 'Declare property for tax Find the office' }).click();
    await expect(directory.getByRole('heading', { name: 'Assessor’s Office' })).toBeVisible();
    await expect(section.getByRole('status')).toBeFocused();
    await section.getByRole('button', { name: 'Clear search' }).click();
    await expect(section.getByRole('navigation', { name: 'Office groups' }).getByRole('link')).toHaveCount(3);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await section.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    mkdirSync('node_modules/.cache/charter-review', { recursive: true });
    await section.screenshot({ path: `node_modules/.cache/charter-review/after-${width}.png`, animations: 'disabled', style: 'header, nav[aria-label="Main Navigation"] { visibility: hidden !important; }' });
  });
}
