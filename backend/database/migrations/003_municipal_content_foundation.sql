-- TalGov R2.1: structured municipal content foundation.
-- Additive schema and scoped privileges only. Creates no official content and
-- leaves existing published records intact. Apply in a reviewed transaction.

ALTER TABLE app.public_content
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE app.public_content
  ADD CONSTRAINT public_content_version_positive CHECK (version > 0);

-- Preserve every existing R2 kind while adding dedicated municipal CMS sections.
-- Subcategories (e.g. bidding, budget, executive order) live in validated body
-- metadata rather than requiring a different table for every public menu item.
ALTER TABLE app.public_content
  DROP CONSTRAINT public_content_kind_check;

ALTER TABLE app.public_content
  ADD CONSTRAINT public_content_kind_check CHECK (kind IN (
    'barangays', 'departments', 'officials', 'news', 'pages',
    'tourism_spots', 'events', 'navigation', 'downloadables',
    'ordinances', 'resolutions', 'citizens_charter_cms', 'services_cms',
    'advisories', 'updates', 'tourism_festivals', 'tourism_delicacies',
    'transparency_reports', 'organizational_chart', 'galleries'
  ));

-- Immutable audit history retains content write events once API authoring is enabled.
ALTER TABLE app.audit_events
  DROP CONSTRAINT audit_events_action_check;

ALTER TABLE app.audit_events
  ADD CONSTRAINT audit_events_action_check CHECK (action IN (
    'media.create', 'media.update', 'media.publish', 'media.unpublish',
    'media.delete', 'staff.access', 'migration.import', 'migration.rollback',
    'content.create', 'content.update', 'content.publish',
    'content.unpublish', 'content.archive', 'content.restore', 'content.delete',
    'source.create', 'source.approve'
  ));

CREATE INDEX public_content_editor_list
  ON app.public_content (kind, updated_at DESC, id)
  WHERE deleted_at IS NULL;

-- R2.1 authoring uses the existing live staff/MFA checks in every transaction.
-- Never grant source approval, hard deletion, DDL, or audit mutation to runtime.
GRANT SELECT ON app.public_content,app.content_asset_links TO talgov_runtime;
GRANT INSERT(kind,legacy_id,slug,title,body,source_id) ON app.public_content TO talgov_runtime;
-- Narrow the insert grants from the retired staging content policy as well.
REVOKE INSERT(publication,published_at) ON app.public_content FROM talgov_runtime;
GRANT UPDATE(slug,title,body,source_id,publication,published_at,deleted_at,version,updated_at)
  ON app.public_content TO talgov_runtime;
GRANT INSERT,DELETE ON app.content_asset_links TO talgov_runtime;
GRANT INSERT(reference,owner,sha256) ON app.content_sources TO talgov_runtime;

-- Approval is an explicit, audited administrator operation. Auth tables are
-- supplied by the existing R2 auth policy; no auth/bootstrap policy is changed.
CREATE FUNCTION app.approve_content_source(actor uuid, subject_id text, session text,
  source uuid, request text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
  SET search_path=pg_catalog,app AS $$
BEGIN
  PERFORM 1 FROM app.staff_accounts a
    JOIN public.r2_auth_user u ON u.id=a.subject
    JOIN public.r2_auth_session s ON s."userId"=u.id
    JOIN app.staff_session_assurance m ON m.session_id=s.id
    WHERE a.id=actor AND a.subject=subject_id AND a.provider='better-auth'
      AND a.active AND a.role='admin' AND u."emailVerified" AND u."twoFactorEnabled"
      AND s.id=session AND s."expiresAt">now() AND m.verified_at>now()-interval '5 minutes'
    FOR SHARE OF a,s,m;
  IF NOT FOUND THEN RAISE EXCEPTION 'Administrator MFA required' USING ERRCODE='42501'; END IF;
  UPDATE app.content_sources SET approved=true,reviewed_at=now() WHERE id=source AND NOT approved;
  IF NOT FOUND THEN RAISE EXCEPTION 'Source changed' USING ERRCODE='40001'; END IF;
  INSERT INTO app.audit_events(actor_id,action,resource_id,request_id)
    VALUES(actor,'source.approve',source,request);
END $$;
REVOKE ALL ON FUNCTION app.approve_content_source(uuid,text,text,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.approve_content_source(uuid,text,text,uuid,text) TO talgov_runtime;

-- A collection/report disappears immediately if a linked file is unpublished,
-- removed, or loses source/category approval. Private storage keys stay private.
CREATE OR REPLACE VIEW app.published_content WITH (security_barrier=true) AS
  SELECT c.id,c.kind,c.legacy_id,c.slug,c.title,c.body,c.published_at
  FROM app.public_content c JOIN app.content_sources s ON s.id=c.source_id
  WHERE c.publication='published' AND c.deleted_at IS NULL AND c.published_at<=now() AND s.approved
    AND NOT EXISTS (SELECT 1 FROM app.content_asset_links l WHERE l.content_id=c.id
      AND NOT EXISTS (SELECT 1 FROM app.published_media m WHERE m.id=l.asset_id));
