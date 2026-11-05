import { supabase } from '../lib/supabase';

export interface MapLocation {
  id: string; name: string; description: string; location: string; google_maps_link: string | null;
}
/** Only explicit place coordinates, never a map viewport or invented offsets. */
export function coordinates(link: string | null): [number, number] | null {
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
  const { data, error } = await supabase.from('tourism_spots')
    .select('id,name,description,location,google_maps_link').is('deleted_at', null)
    .order('name', { ascending: true })
    .abortSignal(AbortSignal.any([signal, AbortSignal.timeout(15000)]));
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('Location data unavailable');
  return data;
}
