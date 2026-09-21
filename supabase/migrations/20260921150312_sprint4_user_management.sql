INSERT INTO public.roles(id,name,description) VALUES ('staff','Service Staff','Processes municipal submissions') ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.profiles ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK (version > 0);
CREATE INDEX admin_users_created_idx ON public.profiles(created_at DESC,id DESC);

CREATE FUNCTION private.increment_profile_version() RETURNS trigger LANGUAGE plpgsql
SECURITY INVOKER SET search_path = '' AS $$ BEGIN NEW.version := OLD.version + 1; RETURN NEW; END $$;
REVOKE ALL ON FUNCTION private.increment_profile_version() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER profile_version BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION private.increment_profile_version();

-- Authenticated ownership policies must also deny an already-issued JWT after
-- deactivation. The private definer avoids recursive profile RLS, uses auth.uid(),
-- accepts no caller-supplied identity, and grants no data beyond a boolean.
CREATE FUNCTION private.account_active() RETURNS boolean LANGUAGE sql STABLE
SECURITY DEFINER SET search_path = '' AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id=(SELECT auth.uid()) AND deleted_at IS NULL);
$$;
REVOKE ALL ON FUNCTION private.account_active() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.account_active() TO authenticated,service_role;
DO $$ DECLARE t record; BEGIN
  FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p') AND c.relrowsecurity
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid=c.oid AND d.deptype='e') LOOP
    EXECUTE format('CREATE POLICY active_account_required ON public.%I AS RESTRICTIVE FOR ALL TO authenticated
      USING ((SELECT private.account_active())) WITH CHECK ((SELECT private.account_active()))',t.relname);
  END LOOP;
END $$;
CREATE POLICY active_account_required ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT private.account_active())) WITH CHECK ((SELECT private.account_active()));

CREATE TABLE public.admin_user_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  target_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  action text NOT NULL CHECK (action IN ('update','role','deactivate')),
  old_data jsonb NOT NULL, new_data jsonb NOT NULL,
  request_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_user_audit_target_idx ON public.admin_user_audit(target_id,created_at DESC);
CREATE INDEX admin_user_audit_actor_idx ON public.admin_user_audit(actor_id,created_at DESC);
ALTER TABLE public.admin_user_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_user_audit FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT ON public.admin_user_audit TO service_role;

CREATE FUNCTION public.admin_mutate_user(p_actor uuid,p_target uuid,p_action text,p_version integer,p_patch jsonb,p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE actor public.profiles; target public.profiles; changed public.profiles;
BEGIN
  -- Serialize admin changes before row reads, including concurrent demotions.
  -- All endpoints share this lock, avoiding actor/target lock-order deadlocks.
  PERFORM pg_advisory_xact_lock(73401,4);
  SELECT * INTO actor FROM public.profiles WHERE id=p_actor FOR UPDATE;
  IF actor.id IS NULL OR actor.deleted_at IS NOT NULL OR NOT actor.is_verified
    OR actor.role NOT IN ('admin','municipal_admin','super_admin') OR p_actor=p_target THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501';
  END IF;
  SELECT * INTO target FROM public.profiles WHERE id=p_target FOR UPDATE;
  IF target.id IS NULL THEN RAISE EXCEPTION 'Not found' USING ERRCODE='P0002'; END IF;
  IF actor.role <> 'super_admin' AND (p_action='role' OR target.role IN ('admin','municipal_admin','super_admin')) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501';
  END IF;
  IF p_version IS NULL OR target.version <> p_version OR target.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Stale or inactive user' USING ERRCODE='40001';
  END IF;
  IF p_request_id IS NULL OR p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' THEN
    RAISE EXCEPTION 'Invalid patch' USING ERRCODE='22023';
  END IF;
  IF p_action='role' THEN
    IF p_patch - 'role' <> '{}'::jsonb OR p_patch->>'role' IS NULL OR NOT EXISTS (SELECT 1 FROM public.roles WHERE id=p_patch->>'role') THEN
      RAISE EXCEPTION 'Invalid role' USING ERRCODE='22023';
    END IF;
  ELSIF p_action='update' THEN
    IF p_patch='{}'::jsonb OR p_patch - ARRAY['full_name','barangay_id','department_id','is_verified'] <> '{}'::jsonb
      OR (p_patch ? 'is_verified' AND jsonb_typeof(p_patch->'is_verified') <> 'boolean')
      OR (p_patch ? 'full_name' AND (jsonb_typeof(p_patch->'full_name') <> 'string' OR length(btrim(p_patch->>'full_name')) NOT BETWEEN 1 AND 200)) THEN
      RAISE EXCEPTION 'Invalid patch' USING ERRCODE='22023';
    END IF;
  ELSIF p_action='deactivate' THEN
    IF p_patch <> '{}'::jsonb THEN RAISE EXCEPTION 'Invalid patch' USING ERRCODE='22023'; END IF;
  ELSE RAISE EXCEPTION 'Invalid action' USING ERRCODE='22023';
  END IF;
  IF target.role='super_admin' AND target.is_verified AND
    (p_action='deactivate' OR (p_action='role' AND p_patch->>'role'<>'super_admin')
      OR (p_action='update' AND p_patch->>'is_verified'='false'))
    AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id<>p_target AND role='super_admin' AND is_verified AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Last super admin' USING ERRCODE='40001';
  END IF;
  UPDATE public.profiles SET
    full_name=CASE WHEN p_action='update' AND p_patch ? 'full_name' THEN btrim(p_patch->>'full_name') ELSE full_name END,
    barangay_id=CASE WHEN p_action='update' AND p_patch ? 'barangay_id' THEN p_patch->>'barangay_id' ELSE barangay_id END,
    department_id=CASE WHEN p_action='update' AND p_patch ? 'department_id' THEN p_patch->>'department_id' ELSE department_id END,
    is_verified=CASE WHEN p_action='update' AND p_patch ? 'is_verified' THEN (p_patch->>'is_verified')::boolean ELSE is_verified END,
    role=CASE WHEN p_action='role' THEN p_patch->>'role' ELSE role END,
    deleted_at=CASE WHEN p_action='deactivate' THEN clock_timestamp() ELSE deleted_at END
    WHERE id=p_target RETURNING * INTO changed;
  -- Any audit insertion failure rolls back the profile update in this transaction.
  INSERT INTO public.admin_user_audit(actor_id,target_id,action,old_data,new_data,request_id)
    VALUES(p_actor,p_target,p_action,
      jsonb_build_object('role',target.role,'is_verified',target.is_verified,'deleted_at',target.deleted_at,'version',target.version),
      jsonb_build_object('role',changed.role,'is_verified',changed.is_verified,'deleted_at',changed.deleted_at,'version',changed.version),p_request_id);
  RETURN to_jsonb(changed);
END $$;
REVOKE ALL ON FUNCTION public.admin_mutate_user(uuid,uuid,text,integer,jsonb,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_mutate_user(uuid,uuid,text,integer,jsonb,uuid) TO service_role;
