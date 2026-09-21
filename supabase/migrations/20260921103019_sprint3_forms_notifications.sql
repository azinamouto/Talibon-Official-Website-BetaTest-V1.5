-- S3-BE-01. Canonical Sprint 1 schema required. Legacy rows stay unowned until
-- an operator verifies ownership; never infer it from a caller-supplied email.
ALTER TABLE public.certificate_requests
  ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  ADD COLUMN details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(details) = 'object'),
  ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  ADD COLUMN status_remarks text NOT NULL DEFAULT '' CHECK (length(status_remarks) <= 1000),
  ADD COLUMN status_actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
CREATE INDEX certificate_requests_owner_created_idx ON public.certificate_requests(user_id, submitted_at DESC, id DESC) WHERE deleted_at IS NULL;
CREATE INDEX certificate_requests_actor_idx ON public.certificate_requests(status_actor_id);
CREATE INDEX workflow_history_request_created_idx ON public.workflow_history(request_id, created_at);

DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT tablename, policyname FROM pg_policies WHERE schemaname='public' AND tablename IN ('certificate_requests','workflow_history') LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename);
  END LOOP;
END $$;
REVOKE ALL ON public.certificate_requests, public.workflow_history FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.certificate_requests, public.workflow_history TO authenticated;
GRANT ALL ON public.certificate_requests, public.workflow_history TO service_role;
CREATE POLICY request_owner_read ON public.certificate_requests FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) AND deleted_at IS NULL);
CREATE POLICY history_owner_read ON public.workflow_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.certificate_requests r WHERE r.id=request_id AND r.user_id=(SELECT auth.uid()) AND r.deleted_at IS NULL));

CREATE OR REPLACE FUNCTION public.handle_certificate_request_created() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$ BEGIN
  IF NEW.user_id IS NULL THEN RAISE EXCEPTION 'Submission owner is required' USING ERRCODE='23514'; END IF;
  INSERT INTO public.workflow_history(request_id,status,remarks,actor_id)
    VALUES (NEW.id,NEW.status,'Application successfully submitted online.',NEW.user_id);
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.handle_certificate_request_status_changed() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$ BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.workflow_history(request_id,status,remarks,actor_id)
      VALUES (NEW.id,NEW.status,NEW.status_remarks,NEW.status_actor_id);
    IF NEW.user_id IS NOT NULL THEN
      INSERT INTO public.notifications(user_id,title,message,category,action_url)
        VALUES (NEW.user_id,'Application Status Update','Your application is now ' || NEW.status::text,'WORKFLOW','/e-services?track=' || NEW.ticket_id);
    END IF;
  END IF;
  RETURN NEW;
END $$;
-- All legacy request RPCs remain backend-only; browser writes would bypass DTO validation.
REVOKE EXECUTE ON FUNCTION public.submit_certificate_request(text,text,text,text,text,text,text[]) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_request_status_by_ticket(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_request_status(uuid,public.request_status_type,text) FROM PUBLIC, anon, authenticated;
