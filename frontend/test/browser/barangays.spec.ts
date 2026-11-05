import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const artifacts = resolve('node_modules/.cache/barangay-picker');
test.beforeEach(async ({ context }) => {
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await context.route('**/api/**', route => route.fulfill({ json: [] }));
});
for (const width of [320, 360, 375, 768, 1280, 1920]) test(`barangay picker, native keys and responsive details at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto('/');
  await page.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
  const section = page.getByRole('region', { name: 'Barangays of Talibon' });
  await section.scrollIntoViewIfNeeded();
  const choices = section.getByRole('group', { name: 'Barangays' });
  const filters = section.getByRole('group', { name: 'Browse by location' });
  const card = section.getByRole('complementary');
  await expect(choices.getByRole('radio')).toHaveCount(25);
  await expect(choices.getByRole('radio', { name: 'Poblacion', exact: true })).toBeChecked();
  await expect(card).toHaveText(/Mainland.*Town center/);
  await expect(card.locator('dl')).toHaveCount(0);
  const search = section.getByRole('searchbox', { name: 'Find a barangay' });
  await search.focus();
  await page.keyboard.press('Tab');
  await expect(filters.getByRole('radio', { name: 'All', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(filters.getByRole('radio', { name: 'Mainland', exact: true })).toBeChecked();
  await expect(choices.getByRole('radio')).toHaveCount(17);
  await page.keyboard.press('ArrowRight');
  await expect(filters.getByRole('radio', { name: 'Island', exact: true })).toBeChecked();
  await expect(choices.getByRole('radio')).toHaveCount(8);
  await expect(card).toContainText('Not in the current filter');
  await page.keyboard.press('Tab');
  // DOM order is filters, details, chips, matching the mobile reading order.
  await expect(card.getByRole('link', { name: 'View barangay page' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(choices.getByRole('radio').first()).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(choices.getByRole('radio', { name: 'Calituban', exact: true })).toBeChecked();
  await expect(card.getByRole('heading')).toHaveText('Calituban');
  await expect(page).toHaveURL(/#barangay=calituban$/);
  await expect(card.getByRole('link')).toHaveAttribute('href', '/about/barangays');
  await search.fill('santo nino');
  await filters.getByRole('radio', { name: 'All', exact: true }).locator('..').click();
  await expect(choices.getByRole('radio')).toHaveCount(1);
  await expect(card.getByRole('heading')).toHaveText('Santo Ni\u00f1o');
  await search.fill('unmatched-name-123');
  await expect(section.getByText('No barangay found. Try a different spelling or clear the filter.')).toBeVisible();
  await section.getByRole('button', { name: 'Reset search and filters' }).click();
  await choices.getByRole('radio', { name: 'Poblacion', exact: true }).locator('..').click();
  if (width < 900) await expect(card).toBeInViewport({ ratio: 1 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const chip = choices.getByRole('radio', { name: 'Poblacion', exact: true });
  await page.keyboard.press('Tab');
  await chip.focus();
  await expect(chip.locator('..').locator('span').first()).toHaveCSS('outline-width', '3px');
  await expect(chip.locator('..').locator('span').first()).toHaveCSS('transition-duration', '0s');
  const chipBox = await choices.boundingBox(), filterBox = await filters.boundingBox(), cardBox = await card.boundingBox();
  if (width >= 900) { expect(cardBox!.width).toBe(400); expect(cardBox!.x).toBeGreaterThan(chipBox!.x); expect(Math.abs(cardBox!.y-filterBox!.y)).toBeLessThan(1); }
  else { expect(cardBox!.y).toBeGreaterThan(filterBox!.y); expect(chipBox!.y).toBeGreaterThanOrEqual(cardBox!.y+cardBox!.height); }
  for (const name of ['San Francisco', 'Santo Ni\u00f1o']) {
    const input = choices.getByRole('radio', { name, exact: true });
    expect(await input.locator('..').locator('span').first().evaluate(el => el.getBoundingClientRect().height)).toBe(48);
  }
  await chip.blur();
  await page.mouse.move(0, 0);
  mkdirSync(artifacts, { recursive: true });
  await section.screenshot({ path: resolve(artifacts, `after-${width}.png`), style: 'header,header *{display:none!important}' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/#barangay=busalian');
  await expect(section.getByRole('complementary').getByRole('heading')).toHaveText('Busalian');
});
