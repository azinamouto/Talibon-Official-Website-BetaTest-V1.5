\set ON_ERROR_STOP on
BEGIN READ ONLY;
SET LOCAL statement_timeout = '60s';
DO $$
DECLARE item text;
BEGIN
  FOREACH item IN ARRAY ARRAY['roles','profiles','news','pages','services_cms',
    'certificate_requests','workflow_history','payments','notifications',
    'security_audit_events','form_email_jobs','form_email_attempts','admin_user_audit'] LOOP
    IF to_regclass('public.' || item) IS NULL THEN
      RAISE EXCEPTION 'Missing required table: %', item;
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p') AND NOT c.relrowsecurity) THEN
    RAISE EXCEPTION 'Public table missing RLS';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace
    WHERE n.nspname='public' AND NOT c.convalidated) THEN
    RAISE EXCEPTION 'Unvalidated public constraint';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles p LEFT JOIN auth.users u ON p.id=u.id WHERE u.id IS NULL) THEN
    RAISE EXCEPTION 'Orphaned profiles';
  END IF;
  IF to_regprocedure('public.is_api_session_active(uuid,uuid)') IS NULL THEN
    RAISE EXCEPTION 'Missing session verification function';
  END IF;
END $$;
COMMIT;
