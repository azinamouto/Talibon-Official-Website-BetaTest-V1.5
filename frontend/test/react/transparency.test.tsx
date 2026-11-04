import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import TransparencyGovernance from '../../src/components/TransparencyGovernance';

// JSDOM has no viewport observer. Test document semantics without animation;
// the browser suite covers the actual animated cards and keyboard focus.
vi.mock('motion/react', () => ({
  useReducedMotion: () => true,
  motion: { li: ({ children, className }: { children: ReactNode; className?: string }) => <li className={className}>{children}</li> },
}));

it('preserves the four document destinations and all original logo sources and alt text', () => {
  render(<MemoryRouter><TransparencyGovernance /></MemoryRouter>);
  const section = screen.getByRole('region', { name: 'Transparency and accountability' });
  expect(within(section).getByRole('heading', { name: 'Transparency and accountability', level: 2 })).toBeVisible();
  const cards = within(section).getAllByRole('listitem');
  expect(cards).toHaveLength(4);
  const destinations = ['/transparency/budget', '/transparency/biddings', '/transparency/disclosure', '/transparency/disclosure'];
  for (const [index, card] of cards.entries()) {
    const link = within(card).getByRole('link');
    expect(link).toHaveAttribute('href', destinations[index]);
    expect(link).toHaveAccessibleName(/View documents$/);
    expect(card.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  }
  expect(within(section).getAllByRole('img').map(img => img.getAttribute('alt'))).toEqual(['Transparency Seal', 'FOI', 'Bagong Pilipinas', 'PH Seal']);
  expect(within(section).getByRole('img', { name: 'FOI' })).toHaveAttribute('src', 'https://ncda.gov.ph/wp-content/uploads/2023/06/freedom-of-information-logo.jpg');
});
