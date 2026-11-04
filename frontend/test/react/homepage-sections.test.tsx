import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { expect, it } from 'vitest';
import { server } from './server';
import SocialMediaUpdates from '../../src/components/SocialMediaUpdates';
import Location from '../../src/components/Location';
import QuickAccess from '../../src/components/QuickAccess';
import { parseSocialCache } from '../../src/services/socialUpdates';

const post = { id: 'one', title: 'Test preview content', date: '2026-11-01T00:00:00Z', url: 'https://www.facebook.com/posts/one', image: 'images/social/one.jpg' };

it('offers six task-based quick links with unchanged routes and decorative, distinct icons', () => {
  render(<MemoryRouter><QuickAccess /></MemoryRouter>);
  const nav = screen.getByRole('navigation', { name: 'What do you need today?' });
  const links = within(nav).getAllByRole('link');
  expect(links.map(link => [link.textContent, link.getAttribute('href')])).toEqual([
    ['Apply for a permit', '/services'],
    ['Request a service', '/services'],
    ['Use online services', '/e-services'],
    ['Plan a visit', '/tourism/spots'],
    ['Download forms', '/downloads'],
    ["Read the Citizen's Charter", '/transparency/charter'],
  ]);
  expect(within(nav).getAllByRole('listitem')).toHaveLength(6);
  const icons = links.map(link => link.querySelector('svg')!);
  expect(icons.every(icon => icon.getAttribute('aria-hidden') === 'true')).toBe(true);
  expect(new Set(icons.map(icon => icon.innerHTML)).size).toBe(6);
});

it('shows cached previews without a Meta embed and keeps office groups compact', async () => {
  server.use(http.get('*/data/social-updates.json', () => HttpResponse.json({ updatedAt: post.date, posts: [post] })));
  const { container } = render(<SocialMediaUpdates />);
  expect(await screen.findByRole('heading', { name: post.title })).toBeVisible();
  expect(screen.getByRole('link', { name: /Read on Facebook:/ })).toHaveAttribute('href', post.url);
  expect(container.querySelector('article img')).toHaveAttribute('src', '/images/social/one.jpg');
  expect(container.querySelector('iframe')).toBeNull();
  expect(screen.getByRole('button', { name: /More Talibon pages/ })).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('heading', { name: 'Public safety' })).not.toBeInTheDocument();
  expect(screen.getAllByRole('link', { name: /^Follow on Facebook/ })).toHaveLength(1);
});

it.each([200, 503])('has an honest compact fallback for empty or failed cache (%s)', async status => {
  server.use(http.get('*/data/social-updates.json', () => HttpResponse.json({ posts: [] }, { status })));
  render(<SocialMediaUpdates />);
  expect(await screen.findByText(/Visit the Information Office on Facebook/)).toBeVisible();
  expect(screen.getByRole('link', { name: /^Follow on Facebook/ })).toBeVisible();
});

it('rejects third-party images and unsafe permalinks, sorts dates and caps previews at three', () => {
  const posts = [1, 2, 3, 4].map(day => ({ ...post, id: String(day), date: `2026-11-0${day}T00:00:00Z` }));
  posts.push({ ...post, url: 'javascript:alert(1)' }, { ...post, image: 'https://tracking.example/pixel.jpg' });
  expect(parseSocialCache({ posts }).posts.map(item => item.id)).toEqual(['4', '3', '2']);
});

it('loads the Google map automatically and keeps directions and office details outside it', () => {
  const { container } = render(<MemoryRouter><Location /></MemoryRouter>);
  expect(container.querySelector('iframe')).toHaveAttribute('loading', 'eager');
  expect(screen.queryByRole('button', {name:'Tap to explore'})).not.toBeInTheDocument();
  expect(screen.getByTitle(/Google Maps/)).toHaveAttribute('src', expect.stringContaining('www.google.com/maps'));
  expect(screen.getByTitle(/Google Maps/)).toHaveAttribute('tabindex', '-1');
  expect(screen.queryByRole('button', { name: 'Close map' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: /^Get directions/ })).toHaveAttribute('href', expect.stringContaining('destination=Talibon%20Municipal%20Hall'));
  expect(screen.getByText('114.8 km from Tagbilaran')).toBeVisible();
  expect(screen.getByText('Confirm current hours before your visit.')).toBeVisible();
});
