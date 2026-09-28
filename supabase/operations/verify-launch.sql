-- Read-only assertions. Run with psql -X -v ON_ERROR_STOP=1 -f this-file.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '60s';
DO $$
DECLARE v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['roles','profiles','pages','news','services_cms',
    'certificate_requests','payments','workflow_history','notifications',
    'security_audit_events','form_email_jobs','form_email_attempts','admin_user_audit']
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=v_table AND c.relkind='r' AND c.relrowsecurity) THEN
      RAISE EXCEPTION 'Missing table or RLS: %', v_table;
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p') AND NOT c.relrowsecurity) THEN
    RAISE EXCEPTION 'Public table without RLS';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='version') THEN
    RAISE EXCEPTION 'Sprint 4 profile version missing';
  END IF;
  IF to_regprocedure('public.search_content(text,text,text,integer,integer,text)') IS NULL OR
     to_regprocedure('public.admin_mutate_user(uuid,uuid,text,integer,jsonb,uuid)') IS NULL THEN
    RAISE EXCEPTION 'Required API functions missing';
  END IF;
  IF has_function_privilege('anon', 'public.admin_mutate_user(uuid,uuid,text,integer,jsonb,uuid)', 'EXECUTE') OR
     has_function_privilege('authenticated', 'public.admin_mutate_user(uuid,uuid,text,integer,jsonb,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Admin mutation function exposed to browser roles';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles p LEFT JOIN auth.users u ON u.id=p.id WHERE u.id IS NULL) OR
     EXISTS (SELECT 1 FROM public.payments p LEFT JOIN public.certificate_requests r ON r.id=p.request_id
       WHERE p.request_id IS NOT NULL AND r.id IS NULL) OR
     EXISTS (SELECT 1 FROM public.form_email_jobs j LEFT JOIN public.certificate_requests r ON r.id=j.request_id
       WHERE r.id IS NULL) THEN
    RAISE EXCEPTION 'Orphaned business records';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT i.indisvalid) THEN
    RAISE EXCEPTION 'Invalid public index';
  END IF;
END $$;
SELECT 'PASS: launch schema, RLS, privileged RPC and orphan checks' AS result;
ROLLBACK;
