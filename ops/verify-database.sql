\set ON_ERROR_STOP on
BEGIN READ ONLY;
SET LOCAL statement_timeout = '30s';
DO $$
DECLARE item text;
BEGIN
  FOREACH item IN ARRAY ARRAY['published_content','published_media','staff_accounts','media_assets','audit_events','staff_auth_audit','staff_session_assurance'] LOOP
    IF to_regclass('app.' || item) IS NULL THEN RAISE EXCEPTION 'Missing R2 relation: %',item; END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='app' AND NOT c.convalidated) THEN RAISE EXCEPTION 'Unvalidated constraint'; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='talgov_runtime' AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls OR rolcanlogin)) THEN RAISE EXCEPTION 'Unsafe runtime role'; END IF;
  IF has_table_privilege('talgov_runtime','app.public_content','INSERT,UPDATE,DELETE') THEN RAISE EXCEPTION 'Runtime can mutate retained content'; END IF;
END $$;
ROLLBACK;
