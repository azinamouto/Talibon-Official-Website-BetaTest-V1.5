# Sprint 5 Search and Discovery API (S5-BE-01)

The Search API provides high-performance, full-text discovery across published municipal content: news articles, public services (Citizen's Charter/CMS), and published pages. It includes weighted relevance ranking, pagination, and multi-dimensional facets (by content type and category/department).

The endpoint uses `/api/search`, API version 1 (`X-API-Version: 1`), and is publicly accessible. OpenAPI documentation is served at `/api/openapi.json`.

---

## Endpoint Contract

### `GET /api/search`

Publicly queryable. Rate limited under `PUBLIC_READ` policy (120 requests / minute per IP).

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|:---|:---|:---|:---|:---|
| `q` | `string` | **Yes** | — | Search keywords or phrase (1-100 characters). Supports quotes for exact phrase match. |
| `type` | `enum` | No | `all` | Filter by content type: `all`, `news`, `services`, `pages`. |
| `category` | `string` | No | — | Filter by specific category or department (e.g., `ANNOUNCEMENT`, `ARTICLE`, `BPLO`). |
| `page` | `integer` | No | `1` | Page number (minimum `1`). |
| `limit` | `integer` | No | `10` | Results per page (minimum `1`, maximum `50`). |
| `sort` | `enum` | No | `relevance` | Sort order: `relevance` (PostgreSQL `ts_rank_cd` score descending) or `date` (created_at descending). |

#### Request Example

```http
GET /api/search?q=business%20permit&type=all&page=1&limit=10&sort=relevance HTTP/1.1
Host: talibon.gov.ph
Accept: application/json
X-API-Version: 1
```

#### Response Structure (`200 OK`)

```json
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "type": "services",
      "title": "Business Permit Application & Renewal",
      "slug": "business-permit",
      "snippet": "Guidelines and online processing for new municipal business permits and annual renewals.",
      "category": "Business Permits & Licensing Office (BPLO)",
      "created_at": "2026-09-01T12:00:00.000Z",
      "score": 0.8542
    },
    {
      "id": "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
      "type": "news",
      "title": "BPLO Announces Business One-Stop Shop (BOSS) Schedule",
      "slug": "bplo-announces-boss-schedule",
      "snippet": "The Business Permits and Licensing Office will conduct the annual one-stop shop starting January.",
      "category": "ANNOUNCEMENT",
      "created_at": "2026-09-15T08:30:00.000Z",
      "score": 0.6219
    }
  ],
  "meta": {
    "total": 14,
    "page": 1,
    "limit": 10,
    "totalPages": 2
  },
  "facets": {
    "byType": {
      "news": 6,
      "services": 5,
      "pages": 3
    },
    "byCategory": {
      "ANNOUNCEMENT": 4,
      "Business Permits & Licensing Office (BPLO)": 3,
      "ARTICLE": 2,
      "Municipal Treasury": 2,
      "Page": 3
    }
  }
}
```

---

## Relevance Ranking & Indexing

The search engine uses PostgreSQL Full-Text Search backed by dedicated Generalized Inverted Indexes (`GIN`):
- **Weight A (Highest priority)**: Item titles and official service names.
- **Weight B (Medium priority)**: Item summaries, service descriptions, and primary page contents.
- **Weight C (Contextual priority)**: Responsible office/department names and extended content bodies.

Exact phrase queries can be enclosed in quotes: `q="civil registry"`. Web search syntax (`OR`, `-negation`) is supported cleanly via PostgreSQL `websearch_to_tsquery`.

Only active, published, non-deleted entries (`status = 'published'` or `'available'`, `deleted_at IS NULL`) are indexed. Drafts and administrative archives are excluded from search results.

---

## Frontend Integration Types (TypeScript)

```typescript
export interface SearchItem {
  id: string;
  type: 'news' | 'services' | 'pages';
  title: string;
  slug: string;
  snippet: string;
  category: string;
  created_at: string;
  score: number;
}

export interface SearchFacets {
  byType: {
    news: number;
    services: number;
    pages: number;
  };
  byCategory: Record<string, number>;
}

export interface SearchResponse {
  data: SearchItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  facets: SearchFacets;
}

export async function searchContent(query: {
  q: string;
  type?: 'all' | 'news' | 'services' | 'pages';
  category?: string;
  page?: number;
  limit?: number;
  sort?: 'relevance' | 'date';
}): Promise<SearchResponse> {
  const params = new URLSearchParams();
  params.set('q', query.q);
  if (query.type && query.type !== 'all') params.set('type', query.type);
  if (query.category) params.set('category', query.category);
  if (query.page) params.set('page', query.page.toString());
  if (query.limit) params.set('limit', query.limit.toString());
  if (query.sort) params.set('sort', query.sort);

  const res = await fetch(`/api/search?${params.toString()}`, {
    headers: { 'Accept': 'application/json', 'X-API-Version': '1' },
  });
  if (!res.ok) throw new Error(`Search error (${res.status})`);
  return res.json();
}
```

---

## Error Responses

- `400 Bad Request`: When `q` is missing, empty, or exceeds 100 characters; when `limit` exceeds 50; or when invalid enum values are passed.
- `429 Too Many Requests`: When request rate exceeds 120 calls / minute from a single IP. `Retry-After` header indicates wait time in seconds.
- `503 Service Unavailable`: When database search storage is temporarily offline. Internal connection details and database stack traces are sanitized.

