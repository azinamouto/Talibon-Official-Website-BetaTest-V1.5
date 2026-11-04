import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import MoreTalibonPages from '../../src/components/MoreTalibonPages';
import { OFFICIAL_FACEBOOK_URLS } from '../../src/constants';

it('starts closed, updates its ARIA relationship and removes closed links from focus and accessibility', () => {
  const { container } = render(<MoreTalibonPages />);
  const button = screen.getByRole('button', { name: /More Talibon pages/ });
  const panel = document.getElementById(button.getAttribute('aria-controls')!)!;
  expect(button).toHaveAttribute('type', 'button');
  expect(button).toHaveAttribute('aria-expanded', 'false');
  expect(panel).toHaveAttribute('inert');
  expect(panel).not.toBeVisible();
  expect(screen.queryAllByRole('link')).toHaveLength(0);
  container.querySelectorAll('a').forEach(a => expect(a.tabIndex).toBe(-1));
  fireEvent.click(button);
  expect(button).toHaveAttribute('aria-expanded', 'true');
  expect(panel).toBeVisible();
  expect(panel).not.toHaveAttribute('inert');
  const links = within(panel).getAllByRole('link');
  expect(links.map(a => a.textContent?.trim())).toEqual(['Tourism (opens in a new tab)', 'PNP (opens in a new tab)', 'BFP (opens in a new tab)', 'SK Federation (opens in a new tab)', 'PESO (opens in a new tab)', 'Abante Talibon (opens in a new tab)']);
  links.forEach(a => {
    expect(a).toHaveAttribute('href', OFFICIAL_FACEBOOK_URLS.MAIN);
    expect(a).toHaveAttribute('target', '_blank');
    expect(a).toHaveAttribute('rel', 'noopener noreferrer');
    expect(a.tabIndex).toBe(0);
  });
  fireEvent.click(links[0]);
  expect(button).toHaveAttribute('aria-expanded', 'true');
  fireEvent.click(button);
  expect(button).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryAllByRole('link')).toHaveLength(0);
  container.querySelectorAll('svg').forEach(icon => expect(icon).toHaveAttribute('aria-hidden', 'true'));
});

it('supports defaultOpen, gives instances unique panel ids and forgets state on a fresh mount', () => {
  const { unmount } = render(<><MoreTalibonPages defaultOpen /><MoreTalibonPages /></>);
  const buttons = screen.getAllByRole('button');
  expect(buttons[0]).toHaveAttribute('aria-expanded', 'true');
  expect(buttons[1]).toHaveAttribute('aria-expanded', 'false');
  expect(buttons[0].getAttribute('aria-controls')).not.toBe(buttons[1].getAttribute('aria-controls'));
  unmount();
  render(<MoreTalibonPages />);
  expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
});
