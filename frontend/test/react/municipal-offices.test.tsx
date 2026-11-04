import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it } from 'vitest';
import MunicipalOffices from '../../src/components/MunicipalOffices';

it('preserves the four officials in order with one accessible directory link per card and correct elected role', () => {
  render(<MemoryRouter><MunicipalOffices /></MemoryRouter>);
  const section = screen.getByRole('region', { name: 'Municipal offices and departments' });
  const pairs = [
    ['Office of the Municipal Mayor', 'Hon. Michael I. Doria'],
    ['Municipal Planning & Development Coordinator', 'Elmer B. Magalona'],
    ['Office of the Municipal Local Civil Registrar', 'Juliet D. Lumbo-an'],
    ['Office of the Municipal Budget Officer', 'Rogelia L. Cellan'],
  ];
  const links = within(section).getAllByRole('link');
  expect(links).toHaveLength(5);
  pairs.forEach(([title, person], i) => {
    expect(links[i]).toHaveAccessibleName(`${title} ${person}`);
    expect(links[i]).toHaveAttribute('href', '/executive/directory');
    expect(within(links[i]).getAllByRole('heading')).toHaveLength(1);
    expect(links[i].querySelectorAll('a')).toHaveLength(0);
    expect(links[i]).toHaveTextContent(i === 0 ? 'Municipal Mayor' : 'Department head');
  });
  expect(links[4]).toHaveAccessibleName('View all offices and departments');
  expect(links[4]).toHaveAttribute('href', '/executive/directory');
  section.querySelectorAll('svg').forEach(icon => expect(icon).toHaveAttribute('aria-hidden', 'true'));
  expect(section).not.toHaveTextContent('TALIBON');
});
