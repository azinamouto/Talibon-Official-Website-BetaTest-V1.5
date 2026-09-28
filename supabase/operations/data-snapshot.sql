-- Aggregate evidence only: no raw records or PII. Restrict access to these outputs.
-- Full scans: run during a write freeze; allow time on large production datasets.
-- Fingerprints detect changes, but do not replace backups or business validation.
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '5min';
SELECT format(
  'SELECT %L AS relation, count(*) AS rows, coalesce(sum((''x'' || substr(md5(to_jsonb(t)::text),1,15))::bit(60)::bigint),0) AS fingerprint FROM %I.%I t;',
  n.nspname || '.' || c.relname, n.nspname, c.relname)
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE c.relkind='r' AND (n.nspname='public' OR (n.nspname='auth' AND c.relname='users'))
ORDER BY n.nspname,c.relname
\gexec
ROLLBACK;
