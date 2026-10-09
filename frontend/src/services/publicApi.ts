export interface Pagination { page: number; limit: number; total: number; totalPages: number }
export interface Listing<T> { data: T[]; pagination: Pagination }
export interface PublicService {
  id: string; slug: string; name: string; description: string; requirements: string[];
  processing_time: string; fees: string; office_responsible: string;
  purpose?: string | null; office_hours?: string; contact_info?: string | null; physical_address?: string | null;
  downloadable_forms?: { title: string; url: string }[];
}
export interface PublicNews {
  id: string; slug: string; title: string; summary: string; content: string;
  category: string; date: string; image_url?: string | null; file_url?: string | null; author?: string | null;
}
export interface PublicPage { id: string; slug: string; title: string; content: string }
export interface SearchItem {
  id: string; slug: string; title: string; snippet: string; type: 'news' | 'services' | 'pages';
  category: string; created_at: string; score: number;
}
export interface SearchQuery {
  q: string; type?: 'all' | SearchItem['type']; category?: string;
  page?: number; limit?: number; sort?: 'relevance' | 'date';
}
export interface SearchResponse {
  data: SearchItem[];
  meta: Pagination;
  facets: { byType: Record<SearchItem['type'], number>; byCategory: Record<string, number> };
}
export function searchPublic(params: SearchQuery, signal?: AbortSignal) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== '').map(([key, value]) => [key, String(value)]));
  return publicGet<SearchResponse>(`search?${query}`, signal);
}
export class PublicApiError extends Error {
  constructor(public status: number) {
    super(status === 429 ? 'Too many requests. Please wait a moment and try again.' : 'Unable to load content. Please try again.');
  }
}

// Same-origin HTTP in production; Vite proxies to the backend or explicit mock server in development.
export async function publicGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/${path}`, { signal, headers: { 'X-API-Version': '1' } });
  if (!response.ok) throw new PublicApiError(response.status);
  return response.json();
}
export function listPublic<T>(resource: string, params: Record<string, string | number>, signal?: AbortSignal) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '').map(([key, value]) => [key, String(value)]));
  return publicGet<Listing<T>>(`${resource}?${query}`, signal);
}
export async function publicDetail<T>(resource: string, identifier: string, signal?: AbortSignal): Promise<T | null> {
  try {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)) {
      return (await publicGet<{ data: T }>(`${resource}/${encodeURIComponent(identifier)}`, signal)).data;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(identifier) || identifier.length > 160) return null;
    return (await listPublic<T>(resource, { slug: identifier, limit: 1 }, signal)).data[0] ?? null;
  } catch (error) {
    if (error instanceof PublicApiError && error.status === 404) return null;
    throw error;
  }
}
export const searchLink = (item: SearchItem) => `${item.type === 'news' ? '/news/view' : item.type === 'services' ? '/services' : '/pages'}/${encodeURIComponent(item.id)}`;
