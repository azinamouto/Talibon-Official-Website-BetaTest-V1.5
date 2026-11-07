\set ON_ERROR_STOP on
BEGIN READ ONLY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM app.public_content c JOIN app.content_sources s ON s.id=c.source_id WHERE c.publication='published' AND (NOT s.approved OR s.reviewed_at IS NULL)) THEN RAISE EXCEPTION 'Unapproved publication'; END IF;
  IF EXISTS (SELECT 1 FROM app.published_content WHERE body::text ~* 'https?://[^/]+/(storage|rest|auth)/v1') THEN RAISE EXCEPTION 'Retired provider URL requires approved transfer'; END IF;
END $$;
ROLLBACK;
