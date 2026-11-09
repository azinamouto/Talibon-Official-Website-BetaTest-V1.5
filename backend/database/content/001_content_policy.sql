-- Add CMS editing to the existing R2 objects; no legacy schema or data replay.
ALTER TABLE app.public_content ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK (version > 0);
ALTER TABLE app.public_content ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE app.audit_events DROP CONSTRAINT audit_events_action_check;
ALTER TABLE app.audit_events ADD CONSTRAINT audit_events_action_check CHECK (action IN
  ('media.create','media.update','media.publish','media.unpublish','media.delete','staff.access',
   'migration.import','migration.rollback','content.create','content.update','content.delete'));
GRANT SELECT ON app.public_content TO talgov_runtime;
GRANT INSERT(kind,legacy_id,slug,title,body,source_id,publication,published_at) ON app.public_content TO talgov_runtime;
GRANT UPDATE(slug,title,body,source_id,publication,published_at,deleted_at,version,updated_at) ON app.public_content TO talgov_runtime;
