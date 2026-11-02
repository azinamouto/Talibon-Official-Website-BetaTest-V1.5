CREATE SCHEMA app;
REVOKE ALL ON SCHEMA app FROM PUBLIC;

CREATE TABLE app.staff_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (length(provider) BETWEEN 1 AND 80),
  subject text NOT NULL CHECK (length(subject) BETWEEN 1 AND 300),
  role text NOT NULL CHECK (role IN ('admin','editor')),
  active boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider,subject)
);
CREATE TABLE app.content_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL CHECK (length(btrim(reference)) BETWEEN 1 AND 1000),
  owner text NOT NULL CHECK (length(btrim(owner)) BETWEEN 1 AND 200),
  sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  approved boolean NOT NULL DEFAULT false,
  reviewed_at timestamptz,
  CHECK (NOT approved OR reviewed_at IS NOT NULL)
);
CREATE TABLE app.public_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('barangays','departments','officials','news','pages','tourism_spots','events','navigation','downloadables','ordinances','resolutions','citizens_charter_cms','services_cms')),
  legacy_id text NOT NULL CHECK (length(legacy_id) BETWEEN 1 AND 300),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9][a-z0-9_-]{0,199}$'),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
  body jsonb NOT NULL CHECK (jsonb_typeof(body)='object' AND octet_length(body::text)<=200000),
  source_id uuid NOT NULL REFERENCES app.content_sources(id) ON DELETE RESTRICT,
  publication text NOT NULL DEFAULT 'draft' CHECK (publication IN ('draft','published','archived')),
  published_at timestamptz, deleted_at timestamptz,
  UNIQUE(kind,legacy_id), UNIQUE(kind,slug),
  CHECK (publication <> 'published' OR (published_at IS NOT NULL AND deleted_at IS NULL))
);
CREATE TABLE app.media_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('photo','document')),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9][a-z0-9_-]{0,99}$'),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
  approved boolean NOT NULL DEFAULT false,
  UNIQUE(kind,slug), UNIQUE(id,kind)
);
CREATE TABLE app.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('photo','document')),
  category_id uuid NOT NULL,
  source_id uuid NOT NULL REFERENCES app.content_sources(id) ON DELETE RESTRICT,
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
  description text NOT NULL DEFAULT '' CHECK (length(description)<=4000),
  alt_text text NOT NULL DEFAULT '' CHECK (length(alt_text)<=500),
  object_key text NOT NULL UNIQUE CHECK (length(object_key)<=500 AND object_key ~ '^[a-zA-Z0-9][a-zA-Z0-9/_-]*$'),
  mime text NOT NULL,
  bytes bigint NOT NULL CHECK (bytes BETWEEN 1 AND 52428800),
  sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  processing text NOT NULL DEFAULT 'pending' CHECK (processing IN ('pending','ready','rejected','deleting')),
  publication text NOT NULL DEFAULT 'draft' CHECK (publication IN ('draft','published')),
  version integer NOT NULL DEFAULT 1 CHECK (version>0),
  created_by uuid NOT NULL REFERENCES app.staff_accounts(id) ON DELETE RESTRICT,
  updated_by uuid NOT NULL REFERENCES app.staff_accounts(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz, deleted_at timestamptz,
  FOREIGN KEY(category_id,kind) REFERENCES app.media_categories(id,kind) ON DELETE RESTRICT,
  CHECK ((kind='photo' AND mime IN ('image/jpeg','image/png','image/webp')) OR (kind='document' AND mime='application/pdf')),
  CHECK (publication <> 'published' OR (processing='ready' AND deleted_at IS NULL AND published_at IS NOT NULL AND (kind<>'photo' OR length(btrim(alt_text))>0)))
);
CREATE TABLE app.media_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES app.media_assets(id) ON DELETE RESTRICT,
  object_key text NOT NULL UNIQUE CHECK (length(object_key)<=500 AND object_key ~ '^[a-zA-Z0-9][a-zA-Z0-9/_-]*$'),
  sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  bytes bigint NOT NULL CHECK (bytes BETWEEN 1 AND 52428800),
  mime text NOT NULL CHECK (mime IN ('image/jpeg','image/png','image/webp','application/pdf')),
  actor_id uuid NOT NULL REFERENCES app.staff_accounts(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE app.content_asset_links (
  content_id uuid NOT NULL REFERENCES app.public_content(id) ON DELETE RESTRICT,
  asset_id uuid NOT NULL REFERENCES app.media_assets(id) ON DELETE RESTRICT,
  PRIMARY KEY(content_id,asset_id)
);
CREATE TABLE app.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES app.staff_accounts(id) ON DELETE RESTRICT,
  action text NOT NULL CHECK (action IN ('media.create','media.update','media.publish','media.unpublish','media.delete','staff.access','migration.import','migration.rollback')),
  resource_id uuid NOT NULL,
  request_id text NOT NULL CHECK (request_id ~ '^[a-zA-Z0-9_-]{1,100}$'),
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE app.import_batches (
  id uuid PRIMARY KEY,
  digest text NOT NULL CHECK (digest ~ '^[a-f0-9]{64}$'),
  manifest jsonb NOT NULL CHECK (jsonb_typeof(manifest)='object'),
  imported_at timestamptz NOT NULL DEFAULT now(), rolled_back_at timestamptz
);

CREATE FUNCTION app.require_approved_source() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,app AS $$
BEGIN
  IF NEW.publication='published' THEN
    PERFORM 1 FROM app.content_sources WHERE id=NEW.source_id AND approved FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Publication requires approval' USING ERRCODE='23514'; END IF;
    IF TG_TABLE_NAME='media_assets' THEN
      PERFORM 1 FROM app.media_categories WHERE id=NEW.category_id AND approved FOR SHARE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Publication requires category approval' USING ERRCODE='23514'; END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER content_publication BEFORE INSERT OR UPDATE ON app.public_content FOR EACH ROW EXECUTE FUNCTION app.require_approved_source();
CREATE TRIGGER media_publication BEFORE INSERT OR UPDATE ON app.media_assets FOR EACH ROW EXECUTE FUNCTION app.require_approved_source();

CREATE FUNCTION app.immutable_record() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN RAISE EXCEPTION 'Immutable record' USING ERRCODE='42501'; END $$;
CREATE TRIGGER immutable_audit BEFORE UPDATE OR DELETE ON app.audit_events FOR EACH ROW EXECUTE FUNCTION app.immutable_record();
CREATE TRIGGER immutable_revision BEFORE UPDATE OR DELETE ON app.media_revisions FOR EACH ROW EXECUTE FUNCTION app.immutable_record();

CREATE VIEW app.published_content WITH (security_barrier=true) AS
  SELECT c.id,c.kind,c.legacy_id,c.slug,c.title,c.body,c.published_at FROM app.public_content c
  JOIN app.content_sources s ON s.id=c.source_id
  WHERE c.publication='published' AND c.deleted_at IS NULL AND c.published_at<=now() AND s.approved;
CREATE VIEW app.published_media WITH (security_barrier=true) AS
  SELECT m.id,m.kind,m.category_id,m.title,m.description,m.alt_text,m.mime,m.bytes,m.sha256,m.published_at
  FROM app.media_assets m JOIN app.content_sources s ON s.id=m.source_id
  JOIN app.media_categories c ON c.id=m.category_id
  WHERE m.publication='published' AND m.processing='ready' AND m.deleted_at IS NULL AND m.published_at<=now() AND s.approved AND c.approved;

CREATE INDEX content_public_list ON app.public_content(kind,published_at DESC,id) WHERE publication='published' AND deleted_at IS NULL;
CREATE INDEX media_public_list ON app.media_assets(published_at DESC,id) WHERE publication='published' AND deleted_at IS NULL;
CREATE INDEX media_category ON app.media_assets(category_id,kind);
CREATE INDEX media_source ON app.media_assets(source_id);
CREATE INDEX content_source ON app.public_content(source_id);
CREATE INDEX audit_actor_time ON app.audit_events(actor_id,occurred_at DESC,id);
CREATE INDEX revisions_asset ON app.media_revisions(asset_id);
CREATE INDEX links_asset ON app.content_asset_links(asset_id);
