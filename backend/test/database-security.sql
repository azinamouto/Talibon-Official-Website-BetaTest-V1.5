\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id,email) VALUES
 ('11111111-1111-4111-8111-111111111111','citizen@example.test'),
 ('22222222-2222-4222-8222-222222222222','other@example.test'),
 ('33333333-3333-4333-8333-333333333333','admin@example.test');
UPDATE public.profiles SET role='super_admin',is_verified=true WHERE id='33333333-3333-4333-8333-333333333333';
INSERT INTO auth.sessions(id,user_id) VALUES ('44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111');
INSERT INTO public.news(title,slug,summary,content,status) VALUES
 ('Published','phase1-published','Summary','Body','published'),
 ('Draft','phase1-draft','Summary','Body','draft');
INSERT INTO public.notifications(title,message,user_id) VALUES
 ('Mine','Mine','11111111-1111-4111-8111-111111111111'),
 ('Other','Other','22222222-2222-4222-8222-222222222222');
INSERT INTO storage.buckets(id,name,public) VALUES ('avatars','avatars',true) ON CONFLICT DO NOTHING;

SET LOCAL ROLE anon;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.news WHERE slug LIKE 'phase1-%') <> 1 THEN RAISE EXCEPTION 'Anonymous draft disclosure'; END IF;
  BEGIN INSERT INTO public.news(title,slug,summary,content) VALUES ('Attack','attack','',''); RAISE EXCEPTION 'Anonymous write permitted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM * FROM public.profiles; RAISE EXCEPTION 'Anonymous profiles disclosed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.is_api_session_active('44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111'); RAISE EXCEPTION 'Anonymous session lookup permitted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET LOCAL request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.profiles) <> 1 THEN RAISE EXCEPTION 'Other profiles disclosed'; END IF;
  IF (SELECT count(*) FROM public.notifications WHERE title IN ('Mine','Other')) <> 1 THEN RAISE EXCEPTION 'Other notifications disclosed'; END IF;
  IF private.has_role(ARRAY['super_admin']) THEN RAISE EXCEPTION 'Citizen has admin'; END IF;
  BEGIN UPDATE public.profiles SET role='super_admin'; RAISE EXCEPTION 'Self promotion permitted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN UPDATE public.profiles SET is_verified=true; RAISE EXCEPTION 'Self verification permitted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN INSERT INTO public.profiles(id,email,role) VALUES ('55555555-5555-4555-8555-555555555555','attack@example.test','super_admin'); RAISE EXCEPTION 'Profile forgery permitted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN UPDATE public.notifications SET user_id='11111111-1111-4111-8111-111111111111'; RAISE EXCEPTION 'Notification reassignment permitted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN INSERT INTO storage.objects(bucket_id,name) VALUES ('avatars','22222222-2222-4222-8222-222222222222/attack.png'); RAISE EXCEPTION 'Other avatar upload permitted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN INSERT INTO public.security_audit_events(request_id,method,route,status_code) VALUES (gen_random_uuid(),'POST','forged',200); RAISE EXCEPTION 'Audit forgery permitted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
UPDATE public.profiles SET full_name='My updated name' WHERE id=auth.uid();
UPDATE public.notifications SET is_read=true WHERE user_id=auth.uid();
INSERT INTO storage.objects(bucket_id,name) VALUES ('avatars','11111111-1111-4111-8111-111111111111/avatar.png');
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE full_name='My updated name') THEN RAISE EXCEPTION 'Own profile update blocked'; END IF;
END $$;
RESET ROLE;
SET LOCAL request.jwt.claim.sub='33333333-3333-4333-8333-333333333333';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.news WHERE slug LIKE 'phase1-%') <> 2 THEN RAISE EXCEPTION 'Verified admin cannot read drafts'; END IF;
END $$;
UPDATE public.news SET title='Reviewed' WHERE slug='phase1-draft';
RESET ROLE;
UPDATE public.profiles SET is_verified=false WHERE id='33333333-3333-4333-8333-333333333333';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF private.has_role(ARRAY['super_admin']) THEN RAISE EXCEPTION 'Unverified admin accepted'; END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE service_role;
DO $$ BEGIN
  IF NOT public.is_api_session_active('44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111') THEN RAISE EXCEPTION 'Active session rejected'; END IF;
  IF public.is_api_session_active('44444444-4444-4444-8444-444444444444','22222222-2222-4222-8222-222222222222') THEN RAISE EXCEPTION 'Session ownership bypass'; END IF;
END $$;
INSERT INTO public.security_audit_events(request_id,method,route,status_code) VALUES(gen_random_uuid(),'POST','/api/auth/login',200);
DO $$ BEGIN
  BEGIN DELETE FROM public.security_audit_events; RAISE EXCEPTION 'Audit deletion permitted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
DELETE FROM auth.sessions WHERE id='44444444-4444-4444-8444-444444444444';
SET LOCAL ROLE service_role;
DO $$ BEGIN
  IF public.is_api_session_active('44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111') THEN RAISE EXCEPTION 'Revoked session accepted'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid=c.oid AND d.deptype='e')) THEN RAISE EXCEPTION 'Public table missing RLS'; END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prosecdef AND has_function_privilege('anon',p.oid,'execute')) THEN RAISE EXCEPTION 'Anonymous definer execution'; END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='v' AND NOT coalesce(c.reloptions @> ARRAY['security_invoker=true'],false)) THEN RAISE EXCEPTION 'View bypasses RLS'; END IF;
END $$;
ROLLBACK;
SELECT 'Database security assertions passed' AS result;
