\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id,email) VALUES
 ('11111111-1111-4111-8111-111111111111','s2-citizen@example.test'),
 ('33333333-3333-4333-8333-333333333333','s2-editor@example.test');
UPDATE public.profiles SET role='editor',is_verified=true WHERE id='33333333-3333-4333-8333-333333333333';
INSERT INTO public.pages(title,slug,content,status,deleted_at) VALUES
 ('Visible','s2-visible','Body','published',null),
 ('Draft','s2-draft','Body','draft',null),
 ('Deleted','s2-deleted','Body','published',now());
INSERT INTO public.news(title,slug,summary,content,status,deleted_at) VALUES
 ('Visible','s2-visible','Summary','Body','published',null),
 ('Draft','s2-draft','Summary','Body','draft',null),
 ('Deleted','s2-deleted','Summary','Body','published',now());
INSERT INTO public.services_cms(name,slug,description,office_responsible,status,deleted_at) VALUES
 ('Visible','s2-visible','Body','mayor','available',null),
 ('Draft','s2-draft','Body','mayor','coming-soon',null),
 ('Deleted','s2-deleted','Body','mayor','available',now());
SET LOCAL ROLE anon;
DO $$ DECLARE t text; n integer; BEGIN
  FOREACH t IN ARRAY ARRAY['pages','news','services_cms'] LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE slug LIKE ''s2-%%''',t) INTO n;
    IF n <> 1 THEN RAISE EXCEPTION 'Public visibility failed for %',t; END IF;
    BEGIN
      EXECUTE format('DELETE FROM public.%I WHERE slug=''s2-visible''',t);
      RAISE EXCEPTION 'Anonymous delete accepted for %',t;
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  END LOOP;
END $$;
RESET ROLE;
SET LOCAL request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
SET LOCAL ROLE authenticated;
DO $$ DECLARE t text; n integer; BEGIN
  FOREACH t IN ARRAY ARRAY['pages','news','services_cms'] LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE slug LIKE ''s2-%%''',t) INTO n;
    IF n <> 1 THEN RAISE EXCEPTION 'Citizen visibility failed for %',t; END IF;
    EXECUTE format('UPDATE public.%I SET slug=''s2-hacked'' WHERE slug=''s2-visible''',t);
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 0 THEN RAISE EXCEPTION 'Citizen update accepted for %',t; END IF;
    EXECUTE format('DELETE FROM public.%I WHERE slug=''s2-visible''',t);
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 0 THEN RAISE EXCEPTION 'Citizen delete accepted for %',t; END IF;
  END LOOP;
  BEGIN
    INSERT INTO public.pages(title,slug,content) VALUES('Forged','s2-forged','Body');
    RAISE EXCEPTION 'Citizen insert accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET LOCAL request.jwt.claim.sub='33333333-3333-4333-8333-333333333333';
SET LOCAL ROLE authenticated;
INSERT INTO public.pages(title,slug,content) VALUES('Editor created','s2-created','Body');
DO $$ DECLARE t text; n integer; BEGIN
  FOREACH t IN ARRAY ARRAY['pages','news','services_cms'] LOOP
    EXECUTE format('UPDATE public.%I SET slug=''s2-reviewed'' WHERE slug=''s2-draft''',t);
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 1 THEN RAISE EXCEPTION 'Editor update blocked for %',t; END IF;
    EXECUTE format('DELETE FROM public.%I WHERE slug=''s2-reviewed''',t);
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 1 THEN RAISE EXCEPTION 'Editor delete blocked for %',t; END IF;
  END LOOP;
END $$;
RESET ROLE;
UPDATE public.profiles SET is_verified=false WHERE id='33333333-3333-4333-8333-333333333333';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  BEGIN
    INSERT INTO public.pages(title,slug,content) VALUES('Unverified','s2-unverified','Body');
    RAISE EXCEPTION 'Unverified editor insert accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_pages_public_list') THEN RAISE EXCEPTION 'Missing pagination index'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE oid='public.pages'::regclass AND relrowsecurity) THEN RAISE EXCEPTION 'Pages missing RLS'; END IF;
END $$;
ROLLBACK;
SELECT 'Sprint 2 content assertions passed' AS result;
