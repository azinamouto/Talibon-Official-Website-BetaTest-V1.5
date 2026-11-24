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
function setup() {
  render(<MemoryRouter><BarangaySelector /></MemoryRouter>);
  return screen.getByRole('group', { name: 'Browse by location' });
}
it('shows six barangay cards with seals, supplied details and the full directory link', () => {
  setup();
  const cards = screen.getAllByRole('article');
  expect(cards).toHaveLength(6);
  expect(within(cards[0]).getByRole('heading', { name: 'Bagacay' })).toBeVisible();
  expect(within(cards[0]).getByRole('img', { name: 'Barangay Bagacay official seal' })).toBeVisible();
  expect(cards[0]).toHaveTextContent('Fixture captain');
  expect(cards[0]).toHaveTextContent('0123456789');
  expect(within(cards[0]).queryByText('Office address')).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Showing 1–6 of 25 barangays');
  expect(screen.getByRole('link', { name: 'View full directory' })).toHaveAttribute('href', '/about/barangays');
  expect(screen.getByRole('link', { name: /PSA reference/ })).toHaveAttribute('href', 'https://psa.gov.ph/classification/psgc/barangays/0701243000');
  expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
});
it('paginates all barangays and resets to the first page when filtering', () => {
  const filters = setup();
  expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
  for (let page = 1; page < 5; page++) fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getAllByRole('article')).toHaveLength(1);
  expect(screen.getByRole('heading', { name: 'Zamora' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  fireEvent.click(within(filters).getByRole('radio', { name: 'Island' }));
  expect(screen.getByRole('status')).toHaveTextContent('Showing 1–6 of 8 barangays');
  expect(screen.getByRole('heading', { name: 'Busalian' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getAllByRole('article')).toHaveLength(2);
  fireEvent.click(within(filters).getByRole('radio', { name: 'Mainland' }));
  expect(screen.getByRole('status')).toHaveTextContent('Showing 1–6 of 17 barangays');
  fireEvent.click(within(filters).getByRole('radio', { name: 'All' }));
  expect(screen.getByRole('status')).toHaveTextContent(`of ${BARANGAY_REFERENCE.length} barangays`);
});
