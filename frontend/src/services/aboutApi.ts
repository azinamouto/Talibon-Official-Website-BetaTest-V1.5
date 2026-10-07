// Both the development mock and production backend use these HTTP contracts.
async function get<T>(path: string): Promise<T> {
  const response = await fetch(`/api/${path}`, { headers: { 'X-API-Version': '1' } });
  if (!response.ok) throw new Error(`Unable to load About content (${response.status}).`);
  return response.json() as Promise<T>;
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
