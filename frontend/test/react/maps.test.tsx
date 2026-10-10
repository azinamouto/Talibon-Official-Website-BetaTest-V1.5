import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from './server';
import { coordinates, loadMapLocations } from '../../src/services/mapLocations';
import { usePublicResource } from '../../src/hooks/usePublicResource';
import TourismMapPage from '../../src/pages/TourismMapPage';
import LocationMap from '../../src/components/LocationMap';
import PublicMapCanvas from '../../src/components/PublicMapCanvas';
import type { ReactNode } from 'react';
let crashMap = false;
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: ReactNode }) => { if (crashMap) throw new Error('Map failed'); return <div>{children}</div>; },
  TileLayer: ({ eventHandlers }: { eventHandlers: { tileerror: () => void; tileload: () => void } }) => <><button onClick={eventHandlers.tileerror}>Fail tiles</button><button onClick={eventHandlers.tileload}>Load tiles</button></>,
  Marker: ({ children, title }: { children: ReactNode; title: string }) => <div aria-label={'Marker ' + title}>{children}</div>,
  Popup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
afterEach(() => { crashMap = false; vi.useRealTimers(); vi.restoreAllMocks(); });
const endpoint = 'http://127.0.0.1:54321/rest/v1/tourism_spots';
const records = [
  { id: 'one', name: 'Published destination', description: 'Published description', location: 'Published address', google_maps_link: 'https://www.google.com/maps?q=10.15,124.33' },
  { id: 'two', name: 'No coordinates destination', description: 'Another description', location: 'Second address', google_maps_link: null },
];

it.each([
  [null, null], ['bad url', null], ['https://evil.test/maps?q=1,2', null], ['http://google.com/?q=1,2', null],
  ['https://google.com/maps/@10.1,124.2,12z', null], ['https://maps.app.goo.gl/short', null],
  ['https://google.com/?q=91,2', null], ['https://google.com/?q=1,181', null],
  ['https://google.com/?q=NaN,2', null], ['https://google.com/?q=0,0', [0, 0]],
  ['https://google.com/maps/search/?api=1&query=-10.5,124', [-10.5, 124]],
  ['https://www.google.com/maps/place/test/data=!3d10.25!4d124.5', [10.25, 124.5]],
])('parses explicit coordinates safely: %s', (link, expected) => expect(coordinates(link as string | null)).toEqual(expected));

it('loads directory records over HTTP, charts actual counts, and preserves addresses when tiles fail', async () => {
  server.use(http.get(endpoint, ({ request }) => {
    const url = new URL(request.url);
    expect(url.searchParams.get('deleted_at')).toBe('is.null');
    return HttpResponse.json(records);
  }));
  render(<TourismMapPage />);
  expect(screen.getByRole('status')).toHaveTextContent('Loading public');
  expect(await screen.findByRole('table')).toHaveTextContent('With verified coordinates1');
  expect(screen.getByRole('table')).toHaveTextContent('Coordinates not available1');
  expect(screen.getAllByLabelText(/^Marker/)).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Fail tiles' }));
  expect(screen.getByRole('status')).toHaveTextContent('map service is unavailable');
  expect(screen.getByRole('link', { name: /Directions to Published/ })).toHaveAttribute('href', 'https://www.google.com/maps/dir/?api=1&destination=10.15,124.33');
  expect(screen.getByText('Second address')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Retry map' }));
  fireEvent.click(screen.getByRole('button', { name: 'Load tiles' }));
  expect(screen.queryByText('Loading map...')).not.toBeInTheDocument();
});

it('shows a graceful API error then retries successfully without sample records', async () => {
  server.use(http.get(endpoint, () => HttpResponse.json({ message: 'offline' }, { status: 503 })));
  render(<TourismMapPage />);
  expect(await screen.findByRole('alert', {}, { timeout: 18000 })).toHaveTextContent('Public locations are unavailable');
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  server.use(http.get(endpoint, () => HttpResponse.json([])));
  fireEvent.click(screen.getByRole('button', { name: 'Retry locations' }));
  expect(await screen.findByText('No public locations have been posted yet.')).toBeVisible();
}, 20000);
it('shows address-only data without fabricating coordinates', async () => {
  server.use(http.get(endpoint, () => HttpResponse.json([records[1]])));
  render(<TourismMapPage />);
  expect(await screen.findByText(/Map coordinates are not available/)).toBeVisible();
  expect(screen.queryByLabelText('Public locations map')).not.toBeInTheDocument();
});
it('rejects malformed directory payloads', async () => {
  server.use(http.get(endpoint, () => HttpResponse.json({ unexpected: true })));
  await expect(loadMapLocations(new AbortController().signal)).rejects.toThrow('unavailable');
});

it('offers retry on slow tiles and rendering failure', () => {
  vi.useFakeTimers();
  const { unmount } = render(<PublicMapCanvas points={[]} />);
  act(() => { vi.advanceTimersByTime(12000); });
  expect(screen.getByRole('status')).toHaveTextContent('unavailable');
  unmount();
  crashMap = true;
  vi.spyOn(console, 'error').mockImplementation(() => {});
  render(<PublicMapCanvas points={[]} />);
  expect(screen.getByRole('status')).toHaveTextContent('unavailable');
  crashMap = false;
  fireEvent.click(screen.getByRole('button', { name: 'Retry map' }));
  expect(screen.getByRole('button', { name: 'Load tiles' })).toBeVisible();
});
it('validates location props and always exposes directions outside the map', () => {
  const { rerender } = render(<LocationMap lat={NaN} lng={124} title="Office" />);
  expect(screen.getByRole('status')).toHaveTextContent('coordinates are unavailable');
  rerender(<LocationMap lat={10} lng={Infinity} title="Office" />);
  rerender(<LocationMap lat={91} lng={0} title="Office" />);
  rerender(<LocationMap lat={0} lng={181} title="Office" />);
  rerender(<LocationMap lat={10} lng={124} title="Office" />);
  expect(screen.getByRole('link', { name: /Directions/ })).toHaveAttribute('href', 'https://www.google.com/maps/dir/?api=1&destination=10,124');
});

it('resource hook ignores stale responses, aborts and preserves rate-limit messaging', async () => {
  let resolve!: (value: string) => void;
  let signal!: AbortSignal;
  const first = vi.fn((s: AbortSignal) => { signal = s; return new Promise<string>(r => { resolve = r; }); });
  const second = vi.fn(async () => 'Fresh');
  const { result, rerender, unmount } = renderHook(({ load }) => usePublicResource(load), { initialProps: { load: first as (s: AbortSignal) => Promise<string> } });
  rerender({ load: second });
  expect(signal.aborted).toBe(true);
  await waitFor(() => expect(result.current.data).toBe('Fresh'));
  await act(async () => { resolve('Stale'); });
  expect(result.current.data).toBe('Fresh');
  const reject = vi.fn(async () => { throw { status: 429, message: 'Wait then retry' }; });
  rerender({ load: reject });
  await waitFor(() => expect(result.current.error).toBe('Wait then retry'));
  unmount();
});
it('ignores rejected work after unmount', async () => {
  let reject!: (error: Error) => void;
  const load = () => new Promise<string>((_, r) => { reject = r; });
  const { unmount } = renderHook(() => usePublicResource(load));
  unmount();
  await act(async () => { reject(new Error('aborted')); });
});
