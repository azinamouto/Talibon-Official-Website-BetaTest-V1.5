import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PublicContentService } from '../../database/public-content.service';
import { SearchQueryDto, SearchResponseDto } from './search.dto';

@Injectable()
export class SearchService {
  constructor(@Inject(PublicContentService) private readonly content: PublicContentService) {}
  async search(query: SearchQueryDto): Promise<SearchResponseDto> {
    const q = query.q?.trim();
    if (!q || q.length > 100) throw new BadRequestException('Search query must be between 1 and 100 characters.');
    const page = query.page ?? 1, limit = query.limit ?? 10;
    return this.content.query(async tx => {
      const [result] = await tx.query(`WITH matches AS MATERIALIZED (
        SELECT id,slug,title,published_at AS created_at,
          CASE WHEN kind='services_cms' THEN 'services' ELSE kind END AS type,
          coalesce(body->>'category',body->>'office_responsible','') AS category,
          left(regexp_replace(coalesce(body->>'summary',body->>'description',body->>'content',''),'<[^>]*>','','g'),200) AS snippet,
          ts_rank_cd(to_tsvector('english',title || ' ' || body::text),websearch_to_tsquery('english',$1)) AS score
        FROM app.published_content WHERE kind IN ('news','services_cms','pages')
          AND to_tsvector('english',title || ' ' || body::text) @@ websearch_to_tsquery('english',$1)
      ), filtered AS (
        SELECT * FROM matches WHERE ($2='all' OR type=$2) AND ($3='' OR category=$3)
      ), page_rows AS (
        SELECT * FROM filtered ORDER BY CASE WHEN $4='relevance' THEN score END DESC,created_at DESC,id LIMIT $5 OFFSET $6
      ) SELECT
        coalesce((SELECT jsonb_agg(to_jsonb(p)) FROM page_rows p),'[]'::jsonb) AS data,
        (SELECT count(*)::int FROM filtered) AS total,
        (SELECT jsonb_build_object('news',count(*) FILTER(WHERE type='news'),'services',count(*) FILTER(WHERE type='services'),'pages',count(*) FILTER(WHERE type='pages')) FROM matches) AS types,
        coalesce((SELECT jsonb_object_agg(category,n) FROM (SELECT category,count(*) AS n FROM matches WHERE category<>'' GROUP BY category) c),'{}'::jsonb) AS categories`,
        [q,query.type ?? 'all',query.category || '',query.sort ?? 'relevance',limit,(page-1)*limit]);
      return { data: result.data, meta: { total: result.total,page,limit,totalPages: Math.ceil(result.total/limit) }, facets: { byType: result.types,byCategory: result.categories } };
    });
  }
}
