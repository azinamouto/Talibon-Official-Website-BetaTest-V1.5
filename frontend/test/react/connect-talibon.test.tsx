import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { expect, it } from 'vitest';
import { server } from './server';
import ConnectWithTalibon from '../../src/components/ConnectWithTalibon';
import { OFFICIAL_FACEBOOK_URLS } from '../../src/constants';

it.each([200, 503])('keeps the Facebook fallback and all office destinations usable when no previews are available (%s)', async status => {
  server.use(http.get('*/data/social-updates.json', () => HttpResponse.json({ posts: [] }, { status })));
  render(<MemoryRouter><ConnectWithTalibon /></MemoryRouter>);
  const section = screen.getByRole('region', { name: 'Connect with Talibon' });
  expect(within(section).getByRole('heading', { name: 'Connect with Talibon', level: 2 })).toBeVisible();
  expect(await within(section).findByText(/Visit the Information Office on Facebook/)).toBeInTheDocument();
  expect(section.querySelectorAll('article')).toHaveLength(0);
  expect(within(section).getByRole('link', { name: /^Follow on Facebook/ })).toHaveAttribute('href', OFFICIAL_FACEBOOK_URLS.PIO);
  fireEvent.click(within(section).getByRole('button', { name: /More Talibon pages/ }));
  const officeLinks = section.querySelectorAll('#social-updates li a');
  expect(officeLinks).toHaveLength(6);
  officeLinks.forEach(link => expect(link).toHaveAttribute('href', OFFICIAL_FACEBOOK_URLS.MAIN));
  section.querySelectorAll('a[target="_blank"]').forEach(link => {
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveAccessibleName(/opens in a new tab/);
  });
  expect(section.querySelector('img[src$="facebook-supplied.jpg"]')).not.toBeNull();
  expect(within(section).getByText('Confirm current hours before your visit.')).toBeVisible();
  expect(within(section).getByText(/10\.12/)).toBeVisible();
  expect(section.querySelector('iframe')).toHaveAttribute('loading', 'eager');
  expect(within(section).queryByRole('button', {name:'Tap to explore'})).not.toBeInTheDocument();
  expect(section.querySelector('iframe')).toHaveAttribute('src', expect.stringContaining('q=Talibon%20Municipal%20Hall'));
  expect(within(section).queryByRole('button', { name: 'Close map' })).not.toBeInTheDocument();
});
