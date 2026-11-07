import { render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import MayorsView, { splitEraTitle, splitMayorTerm } from '../../src/pages/about/MayorsView';
const data = JSON.parse(readFileSync(resolve('test/fixtures/about-mayors.json'), 'utf8'));

it('preserves every mayor, duplicate entry, era and commentary in source order', () => {
  const original = JSON.stringify(data);
  render(<MayorsView data={data} />);
  const eras = screen.getAllByRole('region');
  expect(eras).toHaveLength(data.length);
  data.forEach((era, index) => {
    const region = within(eras[index]);
    expect(region.getAllByRole('heading', { level: 3 }).map(h => h.textContent)).toEqual(era.mayors.map(m => m.name));
    expect(region.getByRole('heading', { level: 2 })).toHaveTextContent(splitEraTitle(era.section).title);
    era.mayors.forEach((mayor, mayorIndex) => {
      const details = splitMayorTerm(mayor.term);
      const card = within(region.getAllByRole('listitem')[mayorIndex]);
      if(details.term) expect(card.getByText(`Term: ${details.term}`)).toBeVisible();
      if(details.note) expect(card.getByText(details.note)).toBeVisible();
    });
    if(era.commentary) {
      expect(eras[index]).toHaveTextContent(era.commentary.content.replace(/\s+/g, ' '));
      expect(eras[index]).toHaveTextContent(era.commentary.source);
    }
  });
  expect(screen.getAllByRole('link').map(link => link.getAttribute('aria-label'))).toEqual(data.map(era => era.section));
  expect(JSON.stringify(data)).toBe(original);
});
it('separates dates and notes without rewriting either', () => {
  expect(splitMayorTerm('1942-1943 (Died in office; execution)')).toEqual({ term: '1942-1943', note: 'Died in office; execution' });
  expect(splitEraTitle('Municipal Mayors in the Fifth Philippine Republic (1986 to present)')).toEqual({ title: 'Municipal Mayors in the Fifth Philippine Republic', range: '(1986 to present)' });
  expect(splitEraTitle('Era without dates')).toEqual({ title: 'Era without dates', range: '' });
});
it('displays missing terms and keeps continuous ordered-list numbering', () => {
  render(<MayorsView data={data} />);
  expect(screen.getAllByText('Term not recorded')).toHaveLength(data.flatMap(era => era.mayors).filter(m => !m.term).length);
  let next = 1;
  screen.getAllByRole('list').forEach((list, index) => {
    expect(list).toHaveAttribute('start', String(next));
    next += data[index].mayors.length;
  });
  expect(screen.getAllByRole('heading', { name: 'Policronio Garcia, Sr.' })).toHaveLength(2);
});
it('retains the empty state', () => {
  render(<MayorsView data={[]} />);
  expect(screen.getByText('No data available.')).toBeVisible();
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
});
