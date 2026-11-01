-- REVIEW CANDIDATE ONLY. Outside the automatic migration chain. NOT EXECUTED.
-- Rehearse on an approved disposable clone after comparing live schemas/grants.
-- ROLLBACK is deliberate. Never change it to COMMIT without a separately reviewed release.
BEGIN;

DO $$
DECLARE relation_name text; routine record;
BEGIN
  FOREACH relation_name IN ARRAY ARRAY[
    'certificate_requests','workflow_history','payments','notifications',
    'form_email_jobs','form_email_attempts','form_email_templates'
  ] LOOP
    -- Missing tables are a drift failure, not something to silently ignore.
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated, service_role', relation_name);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', relation_name);
    EXECUTE format('CREATE POLICY r2_deferred_deny ON public.%I AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)', relation_name);
  END LOOP;
  -- Revoke all discovered overloads of the known workflow RPCs, including legacy signatures.
  FOR routine IN SELECT p.oid::regprocedure AS signature
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN (
      'submit_certificate_request','enqueue_form_email','claim_form_email','finish_form_email',
      'handle_certificate_request_created','handle_certificate_request_status_changed'
    )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated, service_role', routine.signature);
  END LOOP;
END $$;

-- Restrictive bucket policy leaves public documents/media policies intact.
-- BYPASSRLS/service_role and bucket public URLs require separate hosted controls.
CREATE POLICY r2_deferred_storage_deny ON storage.objects
  AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (bucket_id NOT IN ('citizen-vault','certificates'))
  WITH CHECK (bucket_id NOT IN ('citizen-vault','certificates'));

-- admin_report is SECURITY INVOKER in canonical SQL: table revocation closes deferred
-- reports without revoking the shared security-activity RPC. Verify this on the target.
-- Table owners/BYPASSRLS, column grants, SECURITY DEFINER routines, other schemas,
-- hosted signup, schedules and existing public object URLs require inventory/rehearsal.
ROLLBACK;
