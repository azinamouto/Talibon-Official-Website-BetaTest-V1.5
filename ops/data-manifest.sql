\set ON_ERROR_STOP on
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '120s';
-- Hash sorted row hashes, not citizen data. Compare manifests during a write freeze.
-- Large tables may need a longer reviewed timeout or a dedicated snapshot job.
SELECT format(
  'SELECT %L AS relation, count(*) AS rows, md5(coalesce(string_agg(row_hash, '''' ORDER BY row_hash), '''')) AS digest FROM (SELECT md5(row_to_json(t)::text) AS row_hash FROM %I.%I t) s;',
  schemaname || '.' || tablename, schemaname, tablename)
FROM pg_tables WHERE schemaname IN ('public','auth') ORDER BY schemaname, tablename
\gexec
COMMIT;
