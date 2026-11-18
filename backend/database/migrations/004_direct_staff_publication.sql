-- TalGov R2.1: routine publication derives authority from authenticated staff.
-- Run after 003, in a reviewed transaction. Never run at application startup.
-- Existing sources, source-based publications and audit events are retained.
ALTER TABLE app.public_content ALTER COLUMN source_id DROP NOT NULL;
ALTER TABLE app.media_assets ALTER COLUMN source_id DROP NOT NULL;
ALTER TABLE app.public_content
  ADD COLUMN created_by uuid REFERENCES app.staff_accounts(id) ON DELETE RESTRICT,
  ADD COLUMN updated_by uuid REFERENCES app.staff_accounts(id) ON DELETE RESTRICT,
  ADD COLUMN published_by uuid REFERENCES app.staff_accounts(id) ON DELETE RESTRICT;
ALTER TABLE app.media_assets
  ADD COLUMN published_by uuid REFERENCES app.staff_accounts(id) ON DELETE RESTRICT;

-- These are file classifications, not placeholder content or approved sources.
INSERT INTO app.media_categories(kind,slug,title,approved) VALUES
  ('photo','website-photos','Website photos',true),
  ('document','website-documents','Website documents',true)
  ON CONFLICT(kind,slug) DO NOTHING;

CREATE TABLE app.content_publication_receipts (
  actor_id uuid NOT NULL REFERENCES app.staff_accounts(id) ON DELETE RESTRICT,
  submission_id uuid NOT NULL,
  payload_sha256 text NOT NULL CHECK (payload_sha256 ~ '^[a-f0-9]{64}$'),
  resource_id uuid NOT NULL REFERENCES app.public_content(id) ON DELETE RESTRICT,
  result jsonb NOT NULL CHECK (jsonb_typeof(result)='object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(actor_id,submission_id)
);
CREATE TRIGGER immutable_publication_receipt BEFORE UPDATE OR DELETE
  ON app.content_publication_receipts FOR EACH ROW EXECUTE FUNCTION app.immutable_record();
REVOKE ALL ON app.content_publication_receipts FROM PUBLIC;
GRANT SELECT,INSERT ON app.content_publication_receipts TO talgov_runtime;
GRANT INSERT(created_by,updated_by),UPDATE(updated_by) ON app.public_content TO talgov_runtime;
-- published_by is intentionally not granted to runtime. Only the functions
-- below can assign staff publication authority after live session/MFA checks.

CREATE FUNCTION app.require_publication_staff(actor uuid, subject_id text, session text)
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,app AS $$
BEGIN
  PERFORM 1 FROM app.staff_accounts a
    JOIN public.r2_auth_user u ON u.id=a.subject
    JOIN public.r2_auth_session s ON s."userId"=u.id
    JOIN app.staff_session_assurance m ON m.session_id=s.id
    WHERE a.id=actor AND a.subject=subject_id AND a.provider='better-auth'
      AND a.active AND a.role IN ('admin','editor')
      AND u."emailVerified" AND u."twoFactorEnabled"
      AND s.id=session AND s."expiresAt">now()
      AND m.verified_at>now()-interval '8 hours' FOR SHARE OF a,u,s,m;
  IF NOT FOUND THEN RAISE EXCEPTION 'Publishing permission and MFA required' USING ERRCODE='42501'; END IF;
  PERFORM set_config('talgov.publication_actor',actor::text,true);
  PERFORM set_config('talgov.publication_subject',subject_id,true);
  PERFORM set_config('talgov.publication_session',session,true);
END $$;
REVOKE ALL ON FUNCTION app.require_publication_staff(uuid,text,text) FROM PUBLIC;
-- Internal helper: runtime cannot invoke this function independently.

CREATE OR REPLACE FUNCTION app.require_approved_source() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,app AS $$
BEGIN
  IF NEW.publication='published' THEN
    IF NEW.published_by IS NULL THEN
      PERFORM 1 FROM app.content_sources WHERE id=NEW.source_id AND approved FOR SHARE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Publication requires source authority' USING ERRCODE='23514'; END IF;
    ELSIF TG_OP='INSERT' OR NEW.publication IS DISTINCT FROM OLD.publication
      OR NEW.published_by IS DISTINCT FROM OLD.published_by
      OR NEW.published_at IS DISTINCT FROM OLD.published_at THEN
      IF current_setting('talgov.publication_actor',true) IS DISTINCT FROM NEW.published_by::text THEN
        RAISE EXCEPTION 'Publishing permission required' USING ERRCODE='42501';
      END IF;
      PERFORM app.require_publication_staff(NEW.published_by,
        current_setting('talgov.publication_subject',true),current_setting('talgov.publication_session',true));
    END IF;
    IF TG_TABLE_NAME='media_assets' THEN
      PERFORM 1 FROM app.media_categories WHERE id=NEW.category_id AND kind=NEW.kind AND approved FOR SHARE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Publication requires a valid file category' USING ERRCODE='23514'; END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION app.publish_staff_media(actor uuid, subject_id text, session text,
  asset uuid, expected_version integer, photo_description text, request text)
  RETURNS app.media_assets LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,app AS $$
