import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { expect, it } from 'vitest';
import { server } from './server';
import NewsTodaySection from '../../src/components/NewsTodaySection';

const news = { id: 'official-1', slug: 'official-1', title: 'Official municipal announcement', summary: 'An official update for residents.', content: '', date: '2026-09-06', category: 'Advisory', image_url: null };
const listing = (data: unknown[]) => ({ data, pagination: { page: 1, limit: 3, total: data.length, totalPages: 1 } });

it.each([0, 1, 2, 3, 6])('keeps the existing public request and destinations with %s articles', async count => {
  server.use(http.get('*/api/news', ({ request }) => {
    expect(new URL(request.url).searchParams.get('limit')).toBe('3');
    expect(request.headers.get('X-API-Version')).toBe('1');
    return HttpResponse.json(listing(Array.from({ length: count }, (_, i) => ({ ...news, id: `official-${i}`, title: `Official announcement ${i}` }))));
  }));
  render(<MemoryRouter><NewsTodaySection /></MemoryRouter>);
  const section = screen.getByRole('region', { name: 'News and announcements' });
  if (count) await within(section).findByRole('link', { name: 'Official announcement 0' });
  else await within(section).findByText('No news yet. Check back soon.');
  expect(section.querySelectorAll('[data-news-card]')).toHaveLength(count);
  expect(within(section).getByRole('link', { name: 'View all news' })).toHaveAttribute('href', '/news');
  section.querySelectorAll('[data-news-card]').forEach((card, i) => expect(card).toHaveAttribute('href', `/news/view/official-${i}`));
});

it('uses image fallbacks, omits missing categories and generic authors, and includes the year in a semantic date', async () => {
  server.use(http.get('*/api/news', () => HttpResponse.json(listing([
    { ...news, image_url: '/broken.jpg', author: 'Municipal Admin' },
    { ...news, id: 'official-2', title: 'Another official announcement', category: '', author: 'Verified reporter', date: '2026-09-07' },
    { ...news, id: 'official-3', title: 'Third official announcement', image_url: '/good.jpg' },
  ]))));
  const { container } = render(<MemoryRouter><NewsTodaySection /></MemoryRouter>);
  await screen.findByRole('link', { name: news.title });
  const image = screen.getByRole('img', { name: news.title });
  expect(image).toHaveAttribute('loading', 'lazy');
  fireEvent.error(image);
  expect(screen.queryByRole('img', { name: news.title })).not.toBeInTheDocument();
  expect(container.querySelectorAll('[data-news-placeholder]')).toHaveLength(2);
  expect(screen.queryByText('Municipal Admin')).not.toBeInTheDocument();
  expect(screen.getByText('Verified reporter')).toBeVisible();
  expect(container.querySelector('time')).toHaveAttribute('datetime', '2026-09-06');
  expect(container.querySelector('time')).toHaveTextContent('Sep 6, 2026');
  expect(within(screen.getByRole('link', { name: 'Another official announcement' })).queryByText('Advisory')).not.toBeInTheDocument();
  expect(container.querySelectorAll('[data-news-card] a')).toHaveLength(0);
});

it('excludes explicitly unpublished, draft, test and named sample records without altering the source', async () => {
  server.use(http.get('*/api/news', () => HttpResponse.json(listing([
    news, { ...news, id: 'draft', status: 'draft', title: 'Draft record' },
    { ...news, id: 'test', is_test: true, title: 'Test record' },
    { ...news, id: 'unpublished', status: 'unpublished', title: 'Unpublished record' },
    { ...news, id: 'sample-1', title: ' KIRCH POGI ' },
    { ...news, id: 'sample-2', title: 'new website release' },
  ]))));
  render(<MemoryRouter><NewsTodaySection /></MemoryRouter>);
  await screen.findByRole('link', { name: news.title });
  expect(document.querySelectorAll('[data-news-card]')).toHaveLength(1);
  expect(screen.queryByText(/KIRCH POGI|new website release|Draft record|Unpublished record|Test record/)).not.toBeInTheDocument();
});

it('preserves error/retry behavior and keeps the section heading and news destination visible', async () => {
  let fail = true;
  server.use(http.get('*/api/news', () => fail ? HttpResponse.json({}, { status: 503 }) : HttpResponse.json(listing([news]))));
  render(<MemoryRouter><NewsTodaySection /></MemoryRouter>);
  await screen.findByRole('alert');
  expect(screen.getByRole('link', { name: 'View all news' })).toBeVisible();
  fail = false;
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await screen.findByRole('link', { name: news.title });
});
