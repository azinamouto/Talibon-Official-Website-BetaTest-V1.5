-- Disposable data only. Keep generated data and measurements out of production.
SAVEPOINT report_fixture;
SET LOCAL TIME ZONE 'UTC';
INSERT INTO auth.users(id,email) VALUES ('44444444-4444-4444-8444-444444444444','perf@example.test');
INSERT INTO public.certificate_requests(ticket_id,document_type,full_name,email,created_at,user_id)
SELECT 'perf-'||i,'Barangay Clearance','Synthetic','synthetic@example.test',
  '2026-01-01'::timestamptz + (i % 86400) * interval '1 second', '44444444-4444-4444-8444-444444444444' FROM generate_series(1,100000) i;
INSERT INTO public.payments(ticket_id,amount,payment_method,created_at)
SELECT 'perf-'||i,123.45,'test','2026-01-01'::timestamptz + (i % 86400) * interval '1 second' FROM generate_series(1,100000) i;
INSERT INTO public.security_audit_events(request_id,method,route,status_code,created_at)
SELECT gen_random_uuid(),'POST','/api/forms/submissions',201,
  '2026-01-01'::timestamptz + (i % 86400) * interval '1 second' FROM generate_series(1,100000) i;
ANALYZE public.certificate_requests;
ANALYZE public.payments;
ANALYZE public.security_audit_events;
SET LOCAL ROLE service_role;
DO $$ DECLARE kind text; rows jsonb; next_rows jsonb; started timestamptz; elapsed numeric;
BEGIN
  FOREACH kind IN ARRAY ARRAY['submissions','payments','user-activity'] LOOP
    started := clock_timestamp();
    rows := public.admin_report(kind,'2026-01-01','2026-01-02',100);
    IF jsonb_array_length(rows) <> 101 THEN RAISE EXCEPTION 'Incorrect page size for %',kind; END IF;
    next_rows := public.admin_report(kind,'2026-01-01','2026-01-02',100,(rows->99->>'created_at')::timestamptz,(rows->99->>'id')::uuid);
    IF rows->100->>'id' <> next_rows->0->>'id' THEN RAISE EXCEPTION 'Cursor gap'; END IF;
    -- Deep cursor uses the same index rather than scanning an offset.
    PERFORM public.admin_report(kind,'2026-01-01','2026-01-02',100,'2026-01-01T00:00:10Z','ffffffff-ffff-ffff-ffff-ffffffffffff');
    elapsed := extract(epoch FROM clock_timestamp()-started)*1000;
    RAISE NOTICE 'REPORT BENCHMARK %: 100000 rows, first/next/deep pages % ms',kind,elapsed;
    IF elapsed > 2000 THEN RAISE EXCEPTION 'Report benchmark exceeded 2 seconds'; END IF;
  END LOOP;
  rows := public.admin_report('payments','2026-01-01','2026-01-01T00:00:01Z',100);
  IF jsonb_array_length(rows) <> 1 OR rows->0->>'amount' <> '123.45' THEN RAISE EXCEPTION 'Date boundary or decimal export incorrect'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
  IF has_function_privilege('anon','public.admin_report(text,timestamptz,timestamptz,integer,timestamptz,uuid)','EXECUTE')
    OR has_function_privilege('authenticated','public.admin_report(text,timestamptz,timestamptz,integer,timestamptz,uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'Report RPC exposed to browser roles';
  END IF;
END $$;
ROLLBACK TO SAVEPOINT report_fixture;
