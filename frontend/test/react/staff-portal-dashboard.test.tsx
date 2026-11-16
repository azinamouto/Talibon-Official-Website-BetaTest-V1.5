import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import StaffPortal from '../../src/pages/StaffPortal';

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  auth: { staff: { id: 'synthetic-admin', role: 'admin' as 'admin' | 'editor' } as { id: string; role: 'admin' | 'editor' } | null,
    loading: false, error: null as string | null, refresh: vi.fn(), signOut: vi.fn() },
}));
vi.mock('../../src/contexts/StaffAuthContext', () => ({
  staffRequest: mocks.request,
  useStaffAuth: () => mocks.auth,
}));
const photo = { id: 'synthetic-photo', title: 'Synthetic photo', kind: 'photo', mime: 'image/png', bytes: 1024, description: 'Test image', alt_text: 'Test image', category_id: 'photo-category', source_id: 'source', processing: 'ready', publication: 'published', version: 2 };
const document = { ...photo, id: 'synthetic-document', title: 'Synthetic document', kind: 'document', mime: 'application/pdf', category_id: 'document-category', publication: 'draft' };
const accounts = [{ id: 'synthetic-editor', email: 'editor@example.test', role: 'editor', active: true, version: 3 }];
const mediaOptions = { categories: [{ id: 'photo-category', title: 'Photo category', kind: 'photo', approved: true }, { id: 'document-category', title: 'Document category', kind: 'document', approved: true }], sources: [{ id: 'source', reference: 'Synthetic reviewed source', approved: true }] };
function portal(path = '/admin') {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/admin" element={<StaffPortal />} /><Route path="/staff/login" element={<p>Staff sign in destination</p>} /></Routes></MemoryRouter>);
}
function nav(label: string) { return within(screen.getByRole('navigation', { name: 'CMS navigation' })).getByRole('button', { name: label }); }
beforeEach(() => {
  mocks.request.mockReset();
  mocks.auth.staff = { id: 'synthetic-admin', role: 'admin' }; mocks.auth.loading = false; mocks.auth.error = null;
  mocks.auth.refresh.mockReset(); mocks.auth.signOut.mockReset();
  mocks.request.mockImplementation(async (path: string) => {
    if (path === '/api/admin/media/options') return mediaOptions;
    if (path.startsWith('/api/admin/media?page=')) return { data: [photo, document], hasMore: true };
    if (path.startsWith('/api/staff/audit?')) return { data: [{ id: 'event', action: 'mfa.success', source: 'authentication', actorId: null, subjectId: 'synthetic-editor', occurredAt: '2026-11-02T00:00:00Z' }], pagination: { page: 1, limit: 50, hasMore: false } };
    if (path.startsWith('/api/staff?')) return { data: accounts, pagination: { page: 1, limit: 50, hasMore: false } };
    return { success: true };
  });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it('uses returned media records for explicitly page-scoped counts and keeps administration requests lazy', async () => {
  portal();
  await screen.findByText('Synthetic photo');
  expect(screen.getByRole('heading', { name: 'CMS Administration' })).toBeVisible();
  for (const label of ['Photos on this page', 'Documents on this page', 'Published on this page']) {
    expect(screen.getByText(label).parentElement?.querySelector('dd')).toHaveTextContent('1');
  }
  expect(screen.getByText(/Up to 50 recent files/)).toBeVisible();
  expect(mocks.request).not.toHaveBeenCalledWith(expect.stringMatching(/^\/api\/staff(?:\?|\/audit)/));
  expect(nav('Dashboard overview')).toHaveAttribute('aria-current', 'page');
});

it('separates photo and document files and categories without inventing a backend filter', async () => {
  portal();
  fireEvent.click(nav('Photos'));
  await screen.findByRole('heading', { name: 'Synthetic photo' });
  expect(screen.queryByRole('heading', { name: 'Synthetic document' })).not.toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'Photo category (photo)' })).toBeVisible();
  expect(screen.queryByRole('option', { name: 'Document category (document)' })).not.toBeInTheDocument();
  expect(screen.getByLabelText('File', { exact: true })).toHaveAttribute('accept', '.jpg,.jpeg,.png,.webp');
  fireEvent.click(nav('Documents'));
  await screen.findByRole('heading', { name: 'Synthetic document' });
  expect(screen.queryByRole('heading', { name: 'Synthetic photo' })).not.toBeInTheDocument();
  expect(screen.getByLabelText('File', { exact: true })).toHaveAttribute('accept', '.pdf');
  expect(screen.queryByLabelText(/Alternative text/)).not.toBeInTheDocument();
  expect(mocks.request.mock.calls.filter(([path]) => String(path).startsWith('/api/admin/media?')).every(([path]) => /^\/api\/admin\/media\?page=\d+$/.test(String(path)))).toBe(true);
});

it('hides admin modules and rejects a privileged deep link for an editor', async () => {
  mocks.auth.staff = { id: 'synthetic-editor', role: 'editor' };
  portal('/admin?tab=staff');
  await screen.findByText('Synthetic photo');
  const navigation = screen.getByRole('navigation', { name: 'CMS navigation' });
  expect(within(navigation).queryByRole('button', { name: 'Staff management' })).not.toBeInTheDocument();
  expect(within(navigation).queryByRole('button', { name: 'Audit logs' })).not.toBeInTheDocument();
  expect(mocks.request.mock.calls.some(([path]) => /^\/api\/staff(?:\?|\/audit)/.test(String(path)))).toBe(false);
  expect(screen.getByRole('heading', { name: 'Dashboard overview' })).toBeVisible();
});

