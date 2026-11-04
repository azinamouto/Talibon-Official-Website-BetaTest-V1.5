import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it } from 'vitest';
import CitizensCharterSection from '../../src/components/CitizensCharterSection';
import { charterPdf } from '../../src/data/charterDirectory';
import { charterGroups } from '../../src/data/charterDirectory';

function setup() {
  const result = render(<MemoryRouter><CitizensCharterSection /></MemoryRouter>);
  return { ...result, search: screen.getByRole('searchbox', { name: 'Search offices and services' }) };
}

it('keeps office destinations and previews in named cards with stretched action links', () => {
  setup();
  const directory = screen.getByRole('region', { name: 'Browse offices by purpose' });
  expect(within(directory).getByRole('heading', { name: 'Browse offices by purpose', level: 2 })).toBeVisible();
  for (const office of charterGroups.flatMap(group => group.offices)) {
    const article = within(directory).getByRole('article', { name: office.name, hidden: true });
    const link = within(article).getByRole('link', { hidden: true });
    expect(link).toHaveAttribute('href', office.contacts ? '/executive/directory' : `${charterPdf}${office.page ? `#page=${office.page}` : ''}`);
    for (const service of office.services) expect(within(article).getByText(service)).toBeInTheDocument();
    if (!office.contacts) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(within(link).getByText('(opens in a new tab)')).toBeInTheDocument();
    }
  }
});

it('searches service words and office acronyms without requiring an office name', () => {
  const { search } = setup();
  fireEvent.change(search, { target: { value: ' birth certificate ' } });
  expect(screen.getByRole('status')).toHaveTextContent('1 matching office');
  expect(screen.getByRole('heading', { name: /Local Civil Registry Office/ })).toBeVisible();
  expect(screen.queryByRole('heading', { name: 'Engineering Office' })).toBeNull();
  fireEvent.change(search, { target: { value: 'business permit' } });
  expect(screen.getByRole('status')).toHaveTextContent('1 matching office');
  expect(screen.getByRole('heading', { name: /Business Permits & Licensing Office/ })).toBeVisible();
  fireEvent.change(search, { target: { value: '  mSwDo ' } });
  expect(screen.getByRole('heading', { name: /Municipal Social Welfare/ })).toBeVisible();
  fireEvent.change(search, { target: { value: "mayor's" } });
  expect(screen.getByRole('heading', { name: 'Mayor’s Office' })).toBeVisible();
});

it('keeps internal services quiet but reveals matching staff services', () => {
  const { container, search } = setup();
  expect(container.querySelector('details')).not.toHaveAttribute('open');
  expect(screen.getByText('Human Resource Management Office')).not.toBeVisible();
  fireEvent.change(search, { target: { value: 'employment certificate' } });
  expect(screen.getByRole('heading', { name: /Human Resource Management/ })).toBeVisible();
  expect(screen.getByRole('status')).toHaveTextContent('1 matching office');
});

it('labels verified PDF task destinations and searches for tasks without verified anchors', () => {
  const { search } = setup();
  expect(screen.getByRole('link', { name: /Business permit PDF guide/ })).toHaveAttribute('href', `${charterPdf}#page=215`);
  expect(screen.getByRole('link', { name: /Building permit PDF guide/ })).toHaveAttribute('href', `${charterPdf}#page=102`);
  fireEvent.click(screen.getByRole('button', { name: 'Tax declaration Find the office' }));
  expect(search).toHaveValue('tax declaration');
  expect(screen.getByRole('heading', { name: 'Assessor’s Office' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Burial lot Find the office' }));
  expect(screen.getByRole('link', { name: /Cemetery Office/ })).toHaveAttribute('href', '/executive/directory');
});

it('distinguishes the six task icons and announces new-tab PDF guides', () => {
  setup();
  const list = screen.getByRole('list', { name: 'Start with a task' });
  const items = within(list).getAllByRole('listitem');
  expect(items).toHaveLength(6);
  const icons = items.map(item => item.querySelector('svg')!);
  expect(new Set(icons.map(icon => icon.innerHTML)).size).toBe(6);
  expect(icons.every(icon => icon.getAttribute('aria-hidden') === 'true')).toBe(true);
  const guides = within(list).getAllByRole('link');
  expect(guides).toHaveLength(4);
  for (const guide of guides) {
    expect(guide).toHaveAccessibleName(/PDF guide \(opens in a new tab\)$/);
    expect(guide).toHaveAttribute('target', '_blank');
    expect(guide).toHaveAttribute('rel', 'noopener noreferrer');
  }
  expect(within(list).getAllByRole('button')).toHaveLength(2);
});

it('provides an empty state and reset without invented service totals or edition claims', () => {
  const { search } = setup();
  fireEvent.change(search, { target: { value: 'unmatched-service-999' } });
  expect(screen.getByRole('heading', { name: 'No offices found' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Show all offices' }));
  expect(search).toHaveValue('');
  expect(screen.getByRole('heading', { name: 'Citizen’s Charter' })).toBeVisible();
  expect(screen.queryByText(/\d+ SERVICES/)).toBeNull();
  expect(screen.getByRole('link', { name: /Download full charter/ })).toHaveAttribute('href', charterPdf);
});
