import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import BarangaySelector from '../../src/components/BarangaySelector';
import { BARANGAY_REFERENCE } from '../../src/data/barangayDirectory';

vi.mock('../../src/data/barangayDirectory', async importOriginal => {
  const actual = await importOriginal<typeof import('../../src/data/barangayDirectory')>();
  return { ...actual, BARANGAY_REFERENCE: actual.BARANGAY_REFERENCE.map(item => item.name === 'Bagacay'
    ? { ...item, captain_name: 'Fixture captain', contact_number: '0123456789', office_address: '' } : item) };
});
function setup(path = '/') {
  render(<MemoryRouter initialEntries={[path]}><BarangaySelector /></MemoryRouter>);
  return { choices: screen.getByRole('group', { name: 'Barangays' }), filters: screen.getByRole('group', { name: 'Browse by location' }) };
}
it('defaults to Poblacion with all original radios, correct type, no invented fields and existing routes', () => {
  const { choices } = setup();
  expect(within(choices).getAllByRole('radio')).toHaveLength(BARANGAY_REFERENCE.length);
  expect(within(choices).getByRole('radio', { name: 'Poblacion' })).toBeChecked();
  const card = screen.getByRole('complementary', { name: /Selected barangay Poblacion/ });
  expect(card).toHaveAttribute('aria-live', 'polite');
  expect(card).toHaveTextContent('Mainland \u00b7 Town center');
  expect(card.querySelector('dl')).toBeNull();
  expect(screen.queryByText(/\[Name\]|\[Number\]/)).not.toBeInTheDocument();
  expect(within(card).getByRole('link', { name: 'View barangay page' })).toHaveAttribute('href', '/about/barangays');
  expect(screen.getByRole('link', { name: 'View full directory' })).toHaveAttribute('href', '/about/barangays');
  expect(screen.getByRole('link', { name: /PSA reference/ })).toHaveAttribute('href', 'https://psa.gov.ph/classification/psgc/barangays/0701243000');
});
it('selects chips and only renders optional details actually present in the data', () => {
  const { choices } = setup();
  fireEvent.click(within(choices).getByRole('radio', { name: 'Bagacay' }));
  const card = screen.getByRole('complementary', { name: /Selected barangay Bagacay/ });
  expect(card).toHaveTextContent('Fixture captain');
  expect(card).toHaveTextContent('0123456789');
  expect(within(card).queryByText('Office address')).not.toBeInTheDocument();
  expect(within(card).getByRole('link', { name: 'View barangay page' })).toHaveAttribute('href', '/about/barangays');
  fireEvent.click(within(choices).getByRole('radio', { name: 'Busalian' }));
  expect(screen.getByRole('complementary', { name: /Busalian/ })).toHaveTextContent('Island');
  expect(screen.queryByText('Fixture captain')).not.toBeInTheDocument();
});
it('filters radios, keeps full counts and retains a selected barangay outside the current filter', () => {
  const { choices, filters } = setup();
  fireEvent.click(within(filters).getByRole('radio', { name: 'Island' }));
  expect(within(choices).getAllByRole('radio')).toHaveLength(8);
  expect(screen.getByRole('complementary', { name: /Poblacion/ })).toHaveTextContent('Not in the current filter');
  expect(within(filters).getByText('17')).toBeVisible();
  expect(within(filters).getByText('8')).toBeVisible();
  fireEvent.click(within(filters).getByRole('radio', { name: 'Mainland' }));
  expect(within(choices).getAllByRole('radio')).toHaveLength(17);
  expect(screen.queryByText('Not in the current filter')).not.toBeInTheDocument();
});
it('provides location filters without a search field and restores all barangays', () => {
  const { choices, filters } = setup();
  expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  fireEvent.click(within(filters).getByRole('radio', { name: 'Island' }));
  expect(within(choices).getAllByRole('radio')).toHaveLength(8);
  fireEvent.click(within(filters).getByRole('radio', { name: 'All' }));
  expect(within(choices).getAllByRole('radio')).toHaveLength(25);
});
it.each([['/#barangay=busalian', 'Busalian'], ['/#barangay=not-valid', 'Poblacion'], ['/#barangay=%zz', 'Poblacion']])('reads valid selection hashes and ignores invalid ones: %s', (path, name) => {
  setup(path);
  expect(screen.getByRole('complementary', { name: new RegExp(`Selected barangay ${name}`) })).toBeVisible();
});
