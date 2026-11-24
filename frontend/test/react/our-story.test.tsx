import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { useInView } from 'motion/react';
import About from '../../src/components/About';

vi.mock('motion/react', () => ({ useInView: vi.fn(() => true) }));

it('preserves the Mayor message, official identity, real assets and history destination', () => {
  render(<MemoryRouter><About /></MemoryRouter>);
  const section = screen.getByRole('region', { name: 'A message from the Mayor' });
  expect(within(section).getByRole('heading', { level: 2 })).toHaveTextContent('A message from the Mayor');
  const paragraphs = section.querySelectorAll('.mayor-paragraphs p');
  expect(Array.from(paragraphs, paragraph => paragraph.textContent)).toEqual([
    'As the home of the late President Carlos P. Garcia, we carry a legacy of greatness.',
    "As Bohol's Seafood Capital, we invite you to experience the bounty of our seas and the warmth of our community.",
    'Together, let us continue to build a brighter, more prosperous future for every Talibongnon.',
  ]);
  expect(section.querySelector('dl')).toHaveTextContent('To be a premier center of commerce and eco-tourism in Northern Bohol.');
  expect(section.querySelector('dl')).toHaveTextContent('Empowering citizens through sustainable development and digital governance.');
  expect(within(section).getByText('Hon. Janette Aurestila-Garcia')).toBeVisible();
  expect(section).toHaveTextContent('Municipal Mayor of Talibon, Bohol');
  expect(within(section).getByRole('link', { name: "Read Talibon's history" })).toHaveAttribute('href', '/about/history');
  expect(within(section).getAllByRole('link')).toHaveLength(1);
  expect(section.querySelector('img[alt=""]')).toHaveAttribute('src', '/images/heritage-coast.jpg');
  expect(within(section).getByRole('img', { name: 'Mayor Janette Aurestila-Garcia' })).toHaveAttribute('src', '/images/mayor-janette.webp');
  expect(within(section).getByRole('img', { name: 'Municipal seal of Talibon' })).toHaveAttribute('src', '/images/talibon-official-seal.png');
  // Screen readers receive the complete welcome once, rather than animated fragments.
  expect(section.querySelector('.mayor-quote > .sr-only')).toHaveTextContent('Dajon kamo sa atong matahum nga Talibon!');
  expect(section.querySelector('.mayor-word')?.closest('[aria-hidden]')).toHaveAttribute('aria-hidden', 'true');
});

it('keeps the message present before its viewport animations are triggered', () => {
  vi.mocked(useInView).mockReturnValueOnce(false).mockReturnValueOnce(false);
  render(<MemoryRouter><About /></MemoryRouter>);
  const section = screen.getByRole('region', { name: 'A message from the Mayor' });
  expect(section).toHaveAttribute('data-welcome-entered', 'false');
  expect(section.querySelector('.mayor-values')).toHaveAttribute('data-values-entered', 'false');
  expect(within(section).getByText('Hon. Janette Aurestila-Garcia')).toBeVisible();
  expect(within(section).getByRole('link', { name: "Read Talibon's history" })).toBeVisible();
});
