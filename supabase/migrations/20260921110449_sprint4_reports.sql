-- Bounded keyset exports: no offset scans or unbounded in-memory aggregation.
CREATE INDEX IF NOT EXISTS admin_submissions_created_idx ON public.certificate_requests(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS admin_payments_created_idx ON public.payments(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS admin_activity_created_idx ON public.security_audit_events(created_at DESC, id DESC);

CREATE OR REPLACE FUNCTION public.admin_report(
  p_kind text, p_from timestamptz, p_to timestamptz, p_limit integer DEFAULT 100,
  p_before timestamptz DEFAULT NULL, p_before_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE source_table text; fields text; result jsonb;
BEGIN
  IF p_from IS NULL OR p_to IS NULL OR p_to <= p_from OR p_to - p_from > interval '366 days'
    OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 500
    OR (p_before IS NULL) <> (p_before_id IS NULL) THEN
    RAISE EXCEPTION 'Invalid report query' USING ERRCODE = '22023';
  END IF;
  CASE p_kind
    WHEN 'submissions' THEN
      source_table := 'certificate_requests';
      fields := 'id,ticket_id,user_id,document_type,status,created_at,submitted_at,deleted_at';
    WHEN 'payments' THEN
      source_table := 'payments';
      fields := 'id,request_id,ticket_id,amount::text AS amount,currency,status,payment_method,completed_at,created_at';
    WHEN 'user-activity' THEN
      source_table := 'security_audit_events';
      fields := 'id,request_id,actor_id,method,route,status_code,created_at';
    ELSE RAISE EXCEPTION 'Invalid report kind' USING ERRCODE = '22023';
  END CASE;
  EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.created_at DESC,r.id DESC),''[]''::jsonb)
    FROM (SELECT %s FROM public.%I WHERE created_at >= $1 AND created_at < $2
      %s ORDER BY created_at DESC,id DESC LIMIT $5) r', fields, source_table,
      CASE WHEN p_before IS NULL THEN '' ELSE 'AND (created_at,id) < ($3,$4)' END)
    INTO result USING p_from,p_to,p_before,p_before_id,p_limit+1;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_report(text,timestamptz,timestamptz,integer,timestamptz,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_report(text,timestamptz,timestamptz,integer,timestamptz,uuid) TO service_role;