DECLARE row app.media_assets;
BEGIN
  PERFORM app.require_publication_staff(actor,subject_id,session);
  SELECT * INTO row FROM app.media_assets WHERE id=asset AND version=expected_version
    AND deleted_at IS NULL AND processing='ready' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'File changed or unavailable' USING ERRCODE='40001'; END IF;
  -- Already public files retain their original publication timestamp and history.
  IF EXISTS(SELECT 1 FROM app.published_media WHERE id=asset) THEN RETURN row; END IF;
  UPDATE app.media_assets SET publication='published',published_at=now(),published_by=actor,
    alt_text=CASE WHEN kind='photo' THEN COALESCE(NULLIF(btrim(alt_text),''),photo_description,'') ELSE alt_text END,
    updated_by=actor,updated_at=now(),version=version+1 WHERE id=asset RETURNING * INTO row;
  INSERT INTO app.audit_events(actor_id,action,resource_id,request_id) VALUES(actor,'media.publish',asset,request);
  RETURN row;
END $$;
REVOKE ALL ON FUNCTION app.publish_staff_media(uuid,text,text,uuid,integer,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.publish_staff_media(uuid,text,text,uuid,integer,text,text) TO talgov_runtime;

-- One client round trip for the selected files; all work stays in the same
-- transaction. Per-file validation and live authorization run inside Postgres.
CREATE FUNCTION app.publish_staff_media_bundle(actor uuid, subject_id text, session text,
  files jsonb, request text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,app AS $$
DECLARE file record;
BEGIN
  PERFORM app.require_publication_staff(actor,subject_id,session);
  IF jsonb_typeof(files)<>'array' OR jsonb_array_length(files)>50 THEN
    RAISE EXCEPTION 'Invalid attachments' USING ERRCODE='23514';
  END IF;
  FOR file IN SELECT * FROM jsonb_to_recordset(files) AS entry(asset_id uuid,version integer,alt_text text) ORDER BY asset_id LOOP
    PERFORM app.publish_staff_media(actor,subject_id,session,file.asset_id,file.version,file.alt_text,request);
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION app.publish_staff_media_bundle(uuid,text,text,jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.publish_staff_media_bundle(uuid,text,text,jsonb,text) TO talgov_runtime;

CREATE FUNCTION app.publish_staff_content(actor uuid, subject_id text, session text,
  content uuid, expected_version integer, request text)
  RETURNS app.public_content LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,app AS $$
DECLARE row app.public_content;
BEGIN
  PERFORM app.require_publication_staff(actor,subject_id,session);
  SELECT * INTO row FROM app.public_content WHERE id=content AND version=expected_version
    AND publication IN ('draft','published') AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Content changed or unavailable' USING ERRCODE='40001'; END IF;
  IF row.kind NOT IN ('news','advisories','updates','tourism_spots','tourism_festivals','events',
      'tourism_delicacies','transparency_reports','pages','organizational_chart','departments','galleries','downloadables') THEN
    RAISE EXCEPTION 'Unsupported publishing module' USING ERRCODE='23514';
  END IF;
  IF EXISTS(SELECT 1 FROM app.content_asset_links l WHERE l.content_id=content
      AND NOT EXISTS(SELECT 1 FROM app.published_media m WHERE m.id=l.asset_id)) THEN
    RAISE EXCEPTION 'Attachment is not ready for publication' USING ERRCODE='23514';
  END IF;
  IF row.kind IN ('transparency_reports','downloadables') AND NOT EXISTS(
      SELECT 1 FROM app.content_asset_links l JOIN app.published_media m ON m.id=l.asset_id
      WHERE l.content_id=content AND m.kind='document' AND m.mime='application/pdf') THEN
    RAISE EXCEPTION 'A PDF attachment is required' USING ERRCODE='23514';
  END IF;
  IF row.kind='galleries' AND (NOT EXISTS(SELECT 1 FROM app.content_asset_links WHERE content_id=content)
      OR EXISTS(SELECT 1 FROM app.content_asset_links l JOIN app.media_assets m ON m.id=l.asset_id
        WHERE l.content_id=content AND m.kind<>'photo')) THEN
    RAISE EXCEPTION 'A gallery requires photos' USING ERRCODE='23514';
  END IF;
  UPDATE app.public_content SET publication='published',published_at=now(),published_by=actor,
    updated_by=actor,version=version+1,updated_at=now() WHERE id=content RETURNING * INTO row;
  INSERT INTO app.audit_events(actor_id,action,resource_id,request_id) VALUES(actor,'content.publish',content,request);
  RETURN row;
END $$;
REVOKE ALL ON FUNCTION app.publish_staff_content(uuid,text,text,uuid,integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.publish_staff_content(uuid,text,text,uuid,integer,text) TO talgov_runtime;

CREATE OR REPLACE VIEW app.published_media WITH (security_barrier=true) AS
  SELECT m.id,m.kind,m.category_id,m.title,m.description,m.alt_text,m.mime,m.bytes,m.sha256,m.published_at
  FROM app.media_assets m LEFT JOIN app.content_sources s ON s.id=m.source_id
  JOIN app.media_categories c ON c.id=m.category_id
  WHERE m.publication='published' AND m.processing='ready' AND m.deleted_at IS NULL
    AND m.published_at<=now() AND (m.published_by IS NOT NULL OR s.approved) AND c.approved;
CREATE OR REPLACE VIEW app.published_content WITH (security_barrier=true) AS
  SELECT c.id,c.kind,c.legacy_id,c.slug,c.title,c.body,c.published_at
  FROM app.public_content c LEFT JOIN app.content_sources s ON s.id=c.source_id
  WHERE c.publication='published' AND c.deleted_at IS NULL AND c.published_at<=now()
    AND (c.published_by IS NOT NULL OR s.approved)
    AND NOT EXISTS(SELECT 1 FROM app.content_asset_links l WHERE l.content_id=c.id
      AND NOT EXISTS(SELECT 1 FROM app.published_media m WHERE m.id=l.asset_id));
