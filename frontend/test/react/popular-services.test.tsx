import { render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import PopularServices from '../../src/components/PopularServices';

it('explains availability and offers the existing charter and information routes', () => {
  render(<MemoryRouter><PopularServices /></MemoryRouter>);
  const section = screen.getByRole('region', { name: 'Electronic services' });
  expect(within(section).getByRole('heading', { level: 2 })).toHaveTextContent('Electronic services');
  expect(within(section).getByText('Coming soon')).toBeVisible();
  expect(section).toHaveTextContent("requirements, fees and processing times in the Citizen's Charter and visit the office in person");
  expect(within(section).getByRole('link', { name: 'See how to get services today' })).toHaveAttribute('href', '/transparency/charter');
  expect(within(section).getByRole('link', { name: 'Electronic services information' })).toHaveAttribute('href', '/e-services');
  expect(within(section).getAllByRole('link')).toHaveLength(2);
});

it('does not promise unconfirmed services or dates and hides decorative icons', () => {
  render(<MemoryRouter><PopularServices /></MemoryRouter>);
  expect(screen.queryByText(/To Be Implemented|Planned for residents|Online payments|Track your request|Not yet available/)).not.toBeInTheDocument();
  expect(document.querySelector('form, input, time')).toBeNull();
  const icons = document.querySelectorAll('svg');
  expect(icons).toHaveLength(3);
  icons.forEach(icon => expect(icon).toHaveAttribute('aria-hidden', 'true'));
});
