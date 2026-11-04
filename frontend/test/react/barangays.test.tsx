import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it } from 'vitest';
import BarangaySelector from '../../src/components/BarangaySelector';

function setup() {
  render(<MemoryRouter><BarangaySelector /></MemoryRouter>);
  return {
    search: screen.getByRole('searchbox', { name: 'Find a barangay' }),
    cards: () => within(screen.getByRole('list', { name: 'Barangays' })).getAllByRole('listitem'),
  };
}

it('starts compact, expands the reference list, and makes the directory destination explicit', () => {
  const { cards } = setup();
  expect(cards()).toHaveLength(8);
  expect(screen.getByRole('status')).toHaveTextContent('Showing 8 of 25 barangays');
  expect(screen.getByRole('link', { name: 'View full directory' })).toHaveAttribute('href', '/about/barangays');
  expect(within(screen.getByRole('list', { name: 'Barangays' })).getAllByRole('link')).toHaveLength(8);
  expect(screen.getByRole('link', { name: 'Bagacay Mainland barangay' })).toHaveAttribute('href', '/about/barangays');
  expect(screen.getByRole('group', { name: 'Browse by location' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Browse all 25 barangays' }));
  expect(cards()).toHaveLength(25);
  expect(screen.getByRole('link', { name: 'Poblacion Poblacion · Mainland' })).toHaveAttribute('href', '/about/barangays');
  expect(screen.getByRole('heading', { name: 'Calituban' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Zamora' })).toBeVisible();
  expect(screen.queryByRole('heading', { name: 'San Juan' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Show fewer barangays' }));
  expect(cards()).toHaveLength(8);
});

it('browses verified island communities and keeps Poblacion included in the mainland', () => {
  const { cards } = setup();
  fireEvent.click(screen.getByRole('button', { name: 'Island' }));
  expect(cards()).toHaveLength(8);
  expect(screen.getByRole('heading', { name: 'Suba' })).toBeVisible();
  expect(screen.queryByRole('heading', { name: 'Poblacion' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Island' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Mainland' }));
  expect(cards()).toHaveLength(17);
  expect(screen.getByRole('heading', { name: 'Poblacion' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Poblacion' }));
  expect(cards()).toHaveLength(1);
  expect(screen.getByRole('status')).toHaveTextContent('Showing 1 of 1 barangay');
});

it('filters instantly with accent-insensitive matching and resets a no-results state', () => {
  const { search, cards } = setup();
  fireEvent.change(search, { target: { value: '  nInO  ' } });
  expect(cards()).toHaveLength(1);
  expect(screen.getByRole('heading', { name: 'Santo Niño' })).toBeVisible();
  fireEvent.change(search, { target: { value: 'unmatched-name-123' } });
  expect(screen.getByRole('heading', { name: 'No barangay found' })).toBeVisible();
  expect(screen.getByRole('status')).toHaveTextContent('No matching barangays');
  fireEvent.click(screen.getByRole('button', { name: 'Reset search and filters' }));
  expect(search).toHaveValue('');
  expect(cards()).toHaveLength(8);
  expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
});

it('combines the name query with geography and shows matches beyond the initial preview', () => {
  const { search, cards } = setup();
  fireEvent.click(screen.getByRole('button', { name: 'Mainland' }));
  fireEvent.change(search, { target: { value: 'Guindacpan' } });
  expect(screen.getByRole('heading', { name: 'No barangay found' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Island' }));
  expect(cards()).toHaveLength(1);
  expect(screen.getByRole('heading', { name: 'Guindacpan' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'All' }));
  fireEvent.change(search, { target: { value: 'Zamora' } });
  expect(cards()).toHaveLength(1);
  expect(screen.getByRole('heading', { name: 'Zamora' })).toBeVisible();
});
