import { expect, test } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const artifacts = resolve('node_modules/.cache/emergency-theme');
const baseline = process.env.TALWEB_EMERGENCY_BASELINE === '1';
for (const width of [360, 768, 1280, 1920]) {
  test(`emergency palette preserves geometry and numbers at ${width}px`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 1100 });
    await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    await context.route('**/api/**', route => route.fulfill({ json: [] }));
    await page.goto('/');
    await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; } #emergency [class*="hotlineCard"] { transform: none !important; opacity: 1 !important; transition: none !important; }' });
    const section = page.locator('#emergency');
    await section.evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
    const cards = section.locator('[class*="hotlineCard"]');
    await expect(cards).toHaveCount(4);
    for (const card of await cards.all()) await expect(card).toHaveCSS('opacity', '1');
    const measurements = await section.evaluate(el => {
      const origin = el.getBoundingClientRect();
      const nodes = [el, ...el.querySelectorAll('h2, h3, p, a, svg, [class*="hotlineCard"], [class*="hotlineGrid"], [class*="hotlineIcon"], [class*="landline"]')];
      return nodes.map(node => {
        const box = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return { tag: node.tagName, x: Math.round((box.x - origin.x) * 10) / 10, y: Math.round((box.y - origin.y) * 10) / 10,
          width: box.width, height: box.height, padding: style.padding, gap: style.gap,
          fontSize: style.fontSize, backdropFilter: style.backdropFilter,
          href: node.getAttribute('href'), path: node.tagName.toLowerCase() === 'svg' ? node.innerHTML : null };
      });
    });
    mkdirSync(artifacts, { recursive: true });
    if (baseline) writeFileSync(resolve(artifacts, `before-${width}.json`), JSON.stringify(measurements));
    else {
      const before = resolve(artifacts, `before-${width}.json`);
      if (existsSync(before)) expect(measurements).toEqual(JSON.parse(readFileSync(before, 'utf8')));
      // abf0762 intentionally removed the emoji and darkened the emergency surface.
      await expect(section.getByRole('img', { name: 'Siren', exact: true })).toHaveText('');
      await expect(section).toHaveCSS('background-color', 'rgb(114, 11, 11)');
      await expect(section).toHaveCSS('background-image', 'none');
      expect(await section.getByRole('link').evaluateAll(links => links.map(link => link.getAttribute('href')))).toEqual([
        'tel:09291523330', 'tel:09173230117', 'tel:09985986433', 'tel:09463360021', 'tel:09458627931',
      ]);
      const contrast = await section.evaluate(el => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        const ctx = canvas.getContext('2d')!;
        const luminance = (rgb: number[]) => rgb.map(c => c / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4)
          .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
        // Conservative bound: the flat red surface plus 20% white,
        // brighter than the combined glows, watermark and 10% hover glass.
        const background = [114, 11, 11].map(c => c * .8 + 255 * .2);
        return [...el.querySelectorAll('h2, h3, p, a')].map(node => {
          ctx.clearRect(0, 0, 1, 1);
          ctx.fillStyle = getComputedStyle(node).color;
          ctx.fillRect(0, 0, 1, 1);
          const rgba = [...ctx.getImageData(0, 0, 1, 1).data];
          const alpha = rgba[3] / 255;
          const foreground = rgba.slice(0, 3).map((c, index) => c * alpha + background[index] * (1 - alpha));
          const a = luminance(foreground), b = luminance(background);
          return { text: node.textContent?.trim(), ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) };
        });
      });
      for (const pair of contrast) expect(pair.ratio, pair.text).toBeGreaterThanOrEqual(4.5);
      console.log(JSON.stringify({ width, minimumTextContrast: Math.min(...contrast.map(pair => pair.ratio)) }));
      const links = section.getByRole('link');
      await links.first().focus();
      await expect(links.first()).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(links.nth(1)).toBeFocused();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(section.getByRole('img', { name: 'Siren', exact: true })).toHaveCSS('animation-name', 'none');
    }
    await expect(section.getByText('Landline: (038) 510-1980')).toBeVisible();
    // Decorative glows intentionally extend beyond the section and are clipped.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await section.screenshot({ path: resolve(artifacts, `${baseline ? 'before' : 'after'}-${width}.png`) });
  });
}
