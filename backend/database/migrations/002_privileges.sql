-- Cluster role provision requires CREATEROLE; no login/password or membership is provisioned here.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='talgov_runtime') THEN
    CREATE ROLE talgov_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='talgov_runtime' AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls OR rolcanlogin)) THEN
    RAISE EXCEPTION 'Unsafe existing runtime role';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.member WHERE r.rolname='talgov_runtime') THEN
    RAISE EXCEPTION 'Runtime group must not inherit other roles';
  END IF;
END $$;
REVOKE ALL ON ALL TABLES IN SCHEMA app FROM PUBLIC,talgov_runtime;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app FROM PUBLIC,talgov_runtime;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA app TO talgov_runtime;
GRANT SELECT ON app.published_content,app.published_media,app.staff_accounts,app.media_assets,app.media_categories,app.content_sources,app.audit_events TO talgov_runtime;
GRANT UPDATE(role,active,version,updated_at) ON app.staff_accounts TO talgov_runtime;
GRANT INSERT(kind,category_id,source_id,title,description,alt_text,object_key,mime,bytes,sha256,created_by,updated_by) ON app.media_assets TO talgov_runtime;
GRANT UPDATE(title,description,alt_text,publication,published_at,deleted_at,updated_by,version,updated_at) ON app.media_assets TO talgov_runtime;
GRANT INSERT ON app.audit_events TO talgov_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA app REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA app REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
