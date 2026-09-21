\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id,email) VALUES
 ('11111111-1111-4111-8111-111111111111','citizen@example.test'),
 ('22222222-2222-4222-8222-222222222222','other@example.test');
INSERT INTO public.certificate_requests(id,ticket_id,user_id,document_type,full_name,email,purpose) VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','S3-ONE','11111111-1111-4111-8111-111111111111','Barangay Clearance','Citizen','citizen@example.test','Work'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','S3-TWO','22222222-2222-4222-8222-222222222222','Business Permit','Other','other@example.test','Work');
DO $$ BEGIN
 IF (SELECT count(*) FROM public.form_email_jobs) <> 2 THEN RAISE EXCEPTION 'Missing submission jobs'; END IF;
 IF (SELECT count(*) FROM public.workflow_history) <> 2 THEN RAISE EXCEPTION 'Missing initial histories'; END IF;
END $$;
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM * FROM public.certificate_requests; RAISE EXCEPTION 'Anonymous request read'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM * FROM public.form_email_jobs; RAISE EXCEPTION 'Anonymous outbox read'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.claim_form_email(); RAISE EXCEPTION 'Anonymous claim'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET LOCAL request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.certificate_requests) <> 1 THEN RAISE EXCEPTION 'Ownership bypass'; END IF;
 IF (SELECT count(*) FROM public.workflow_history) <> 1 THEN RAISE EXCEPTION 'History ownership bypass'; END IF;
 BEGIN UPDATE public.certificate_requests SET status='Approved'; RAISE EXCEPTION 'Citizen status write'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO public.certificate_requests(ticket_id,document_type,full_name,email) VALUES ('ATTACK','Business Permit','Attacker','other@example.test'); RAISE EXCEPTION 'Citizen direct insert'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM * FROM public.form_email_templates; RAISE EXCEPTION 'Citizen template read'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.claim_form_email(); RAISE EXCEPTION 'Citizen claim'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET LOCAL ROLE service_role;
UPDATE public.certificate_requests SET status='Processing',version=2,status_remarks='Review started',status_actor_id='22222222-2222-4222-8222-222222222222' WHERE ticket_id='S3-ONE' AND version=1;
UPDATE public.certificate_requests SET status='Rejected',version=2 WHERE ticket_id='S3-ONE' AND version=1;
DO $$ DECLARE job public.form_email_jobs; other_job public.form_email_jobs; BEGIN
 IF (SELECT status FROM public.certificate_requests WHERE ticket_id='S3-ONE') <> 'Processing' THEN RAISE EXCEPTION 'Stale update overwrote status'; END IF;
 IF (SELECT count(*) FROM public.form_email_jobs) <> 3 THEN RAISE EXCEPTION 'Status job missing'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.workflow_history WHERE remarks='Review started') THEN RAISE EXCEPTION 'Staff remarks missing'; END IF;
 SELECT * INTO job FROM public.claim_form_email();
 SELECT * INTO other_job FROM public.claim_form_email();
 IF job.id=other_job.id THEN RAISE EXCEPTION 'Active lease claimed twice'; END IF;
 IF public.finish_form_email(job.id,gen_random_uuid(),true) THEN RAISE EXCEPTION 'Invalid lease accepted'; END IF;
 IF NOT public.finish_form_email(job.id,job.lease_token,false,NULL,'provider_http_503') THEN RAISE EXCEPTION 'Failure not acknowledged'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.form_email_jobs WHERE id=job.id AND state='pending' AND attempts=1 AND available_at>now()) THEN RAISE EXCEPTION 'Retry not scheduled'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.form_email_attempts WHERE job_id=job.id AND outcome='failed') THEN RAISE EXCEPTION 'Failure not logged'; END IF;
 PERFORM public.finish_form_email(other_job.id,other_job.lease_token,true,'message-one');
 UPDATE public.form_email_jobs SET available_at=now()-interval '1 second' WHERE id=job.id;
 SELECT * INTO job FROM public.claim_form_email();
 IF job.attempts<>2 THEN RAISE EXCEPTION 'Retry not claimed'; END IF;
 PERFORM public.finish_form_email(job.id,job.lease_token,true,'message-two');
 IF public.finish_form_email(job.id,job.lease_token,true,'duplicate') THEN RAISE EXCEPTION 'Duplicate acknowledgement'; END IF;
 SELECT * INTO job FROM public.claim_form_email();
 UPDATE public.form_email_jobs SET lease_until=now()-interval '1 second' WHERE id=job.id;
 SELECT * INTO other_job FROM public.claim_form_email();
 IF other_job.id<>job.id OR other_job.lease_token=job.lease_token THEN RAISE EXCEPTION 'Lease recovery failed'; END IF;
 IF public.finish_form_email(job.id,job.lease_token,true) THEN RAISE EXCEPTION 'Stale worker accepted'; END IF;
 UPDATE public.form_email_jobs SET attempts=5,lease_until=now()-interval '1 second' WHERE id=job.id;
 PERFORM public.claim_form_email();
 IF NOT EXISTS (SELECT 1 FROM public.form_email_jobs WHERE id=job.id AND state='dead') THEN RAISE EXCEPTION 'Exhausted job not dead'; END IF;
END $$;
-- Missing template must roll back the status and history as well as the job.
DELETE FROM public.form_email_jobs WHERE event_type='status_changed';
DELETE FROM public.form_email_templates WHERE event_type='status_changed';
DO $$ BEGIN
 BEGIN UPDATE public.certificate_requests SET status='Approved',version=3 WHERE ticket_id='S3-ONE'; RAISE EXCEPTION 'Missing template did not fail'; EXCEPTION WHEN no_data_found THEN NULL; END;
 IF (SELECT status FROM public.certificate_requests WHERE ticket_id='S3-ONE') <> 'Processing' THEN RAISE EXCEPTION 'Partial status transaction'; END IF;
 IF EXISTS (SELECT 1 FROM public.workflow_history WHERE status='Approved') THEN RAISE EXCEPTION 'Partial history transaction'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
