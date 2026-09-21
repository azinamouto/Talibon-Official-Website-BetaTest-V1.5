-- S2-BE-01: pages use the same verified content roles as news/services.
DO $$ BEGIN
  IF to_regtype('public.news_status_type') IS NULL OR to_regclass('public.services_cms') IS NULL THEN
    RAISE EXCEPTION 'Sprint 2 requires the canonical Sprint 1 schema. Reconcile historical V4 layouts in staging first; do not replay the baseline over existing data.';
  END IF;
END $$;
CREATE TABLE public.pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
  slug text NOT NULL UNIQUE CHECK (length(slug) <= 160 AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  content text NOT NULL CHECK (length(btrim(content)) BETWEEN 1 AND 100000),
  status public.news_status_type NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pages FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.pages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.pages TO authenticated;
GRANT ALL ON public.pages TO service_role;
CREATE POLICY public_read ON public.pages FOR SELECT TO anon, authenticated
  USING (status = 'published' AND deleted_at IS NULL);
CREATE POLICY content_staff ON public.pages FOR ALL TO authenticated
  USING (private.has_role(ARRAY['super_admin','admin','municipal_admin','editor']))
  WITH CHECK (private.has_role(ARRAY['super_admin','admin','municipal_admin','editor']));
CREATE TRIGGER set_pages_updated_at BEFORE UPDATE ON public.pages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER audit_pages_changes AFTER INSERT OR UPDATE OR DELETE ON public.pages
  FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

-- S2-BE-02: deterministic public pagination without scanning hidden content.
CREATE INDEX idx_pages_public_list ON public.pages(created_at DESC, id DESC)
  WHERE deleted_at IS NULL AND status = 'published';
CREATE INDEX idx_news_public_list ON public.news(created_at DESC, id DESC)
  WHERE deleted_at IS NULL AND status = 'published';
CREATE INDEX idx_services_public_list ON public.services_cms(created_at DESC, id DESC)
  WHERE deleted_at IS NULL AND status = 'available';
