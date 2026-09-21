-- S3-BE-03: transactional email outbox. Only the backend worker can read PII.
CREATE TABLE public.form_email_templates (
  event_type text PRIMARY KEY CHECK (event_type IN ('submitted','status_changed')),
  subject text NOT NULL CHECK (length(subject) BETWEEN 1 AND 200),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 10000)
);
INSERT INTO public.form_email_templates VALUES
 ('submitted','Application received: {{ticketId}}','Hello {{fullName}}, your {{documentType}} application was received. Status: {{status}}. Track your application: {{trackingUrl}}'),
 ('status_changed','Application update: {{ticketId}}','Hello {{fullName}}, your {{documentType}} application is now {{status}}. {{remarks}} Track your application: {{trackingUrl}}');
CREATE TABLE public.form_email_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.certificate_requests(id) ON DELETE CASCADE,
  request_version integer NOT NULL,
  event_type text NOT NULL REFERENCES public.form_email_templates(event_type),
  payload jsonb NOT NULL,
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','processing','sent','dead')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  available_at timestamptz NOT NULL DEFAULT now(),
  lease_until timestamptz,
  lease_token uuid,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(request_id,request_version,event_type)
);
CREATE INDEX form_email_jobs_due_idx ON public.form_email_jobs(available_at,created_at) WHERE state IN ('pending','processing');
CREATE INDEX form_email_jobs_event_idx ON public.form_email_jobs(event_type);
CREATE TABLE public.form_email_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.form_email_jobs(id) ON DELETE CASCADE,
  attempt integer NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('sent','failed','lease_expired')),
  error_code text,
  provider_message_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(job_id,attempt)
);
ALTER TABLE public.form_email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_email_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_email_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.form_email_templates,public.form_email_jobs,public.form_email_attempts FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.form_email_templates,public.form_email_jobs,public.form_email_attempts TO service_role;

CREATE FUNCTION public.enqueue_form_email() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE event_name text; template public.form_email_templates;
BEGIN
  IF TG_OP='UPDATE' THEN
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
    event_name := 'status_changed';
  ELSE event_name := 'submitted'; END IF;
  SELECT * INTO STRICT template FROM public.form_email_templates WHERE event_type=event_name;
  INSERT INTO public.form_email_jobs(request_id,request_version,event_type,payload)
  VALUES (NEW.id,NEW.version,event_name,jsonb_build_object(
    'email',NEW.email,'fullName',NEW.full_name,'ticketId',NEW.ticket_id,
    'documentType',NEW.document_type,'status',NEW.status,'remarks',NEW.status_remarks,
    'subject',template.subject,'body',template.body));
  RETURN NEW;
END $$;
CREATE TRIGGER enqueue_form_email AFTER INSERT OR UPDATE OF status ON public.certificate_requests
FOR EACH ROW EXECUTE FUNCTION public.enqueue_form_email();

-- Single-job leases avoid reserving a batch longer than a serverless invocation.
CREATE FUNCTION public.claim_form_email() RETURNS SETOF public.form_email_jobs
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE job public.form_email_jobs;
BEGIN
  FOR job IN SELECT * FROM public.form_email_jobs
    WHERE (state='pending' AND available_at <= now()) OR (state='processing' AND lease_until <= now())
    ORDER BY available_at,created_at FOR UPDATE SKIP LOCKED LIMIT 20
  LOOP
    IF job.state='processing' THEN
      INSERT INTO public.form_email_attempts(job_id,attempt,outcome,error_code)
        VALUES (job.id,job.attempts,'lease_expired','worker_lease_expired') ON CONFLICT DO NOTHING;
    END IF;
    IF job.attempts >= 5 THEN
      UPDATE public.form_email_jobs SET state='dead',lease_until=NULL,lease_token=NULL,last_error='attempts_exhausted' WHERE id=job.id;
      CONTINUE;
    END IF;
    RETURN QUERY UPDATE public.form_email_jobs SET state='processing',attempts=attempts+1,
      lease_until=now()+interval '2 minutes',lease_token=gen_random_uuid() WHERE id=job.id RETURNING *;
    RETURN;
  END LOOP;
END $$;
CREATE FUNCTION public.finish_form_email(p_id uuid,p_token uuid,p_success boolean,p_message_id text DEFAULT NULL,p_error text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE job public.form_email_jobs;
BEGIN
  SELECT * INTO job FROM public.form_email_jobs WHERE id=p_id AND state='processing' AND lease_token=p_token AND lease_until>now() FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO public.form_email_attempts(job_id,attempt,outcome,error_code,provider_message_id)
    VALUES(job.id,job.attempts,CASE WHEN p_success THEN 'sent' ELSE 'failed' END,left(p_error,100),left(p_message_id,200));
  UPDATE public.form_email_jobs SET
    state=CASE WHEN p_success THEN 'sent' WHEN attempts>=5 THEN 'dead' ELSE 'pending' END,
    available_at=now()+make_interval(secs => (30*power(2,job.attempts-1))::integer),
    lease_until=NULL,lease_token=NULL,last_error=CASE WHEN p_success THEN NULL ELSE left(p_error,100) END
    WHERE id=job.id;
  RETURN true;
END $$;
REVOKE EXECUTE ON FUNCTION public.enqueue_form_email(),public.claim_form_email(),public.finish_form_email(uuid,uuid,boolean,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_form_email(),public.finish_form_email(uuid,uuid,boolean,text,text) TO service_role;
