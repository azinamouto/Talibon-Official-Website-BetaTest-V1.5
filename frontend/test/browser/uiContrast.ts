import type { Locator } from '@playwright/test';

/** Composite translucent surfaces and conservatively check every gradient stop. */
export function textContrast(section: Locator) {
  return section.evaluate(root => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d')!;
    const rgba = (value: string) => {
      ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = value; ctx.fillRect(0, 0, 1, 1);
      return [...ctx.getImageData(0, 0, 1, 1).data];
    };
    const composite = (front: number[], back: number[]) => {
      const alpha = front[3] / 255;
      return [...front.slice(0, 3).map((v, i) => v * alpha + back[i] * (1 - alpha)), 255];
    };
    const luminance = (value: number[]) => value.slice(0, 3).map(v => v / 255)
      .map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
      .reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
    const stops = (value: string) => {
      const input = value.slice(value.indexOf('(') + 1, -1);
      const parts: string[] = []; let depth = 0, start = 0;
      for (let i = 0; i < input.length; i++) {
        if (input[i] === '(') depth++;
        if (input[i] === ')') depth--;
        if (input[i] === ',' && depth === 0) { parts.push(input.slice(start, i)); start = i + 1; }
      }
      parts.push(input.slice(start));
      return parts.slice(1).map(part => rgba(part.trim().replace(/\s+[\d.]+(?:%|px)$/, '')));
    };
    return [...root.querySelectorAll('h2,h3,h4,p,time,address,a,button')]
      .filter(node => !node.closest('.sr-only') && (node as HTMLElement).checkVisibility())
      .map(node => {
        let parent: Element | null = node;
        const layers: number[][] = []; let backgrounds: number[][] = [[255, 255, 255, 255]];
        while (parent) {
          const style = getComputedStyle(parent);
          if (style.backgroundImage.startsWith('linear-gradient(')) {
            backgrounds = stops(style.backgroundImage); break;
          }
          const color = rgba(style.backgroundColor); layers.push(color);
          if (color[3] === 255) break;
          parent = parent.parentElement;
        }
        backgrounds = backgrounds.map(background => [...layers].reverse().reduce((back, front) => composite(front, back), background));
        const foreground = rgba(getComputedStyle(node).color);
        const ratio = Math.min(...backgrounds.map(background => {
          const a = luminance(composite(foreground, background)), b = luminance(background);
          return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
        }));
        return { text: node.textContent?.trim(), ratio };
      });
  });
}
