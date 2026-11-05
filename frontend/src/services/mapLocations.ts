import { publicGet } from './publicApi';

export interface MapLocation {
  id: string | number;
  name: string;
  description?: string | null;
  location?: string | null;
  google_maps_link?: string | null;
}

/** Only explicit place coordinates, never a map viewport or invented offsets. */
export function coordinates(link: string | null | undefined): [number, number] | null {
  if (!link) return null;
  try {
    const url = new URL(link);
    if (url.protocol !== 'https:' || !['www.google.com', 'google.com', 'maps.google.com'].includes(url.hostname)) return null;
    const place = url.pathname.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
    const query = (url.searchParams.get('query') || url.searchParams.get('q') || '').match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    const match = place || query;
    if (!match) return null;
    const lat = Number(match[1]), lng = Number(match[2]);
    return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? [lat, lng] : null;
  } catch { return null; }
}

export async function loadMapLocations(signal: AbortSignal): Promise<MapLocation[]> {
  const locations = await publicGet<unknown>('tourism/spots', signal);
  if (!Array.isArray(locations)) throw new Error('Location data unavailable.');
  return locations.filter((value): value is MapLocation => {
    if (!value || typeof value !== 'object') return false;
    const location = value as Record<string, unknown>;
    return (typeof location.id === 'string' || (typeof location.id === 'number' && Number.isFinite(location.id))) &&
      typeof location.name === 'string' &&
      (location.description === undefined || location.description === null || typeof location.description === 'string') &&
      (location.location === undefined || location.location === null || typeof location.location === 'string') &&
      (location.google_maps_link === undefined || location.google_maps_link === null || typeof location.google_maps_link === 'string');
  });
}
