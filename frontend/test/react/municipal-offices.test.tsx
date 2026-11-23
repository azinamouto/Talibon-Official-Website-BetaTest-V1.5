import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it } from 'vitest';
import MunicipalOffices from '../../src/components/MunicipalOffices';

it('shows the six supplied office logos, descriptions and unconfirmed officials with directory links', () => {
  render(<MemoryRouter><MunicipalOffices /></MemoryRouter>);
  const section = screen.getByRole('region', { name: 'Municipal offices and departments' });
  const titles = [
    'Office of the Municipal Agriculturist', 'Municipal Treasury Office',
    'Municipal Planning and Development Office', 'Municipal Accounting Office',
    'Municipal Public Employment Service Office', 'Municipal Market Administration Office',
  ];
  const files = ['agriculture', 'treasury', 'planning', 'accounting', 'employment', 'market'];
  expect(within(section).getAllByRole('link')).toHaveLength(7);
  titles.forEach((title, i) => {
    const card = within(section).getByRole('link', { name: title });
    expect(card).toHaveAttribute('href', '/executive/directory');
    expect(within(card).getByRole('heading', { name: title })).toBeVisible();
    expect(within(card).getByText('N/A', { exact: true })).toBeVisible();
    expect(within(card).getByRole('img', { name: `${title} logo` })).toHaveAttribute('src', expect.stringContaining(`${files[i]}.png`));
    expect(card.querySelectorAll('p')).toHaveLength(3);
  });
  expect(within(section).getByRole('link', { name: 'View all offices and departments' })).toHaveAttribute('href', '/executive/directory');
});
