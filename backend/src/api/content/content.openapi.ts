import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { CONTENT, ContentKind } from './content.service';

export function ContentErrors() {
  return applyDecorators(...[
    [400, 'Invalid body, query, UUID or department reference.'],
    [401, 'Missing, invalid or ended session.'],
    [403, 'Requires a verified super_admin, admin, municipal_admin or editor.'],
    [404, 'Missing, deleted or non-public content.'],
    [409, 'Slug already exists, including soft-deleted records.'],
    [429, 'Rate limit exceeded.'],
    [500, 'Storage unavailable.'],
  ].map(([status, description]) => ApiResponse({ status: Number(status), description: String(description) })));
}

export function ContentResponse(kind: ContentKind, operation: 'list' | 'read' | 'create' | 'delete') {
  const example = {
    id: '11111111-1111-4111-8111-111111111111', slug: 'municipal-information',
    status: CONTENT[kind].visible, created_at: '2026-09-21T00:00:00.000Z', updated_at: '2026-09-21T00:00:00.000Z',
    ...(kind === 'services' ? { name: 'Municipal information', description: 'Service details.', office_responsible: 'mayor', requirements: [], processing_time: '3 to 5 business days', fees: 'None' }
      : { title: 'Municipal information', content: 'Information about Talibon.', ...(kind === 'news' ? { summary: 'Municipal update.', category: 'UPDATE', date: '2026-09-21' } : {}) }),
  };
  const properties = Object.fromEntries(CONTENT[kind].fields.split(',').map(field => [field,
    field === 'requirements' ? { type: 'array' as const, items: { type: 'string' as const } }
      : field === 'downloadable_forms' ? { type: 'array' as const, items: { type: 'object' as const, additionalProperties: true } }
      : { type: 'string' as const, nullable: ['image_url', 'file_url', 'author', 'purpose', 'contact_info', 'physical_address'].includes(field) },
  ]));
  const item = { type: 'object' as const, properties };
  const pagination = { type: 'object' as const, properties: Object.fromEntries(['page', 'limit', 'total', 'totalPages'].map(key => [key, { type: 'integer' as const }])) };
  return ApiResponse({
    status: operation === 'create' ? 201 : operation === 'delete' ? 204 : 200,
    headers: {
      'Cache-Control': { description: 'Successful anonymous GET: public, max-age=60, s-maxage=300, stale-while-revalidate=60. Authenticated requests and writes: private, no-store. Errors: private, no-store. Cached public data may remain stale for 360 seconds after a write.', schema: { type: 'string' } },
      Vary: { description: 'Includes X-API-Version and CORS Origin.', schema: { type: 'string' } },
    },
    description: operation === 'delete' ? 'Soft deleted; no response body.' : 'Public reads expose only published/available content. Manage reads include drafts. Content strings are data; sanitize before rendering HTML.',
    ...(operation === 'delete' ? {} : { schema: {
      type: 'object', properties: { data: operation === 'list' ? { type: 'array', items: item } : item,
        ...(operation === 'list' ? { pagination } : {}) },
      example: operation === 'list' ? { data: [example], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } } : { data: example },
    } }),
  });
}