it('requires a fresh MFA code before a versioned role mutation and clears the code', async () => {
  portal('/admin?tab=staff');
  await screen.findByText('editor@example.test');
  fireEvent.click(screen.getByRole('button', { name: 'Make admin' }));
  expect(screen.getByRole('status')).toHaveTextContent('Enter a current authenticator code');
  expect(mocks.request.mock.calls.some(([path, body]) => body && String(path).endsWith('/role'))).toBe(false);
  fireEvent.change(screen.getByLabelText('Current authenticator code'), { target: { value: '654321' } });
  fireEvent.click(screen.getByRole('button', { name: 'Make admin' }));
  await screen.findByText('Staff access action completed.');
  expect(mocks.request).toHaveBeenCalledWith('/api/staff-auth/two-factor/verify-totp', { code: '654321' });
  expect(mocks.request).toHaveBeenCalledWith('/api/staff/synthetic-editor/role', { version: 3, role: 'admin' });
  const paths = mocks.request.mock.calls.map(([path]) => path);
  expect(paths.indexOf('/api/staff-auth/two-factor/verify-totp')).toBeLessThan(paths.indexOf('/api/staff/synthetic-editor/role'));
  expect(screen.getByLabelText('Current authenticator code')).toHaveValue('');
});

it('loads the read-only audit only when selected and renders recorded activity', async () => {
  portal();
  await screen.findByText('Synthetic photo');
  fireEvent.click(nav('Audit logs'));
  await screen.findByText('mfa.success');
  expect(screen.getByRole('heading', { name: 'Audit logs' })).toBeVisible();
  expect(mocks.request).toHaveBeenCalledWith('/api/staff/audit?limit=50&page=1');
  expect(mocks.request).not.toHaveBeenCalledWith('/api/staff?limit=50&page=1');
  expect(screen.queryByRole('button', { name: /delete audit/i })).not.toBeInTheDocument();
});

it('shows unavailable counts rather than fabricated zeroes when loading fails, and can retry', async () => {
  mocks.request.mockRejectedValueOnce(new Error('Synthetic unavailable response'));
  portal();
  await screen.findByRole('alert');
  expect(screen.getByText('Photos on this page').parentElement?.querySelector('dd')).toHaveTextContent('—');
  expect(screen.queryByText('No media on this page')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Refresh overview' }));
  await screen.findByText('Synthetic photo');
  expect(screen.getByText('Photos on this page').parentElement?.querySelector('dd')).toHaveTextContent('1');
});

it('does not restore deprecated modules through a legacy query parameter', async () => {
  portal('/admin?tab=workflows');
  await screen.findByText('Synthetic photo');
  expect(screen.getByRole('heading', { name: 'Dashboard overview' })).toBeVisible();
  expect(screen.queryByRole('button', { name: /citizen|payment|application|news/i })).not.toBeInTheDocument();
  expect(mocks.request.mock.calls.some(([path]) => String(path).startsWith('/api/admin/content'))).toBe(false);
});

it('preserves unauthenticated redirect and does not load CMS metadata', async () => {
  mocks.auth.staff = null;
  portal();
  await screen.findByText('Staff sign in destination');
  expect(mocks.request).not.toHaveBeenCalled();
});

it('preserves sign-out and offers a retry when it cannot be confirmed', async () => {
  mocks.auth.signOut.mockRejectedValueOnce(new Error('Synthetic sign-out failure'));
  portal();
  await screen.findByText('Synthetic photo');
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  await screen.findByText('Could not confirm sign out. Please retry.');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Sign out' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  await waitFor(() => expect(mocks.auth.signOut).toHaveBeenCalledTimes(2));
});

it('rejects a PDF in the photo workspace before sending an upload request', async () => {
  portal('/admin?tab=photos');
  await screen.findByRole('option', { name: 'Photo category (photo)' });
  await waitFor(() => expect(screen.getByLabelText('Title', { exact: true })).toBeEnabled());
  fireEvent.change(screen.getByLabelText('File', { exact: true }), { target: { files: [new File(['synthetic PDF'], 'test.pdf', { type: 'application/pdf' })] } });
  fireEvent.change(screen.getByLabelText('Title', { exact: true }), { target: { value: 'Synthetic mismatch' } });
  fireEvent.change(screen.getByLabelText('Category', { exact: true }), { target: { value: 'photo-category' } });
  fireEvent.change(screen.getByLabelText('Source record'), { target: { value: 'source' } });
  // A synthetic FileList does not populate jsdom's native file value. Submit the React handler directly.
  fireEvent.submit(screen.getByLabelText('File', { exact: true }).closest('form')!);
  await screen.findByText('Choose a JPEG, PNG or WebP photo.');
  expect(mocks.request.mock.calls.some(([path]) => path === '/api/admin/media/uploads')).toBe(false);
});
