-- Phase 1 additive hardening for PRODUCTION_SETUP (V2) and V4 layouts.
-- Apply atomically after the chosen baseline; never replay V3/V4 over V2.
-- Execute with the migration runner transaction (or psql --single-transaction).
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- Definer is necessary to avoid recursive profile RLS. No caller-supplied user ID.
CREATE OR REPLACE FUNCTION private.has_role(allowed_roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid())
      AND p.is_verified IS TRUE AND p.deleted_at IS NULL
      AND p.role = ANY(allowed_roles)
  );
$$;
REVOKE ALL ON FUNCTION private.has_role(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(text[]) TO authenticated, service_role;

-- Replace the historical fail-open helper; existing trusted triggers may use it.
CREATE OR REPLACE FUNCTION public.is_staff_user()
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT private.has_role(ARRAY['super_admin','admin','municipal_admin','editor','staff']);
$$;

-- Disable direct invocation of legacy definer RPCs (including admin promotion).
-- Backend service-role calls remain available. Trigger invocation is unaffected.
DO $$ DECLARE f record; BEGIN
  FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.signature);
  END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS public.security_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  method text NOT NULL CHECK (method IN ('GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS')),
  route text NOT NULL,
  status_code integer NOT NULL CHECK (status_code BETWEEN 100 AND 599),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS security_audit_events_actor_created_idx
  ON public.security_audit_events(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS security_audit_events_request_idx ON public.security_audit_events(request_id);

-- Reset historical permissive policies: adding restrictive-looking permissive
-- policies alone would leave the old OR-true rules effective.
DO $$
DECLARE t record; p record; predicate text; staff text;
  content_tables text[] := ARRAY['news','events','tourism_spots','departments','barangays',
    'officials','municipal_services','services_cms','citizen_charters','citizens_charter_cms',
    'emergency_advisories','infrastructure_projects','legislative_documents','ordinances',
    'resolutions','transparency_documents','downloadables','dynamic_pages','page_contents',
    'homepage_widgets','hero_slides','homepage_slides','navigation','categories','tags'];
BEGIN
  FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p')
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid=c.oid AND d.deptype='e')
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.relname);
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t.relname
    LOOP EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t.relname); END LOOP;
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', t.relname);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t.relname);
    IF t.relname = ANY(content_tables) THEN
      predicate := 'true';
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t.relname AND column_name='deleted_at') THEN
        predicate := predicate || ' AND deleted_at IS NULL';
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t.relname AND column_name='status') THEN
        predicate := predicate || ' AND status::text IN (''published'',''active'',''available'')';
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t.relname AND column_name='is_active') THEN
        predicate := predicate || ' AND is_active IS TRUE';
      END IF;
      staff := 'private.has_role(ARRAY[''super_admin'',''admin'',''municipal_admin'',''editor''])';
      EXECUTE format('GRANT SELECT ON public.%I TO anon, authenticated', t.relname);
      EXECUTE format('GRANT INSERT, UPDATE, DELETE ON public.%I TO authenticated', t.relname);
      EXECUTE format('CREATE POLICY public_read ON public.%I FOR SELECT TO anon, authenticated USING (%s)', t.relname, predicate);
      EXECUTE format('CREATE POLICY content_staff ON public.%I FOR ALL TO authenticated USING (%s) WITH CHECK (%s)', t.relname, staff, staff);
    ELSIF t.relname NOT IN ('profiles','notifications') THEN
      -- Private records have no anonymous access. Scoped barangay/department roles
      -- get no municipality-wide access until scoped endpoints exist.
      staff := 'private.has_role(ARRAY[''super_admin'',''admin'',''municipal_admin''])';
      IF t.relname IN ('certificate_requests','service_requests','workflow_history','service_request_history','citizen_notification_preferences','notification_delivery_logs') THEN
        staff := 'private.has_role(ARRAY[''super_admin'',''admin'',''municipal_admin'',''staff''])';
      END IF;
      EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t.relname);
      EXECUTE format('CREATE POLICY private_read ON public.%I FOR SELECT TO authenticated USING (%s)', t.relname, staff);
      -- Writes to private records and access-control tables go through trusted APIs.
    END IF;
  END LOOP;
END $$;

GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE(full_name) ON public.profiles TO authenticated;
CREATE POLICY profile_read ON public.profiles FOR SELECT TO authenticated
  USING (id=(SELECT auth.uid()) OR private.has_role(ARRAY['super_admin','admin','municipal_admin']));
CREATE POLICY profile_update ON public.profiles FOR UPDATE TO authenticated
  USING (id=(SELECT auth.uid()) AND deleted_at IS NULL)
  WITH CHECK (id=(SELECT auth.uid()) AND deleted_at IS NULL);

GRANT SELECT ON public.notifications TO authenticated;
GRANT UPDATE(is_read) ON public.notifications TO authenticated;
CREATE POLICY notification_read ON public.notifications FOR SELECT TO authenticated
  USING (user_id=(SELECT auth.uid()));
