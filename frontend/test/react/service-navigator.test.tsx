import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse, delay } from 'msw';
import { expect, it } from 'vitest';
import { server } from './server';
import ServiceNavigator from '../../src/components/ServiceNavigator';

const listing = { data: [{ id: 'service-1', slug: 'service-1', name: 'Published service', description: 'Published requirements' }], pagination: { page: 1, limit: 6, total: 1, totalPages: 1 } };

it('shows skeletons while loading, then retains the existing service request and routes', async () => {
  server.use(http.get('*/api/services', async ({ request }) => {
    expect(new URL(request.url).searchParams.get('limit')).toBe('6');
    await delay(50);
    return HttpResponse.json(listing);
  }));
  render(<MemoryRouter><ServiceNavigator /></MemoryRouter>);
  expect(screen.getByRole('status', { name: 'Loading municipal services' })).toBeVisible();
  expect(screen.getByRole('link', { name: 'View all services' })).toHaveAttribute('href', '/services');
  expect(screen.queryByText('View all services ?')).not.toBeInTheDocument();
  expect(await screen.findByRole('link', { name: /Published service/ })).toHaveAttribute('href', '/services/service-1');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

it('shows the compact connection message and successfully retries the same request', async () => {
  let fail = true;
  server.use(http.get('*/api/services', () => fail ? HttpResponse.json({}, { status: 503 }) : HttpResponse.json(listing)));
  render(<MemoryRouter><ServiceNavigator /></MemoryRouter>);
  const error = await screen.findByRole('alert');
  expect(error).toHaveTextContent("Services couldn't load. Check your connection and try again.");
  expect(screen.queryByText('Unable to load content. Please try again.')).not.toBeInTheDocument();
  expect(within(error).getByRole('button', { name: 'Try again' })).toBeEnabled();
  fail = false;
  fireEvent.click(within(error).getByRole('button', { name: 'Try again' }));
  await screen.findByRole('link', { name: /Published service/ });
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
