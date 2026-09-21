-- Sprint 5 (S5-BE-01): Full-text search and discovery with weighted relevance, facets, and GIN indexes

-- GIN indexes for fast full-text evaluation on published/available content
CREATE INDEX IF NOT EXISTS idx_news_search_fts ON public.news
  USING gin((
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'C')
  ))
  WHERE status = 'published' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_services_search_fts ON public.services_cms
  USING gin((
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(purpose, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(office_responsible, '')), 'C')
  ))
  WHERE status = 'available' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pages_search_fts ON public.pages
  USING gin((
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'B')
  ))
  WHERE status = 'published' AND deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.search_content(
  p_query text,
  p_type text DEFAULT 'all',
  p_category text DEFAULT NULL,
  p_limit integer DEFAULT 10,
  p_offset integer DEFAULT 0,
  p_sort text DEFAULT 'relevance'
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  t_query tsquery;
  v_results jsonb;
  v_total integer;
  v_facets jsonb;
BEGIN
  IF p_query IS NULL OR length(btrim(p_query)) = 0 OR length(p_query) > 100
    OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 50
    OR p_offset IS NULL OR p_offset < 0
    OR p_type NOT IN ('all', 'news', 'services', 'pages')
    OR p_sort NOT IN ('relevance', 'date') THEN
    RAISE EXCEPTION 'Invalid search parameters' USING ERRCODE = '22023';
  END IF;

  t_query := websearch_to_tsquery('english', p_query);
  IF t_query IS NULL OR t_query = ''::tsquery THEN
    t_query := plainto_tsquery('english', p_query);
  END IF;

  IF t_query IS NULL OR t_query = ''::tsquery THEN
    RETURN jsonb_build_object(
      'data', '[]'::jsonb,
      'total', 0,
      'facets', jsonb_build_object(
        'byType', jsonb_build_object('news', 0, 'services', 0, 'pages', 0),
        'byCategory', '{}'::jsonb
      )
    );
  END IF;

  WITH matched AS (
    SELECT
      id,
      'news'::text AS type,
      title,
      slug,
      coalesce(nullif(btrim(summary), ''), substring(content from 1 for 200)) AS snippet,
      category,
      created_at,
      round((ts_rank_cd(
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(content, '')), 'C'),
        t_query, 32
      ))::numeric, 4)::float AS score
    FROM public.news
    WHERE status = 'published' AND deleted_at IS NULL
      AND (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(content, '')), 'C')
      ) @@ t_query

    UNION ALL

    SELECT
      id,
      'services'::text AS type,
      name AS title,
      slug,
      coalesce(nullif(btrim(description), ''), nullif(btrim(purpose), ''), office_responsible) AS snippet,
      coalesce(office_responsible, 'General') AS category,
      created_at,
      round((ts_rank_cd(
        setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(purpose, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(office_responsible, '')), 'C'),
        t_query, 32
      ))::numeric, 4)::float AS score
    FROM public.services_cms
    WHERE status = 'available' AND deleted_at IS NULL
      AND (
        setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(purpose, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(office_responsible, '')), 'C')
      ) @@ t_query

    UNION ALL

    SELECT
      id,
      'pages'::text AS type,
      title,
      slug,
      substring(content from 1 for 200) AS snippet,
      'Page'::text AS category,
      created_at,
      round((ts_rank_cd(
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(content, '')), 'B'),
        t_query, 32
      ))::numeric, 4)::float AS score
    FROM public.pages
    WHERE status = 'published' AND deleted_at IS NULL
      AND (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(content, '')), 'B')
      ) @@ t_query
  ),
  filtered AS (
    SELECT * FROM matched
    WHERE (p_type = 'all' OR type = p_type)
      AND (p_category IS NULL OR category = p_category)
  ),
  facet_type AS (
    SELECT
      count(*) FILTER (WHERE type = 'news') AS news_count,
      count(*) FILTER (WHERE type = 'services') AS services_count,
      count(*) FILTER (WHERE type = 'pages') AS pages_count
    FROM matched
  ),
  facet_cat AS (
    SELECT coalesce(jsonb_object_agg(category, cat_count), '{}'::jsonb) AS cat_obj
    FROM (
      SELECT category, count(*) AS cat_count
      FROM matched
      WHERE category IS NOT NULL
      GROUP BY category
      ORDER BY cat_count DESC
      LIMIT 20
    ) sub
  ),
  paged AS (
    SELECT * FROM filtered
    ORDER BY
      CASE WHEN p_sort = 'date' THEN NULL ELSE score END DESC NULLS LAST,
      created_at DESC,
      id DESC
    LIMIT p_limit OFFSET p_offset
  )
  SELECT
    coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb),
    (SELECT count(*)::integer FROM filtered),
    jsonb_build_object(
      'byType', jsonb_build_object(
        'news', (SELECT coalesce(news_count, 0) FROM facet_type),
        'services', (SELECT coalesce(services_count, 0) FROM facet_type),
        'pages', (SELECT coalesce(pages_count, 0) FROM facet_type)
      ),
      'byCategory', (SELECT cat_obj FROM facet_cat)
    )
  INTO v_results, v_total, v_facets
  FROM paged p;

  RETURN jsonb_build_object(
    'data', coalesce(v_results, '[]'::jsonb),
    'total', coalesce(v_total, 0),
    'facets', coalesce(v_facets, jsonb_build_object(
      'byType', jsonb_build_object('news', 0, 'services', 0, 'pages', 0),
      'byCategory', '{}'::jsonb
    ))
  );
END $$;

REVOKE ALL ON FUNCTION public.search_content(text,text,text,integer,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.search_content(text,text,text,integer,integer,text) TO service_role;