CREATE POLICY notification_update ON public.notifications FOR UPDATE TO authenticated
  USING (user_id=(SELECT auth.uid())) WITH CHECK (user_id=(SELECT auth.uid()));
CREATE INDEX IF NOT EXISTS phase1_notifications_user_idx ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS phase1_profiles_department_idx ON public.profiles(department_id);
CREATE INDEX IF NOT EXISTS phase1_profiles_barangay_idx ON public.profiles(barangay_id);

-- Compatibility/aggregate views must honor base-table RLS (Postgres 15+).
DO $$ DECLARE v record; BEGIN
  FOR v IN SELECT table_name FROM information_schema.views WHERE table_schema='public' LOOP
    EXECUTE format('ALTER VIEW public.%I SET (security_invoker=true)', v.table_name);
  END LOOP;
END $$;

-- The sole new privileged RPC is backend-only and checks both session and user.
CREATE OR REPLACE FUNCTION public.is_api_session_active(p_session_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM auth.sessions s
    WHERE s.id=p_session_id AND s.user_id=p_user_id
      AND (s.not_after IS NULL OR s.not_after > now()));
$$;
REVOKE ALL ON FUNCTION public.is_api_session_active(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_api_session_active(uuid,uuid) TO service_role;

-- Storage policies cover both deployed bucket naming conventions.
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
  LOOP EXECUTE format('DROP POLICY %I ON storage.objects', p.policyname); END LOOP;
END $$;
CREATE POLICY public_media_read ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id IN ('public-cms','public-documents','documents','media','avatars'));
CREATE POLICY content_media_write ON storage.objects FOR ALL TO authenticated
  USING (bucket_id IN ('public-cms','public-documents','documents','media') AND private.has_role(ARRAY['super_admin','admin','municipal_admin','editor']))
  WITH CHECK (bucket_id IN ('public-cms','public-documents','documents','media') AND private.has_role(ARRAY['super_admin','admin','municipal_admin','editor']));
CREATE POLICY own_avatar ON storage.objects FOR ALL TO authenticated
  USING (bucket_id='avatars' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text)
  WITH CHECK (bucket_id='avatars' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
CREATE POLICY own_documents ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('citizen-vault','certificates') AND
    ((storage.foldername(name))[1]=(SELECT auth.uid())::text OR private.has_role(ARRAY['super_admin','admin','municipal_admin','staff'])));
CREATE POLICY own_uploads ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='citizen-vault' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
-- Issued certificates can only be written by the backend, not by applicants.
UPDATE storage.buckets SET public=false, file_size_limit=10485760,
  allowed_mime_types=ARRAY['application/pdf','image/jpeg','image/png']
  WHERE id IN ('citizen-vault','certificates');
UPDATE storage.buckets SET file_size_limit=5242880,
  allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp'] WHERE id='avatars';
UPDATE storage.buckets SET file_size_limit=10485760,
  allowed_mime_types=ARRAY['application/pdf','image/jpeg','image/png','image/webp']
  WHERE id IN ('public-cms','public-documents','documents','media');


-- An audit writer may append; it cannot rewrite or erase security events.
REVOKE UPDATE, DELETE, TRUNCATE ON public.security_audit_events FROM service_role;

-- Quarantine only the historical V4 fixture if its published default password
-- is still installed. Real accounts with changed credentials are not touched.
DO $$ DECLARE compromised_id uuid; crypto_schema text; BEGIN
  SELECT n.nspname INTO crypto_schema FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE e.extname='pgcrypto';
  IF crypto_schema IS NOT NULL THEN
    EXECUTE format('SELECT id FROM auth.users WHERE id = ''00000000-0000-0000-0000-000000000000''::uuid AND encrypted_password = %I.crypt($1, encrypted_password)', crypto_schema)
      INTO compromised_id USING 'Admin123!';
    IF compromised_id IS NOT NULL THEN
      UPDATE auth.users SET banned_until='infinity'::timestamptz WHERE id=compromised_id;
      DELETE FROM auth.sessions WHERE user_id=compromised_id;
      UPDATE public.profiles SET is_verified=false, deleted_at=now() WHERE id=compromised_id;
    END IF;
  END IF;
END $$;

-- Pin legacy routine lookup paths and keep extensions out of the exposed API schema.
REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated;
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;
DO $$ DECLARE f record; extension_record record; BEGIN
  FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid=p.oid AND d.deptype='e')
      AND NOT EXISTS (SELECT 1 FROM unnest(p.proconfig) cfg WHERE cfg LIKE 'search_path=%')
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, extensions, pg_temp', f.signature);
  END LOOP;
  FOR extension_record IN SELECT e.extname FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace
    WHERE n.nspname='public' AND e.extrelocatable AND e.extname IN ('uuid-ossp','pgcrypto','pg_trgm')
  LOOP EXECUTE format('ALTER EXTENSION %I SET SCHEMA extensions', extension_record.extname); END LOOP;
END $$;
