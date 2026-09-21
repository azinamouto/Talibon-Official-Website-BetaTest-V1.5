SAVEPOINT users_fixture;
INSERT INTO auth.users(id,email) VALUES
 ('55555555-5555-4555-8555-555555555551','super1@example.test'),
 ('55555555-5555-4555-8555-555555555552','super2@example.test'),
 ('55555555-5555-4555-8555-555555555553','admin@example.test'),
 ('55555555-5555-4555-8555-555555555554','managed@example.test');
UPDATE public.profiles SET role='super_admin',is_verified=true WHERE id IN ('55555555-5555-4555-8555-555555555551','55555555-5555-4555-8555-555555555552');
UPDATE public.profiles SET role='admin',is_verified=true WHERE id='55555555-5555-4555-8555-555555555553';
INSERT INTO public.notifications(user_id,title,message) VALUES('55555555-5555-4555-8555-555555555554','Private','Private');
INSERT INTO storage.objects(bucket_id,name,owner) VALUES('public-cms','deactivation-check.txt','55555555-5555-4555-8555-555555555554');
SET LOCAL ROLE service_role;
DO $$ DECLARE s uuid:='55555555-5555-4555-8555-555555555551'; a uuid:='55555555-5555-4555-8555-555555555553';
  t uuid:='55555555-5555-4555-8555-555555555554'; result jsonb;
BEGIN
  BEGIN PERFORM public.admin_mutate_user(a,t,'role',1,'{"role":"admin"}',gen_random_uuid()); RAISE EXCEPTION 'Admin role escalation'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.admin_mutate_user(a,s,'update',2,'{"full_name":"Bad"}',gen_random_uuid()); RAISE EXCEPTION 'Admin modified super'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.admin_mutate_user(s,s,'deactivate',2,'{}',gen_random_uuid()); RAISE EXCEPTION 'Self deactivation'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.admin_mutate_user(t,a,'deactivate',2,'{}',gen_random_uuid()); RAISE EXCEPTION 'Citizen mutation'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  result:=public.admin_mutate_user(s,t,'role',1,'{"role":"editor"}',gen_random_uuid());
  IF result->>'role'<>'editor' OR result->>'version'<>'2' THEN RAISE EXCEPTION 'Role change failed'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.admin_user_audit WHERE actor_id=s AND target_id=t AND old_data->>'role'='guest' AND new_data->>'role'='editor') THEN RAISE EXCEPTION 'Missing role audit'; END IF;
  BEGIN PERFORM public.admin_mutate_user(s,t,'role',1,'{"role":"citizen"}',gen_random_uuid()); RAISE EXCEPTION 'Stale write accepted'; EXCEPTION WHEN serialization_failure THEN NULL; END;
  BEGIN PERFORM public.admin_mutate_user(a,t,'update',2,'{"role":"admin"}',gen_random_uuid()); RAISE EXCEPTION 'Overposting'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  result:=public.admin_mutate_user(a,t,'update',2,'{"full_name":"Changed","is_verified":true}',gen_random_uuid());
  IF result->>'version'<>'3' THEN RAISE EXCEPTION 'Version not incremented'; END IF;
  BEGIN UPDATE public.admin_user_audit SET action='deactivate'; RAISE EXCEPTION 'Mutable audit'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN DELETE FROM public.admin_user_audit; RAISE EXCEPTION 'Deletable audit'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  PERFORM public.admin_mutate_user(s,'55555555-5555-4555-8555-555555555552','role',2,'{"role":"citizen"}',gen_random_uuid());
  BEGIN PERFORM public.admin_mutate_user('55555555-5555-4555-8555-555555555552',s,'deactivate',2,'{}',gen_random_uuid()); RAISE EXCEPTION 'Demoted actor retained privileges'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.admin_mutate_user(s,s,'role',2,'{"role":"citizen"}',gen_random_uuid()); RAISE EXCEPTION 'Last super admin removed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
-- Audit failure must roll back the profile mutation.
REVOKE INSERT ON public.admin_user_audit FROM service_role;
SET LOCAL ROLE service_role;
DO $$ BEGIN
  BEGIN PERFORM public.admin_mutate_user('55555555-5555-4555-8555-555555555553','55555555-5555-4555-8555-555555555554','update',3,'{"full_name":"Must roll back"}',gen_random_uuid());
    RAISE EXCEPTION 'Unaudited mutation succeeded'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  IF EXISTS(SELECT 1 FROM public.profiles WHERE full_name='Must roll back') THEN RAISE EXCEPTION 'Mutation did not roll back'; END IF;
END $$;
RESET ROLE;
GRANT INSERT ON public.admin_user_audit TO service_role;
SET LOCAL ROLE service_role;
SELECT public.admin_mutate_user('55555555-5555-4555-8555-555555555553','55555555-5555-4555-8555-555555555554','deactivate',3,'{}',gen_random_uuid());
DO $$ BEGIN
  BEGIN PERFORM public.admin_mutate_user('55555555-5555-4555-8555-555555555554','55555555-5555-4555-8555-555555555553','update',2,'{"full_name":"Bad"}',gen_random_uuid()); RAISE EXCEPTION 'Inactive actor accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET LOCAL request.jwt.claim.sub='55555555-5555-4555-8555-555555555554';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM public.profiles) OR EXISTS(SELECT 1 FROM public.notifications) THEN RAISE EXCEPTION 'Deactivated JWT bypassed RLS'; END IF;
  IF EXISTS(SELECT 1 FROM storage.objects WHERE name='deactivation-check.txt') THEN RAISE EXCEPTION 'Deactivated JWT bypassed storage RLS'; END IF;
  BEGIN PERFORM public.admin_mutate_user('55555555-5555-4555-8555-555555555551','55555555-5555-4555-8555-555555555554','role',4,'{"role":"admin"}',gen_random_uuid()); RAISE EXCEPTION 'Browser invoked admin RPC'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM * FROM public.admin_user_audit; RAISE EXCEPTION 'Audit visible to browser'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
DO $$ BEGIN
  IF has_function_privilege('anon','public.admin_mutate_user(uuid,uuid,text,integer,jsonb,uuid)','EXECUTE') THEN RAISE EXCEPTION 'Anonymous admin RPC'; END IF;
END $$;
ROLLBACK TO SAVEPOINT users_fixture;
