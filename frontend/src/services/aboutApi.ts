// Both the development mock and production backend use these HTTP contracts.
async function get<T>(path: string): Promise<T> {
  const response = await fetch(`/api/${path}`, { headers: { 'X-API-Version': '1' } });
  if (!response.ok) throw new Error(`Unable to load About content (${response.status}).`);
  const value: unknown = await response.json();
  const lists = ['about/mayors', 'about/departments', 'about/barangays'];
  const record = (item: unknown): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item);
  let valid = lists.includes(path) ? Array.isArray(value) : record(value);
  if (valid && Array.isArray(value)) {
    valid = value.every(item => path === 'about/barangays' ? typeof item === 'string' : record(item));
  } else if (valid && record(value)) {
    if (path.startsWith('services?')) valid = Array.isArray(value.data) && value.data.every(record);
    else {
      const strings = ['title', 'content', 'description', 'url', 'imageUrl', 'logoUrl', 'author', 'lyrics'];
      valid = strings.every(key => value[key] === undefined || typeof value[key] === 'string') &&
        (value.timeline === undefined || (Array.isArray(value.timeline) && value.timeline.every(item =>
          record(item) && ['year', 'title', 'description'].every(key => typeof item[key] === 'string')))) &&
        ['lat', 'lng'].every(key => value[key] === undefined || (typeof value[key] === 'number' && Number.isFinite(value[key]))) &&
        (value.images === undefined || (Array.isArray(value.images) && value.images.every(item => typeof item === 'string')));
      if (Object.keys(value).length && ['about/profile', 'about/history', 'about/industry', 'about/demographics'].includes(path)) {
        valid = valid && typeof value.content === 'string';
      }
    }
  }
  if (!valid) throw new Error('Invalid About content response.');
  return value as T;
}

interface TextContent { title: string; content: string }
export const aboutApi = {
  getProfile: () => get<TextContent>('about/profile'),
  getHistory: () => get<TextContent>('about/history'),
  getSeal: () => get<{ title: string; description: string }>('about/seal'),
  getMayors: () => get<unknown[]>('about/mayors'),
  getDepartments: () => get<unknown[]>('about/departments'),
  getVicinityMap: () => get<{ title: string; url: string; description: string }>('about/vicinity-map'),
  // The existing backend contract returns names; adapt only at the view boundary.
  getBarangays: async () => (await get<string[]>('about/barangays')).map(name => ({ id: name, name })),
  getIndustry: () => get<TextContent>('about/industry'),
  getServices: async () => (await get<{ data: unknown[] }>('services?limit=100')).data,
  getHymn: () => get<{ title: string; imageUrl: string }>('about/hymn'),
  getDemographics: () => get<TextContent>('about/demographics'),
  getLocation: () => get<{ title: string; lat: number; lng: number; description: string; logoUrl: string }>('about/location'),
};
