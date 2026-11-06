import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import DirectoryView from '../../src/pages/executive/DirectoryView';
import { charterGroups } from '../../src/data/charterDirectory';

it('renders the complete existing roster and preserves supplied placeholder contacts', () => {
  render(<DirectoryView data={[{ department: "Mayor's Office", contact: '038-123-4567' }, { department: "Treasurer's Office", contact: '038-123-4568' }]} />);
  expect(screen.getAllByRole('article')).toHaveLength(charterGroups.flatMap(group => group.offices).length);
  expect(screen.getByRole('link', { name: /Call Mayor/ })).toHaveAttribute('href', 'tel:0381234567');
  expect(screen.getByRole('link', { name: /Call Treasurer/ })).toHaveTextContent('038-123-4568');
  expect(screen.getAllByRole('link')).toHaveLength(2);
  expect(screen.getAllByText('Contact number not listed')).toHaveLength(17);
});
it('keeps directory-only entries rather than dropping them', () => {
  render(<DirectoryView data={[{ department: 'Additional office', contact: '+63 38 123 4567' }]} />);
  expect(screen.getByRole('heading', { name: 'Additional office' })).toBeVisible();
  expect(screen.getByRole('link')).toHaveAttribute('href', 'tel:+63381234567');
});
