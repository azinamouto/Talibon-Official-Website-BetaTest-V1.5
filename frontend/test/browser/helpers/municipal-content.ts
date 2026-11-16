import type { BrowserContext, Page } from '@playwright/test';

// Municipal public listings use a different envelope from the media library.
export async function mockMunicipalContent(target: BrowserContext | Page, records: Record<string, unknown[]> = {}) {
  await target.route('**/api/public-content/**', route => {
    const url = new URL(route.request().url());
    const page = Number(url.searchParams.get('page') || 1);
    const limit = Number(url.searchParams.get('limit') || 12);
    const data = records[url.pathname.split('/').pop()!] || [];
    return route.fulfill({ json: {
      data: data.slice((page - 1) * limit, page * limit),
      pagination: { page, limit, total: data.length, totalPages: Math.ceil(data.length / limit) },
    } });
  });
}
