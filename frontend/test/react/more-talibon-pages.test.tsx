import { render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import MoreTalibonPages from '../../src/components/MoreTalibonPages';
import { OFFICIAL_FACEBOOK_URLS } from '../../src/constants';

it('shows six page chips and the all-pages link without a disclosure', () => {
  const { container } = render(<MoreTalibonPages />);
  const nav = screen.getByRole('navigation', { name: 'More Talibon pages' });
  expect(within(nav).getAllByRole('listitem')).toHaveLength(6);
  expect(within(nav).getAllByRole('link')).toHaveLength(7);
  for (const name of ['Tourism', 'PNP', 'BFP', 'SK Federation', 'PESO', 'Abante Talibon', 'All pages']) {
    const link = within(nav).getByRole('link', { name: `${name} (opens in a new tab)` });
    expect(link).toBeVisible();
    expect(link).toHaveAttribute('href', OFFICIAL_FACEBOOK_URLS.MAIN);
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  }
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  container.querySelectorAll('svg').forEach(icon => expect(icon).toHaveAttribute('aria-hidden', 'true'));
});
