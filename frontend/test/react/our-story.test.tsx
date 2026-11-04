import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { expect, it, vi } from 'vitest';
import About from '../../src/components/About';

vi.mock('motion/react', () => ({
  useReducedMotion: () => true,
  motion: { div: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div> },
}));

it('preserves the story, vision, mission, mayor identity and history route without inventing a message destination', () => {
  render(<MemoryRouter><About /></MemoryRouter>);
  const section = screen.getByRole('region', { name: 'Heritage & Progress' });
  expect(within(section).getByRole('heading', { level: 2 })).toHaveTextContent('Heritage & Progress');
  expect(section).toHaveTextContent('Talibon is a testament to resilience and the bounty of the sea. As the Seafood Capital of Bohol, we bridge our rich history with a digital-first future.');
  expect(section.querySelector('dl')).toHaveTextContent('To be a premier center of commerce and eco-tourism in Northern Bohol.');
  expect(section.querySelector('dl')).toHaveTextContent('Empowering citizens through sustainable development and digital governance.');
  expect(within(section).getByRole('heading', { level: 3 })).toHaveTextContent('Hon. Janette Aurestila-Garcia');
  expect(section).toHaveTextContent('Municipal Mayor • Talibon, Bohol');
  expect(within(section).getByRole('link', { name: 'Explore History' })).toHaveAttribute('href', '/about/history');
  expect(within(section).getAllByRole('link')).toHaveLength(1);
  const background = section.querySelector('img[alt=""]');
  expect(background).toHaveAttribute('loading', 'lazy');
  expect(within(section).getByRole('img')).toHaveAttribute('alt', 'Hon. Janette Aurestila-Garcia, Municipal Mayor of Talibon');
  section.querySelectorAll('svg').forEach(icon => expect(icon).toHaveAttribute('aria-hidden', 'true'));
});
