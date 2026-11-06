-- Apply after the foundation and staff-auth migrations; additive and transactional.
ALTER TABLE app.media_assets ADD COLUMN original_filename text;
ALTER TABLE app.media_assets ADD CONSTRAINT media_filename CHECK
  (original_filename IS NULL OR original_filename ~ '^[a-zA-Z0-9][a-zA-Z0-9 _-]{0,100}\.[a-zA-Z]{3,4}$');
GRANT INSERT(original_filename) ON app.media_assets TO talgov_runtime;
GRANT UPDATE(processing,category_id) ON app.media_assets TO talgov_runtime;
GRANT INSERT ON app.media_revisions TO talgov_runtime;
CREATE TABLE app.media_throttle (
  actor_id uuid PRIMARY KEY REFERENCES app.staff_accounts(id),
  started_at timestamptz NOT NULL DEFAULT now(), attempts integer NOT NULL
);
REVOKE ALL ON app.media_throttle FROM PUBLIC;
GRANT SELECT,INSERT,UPDATE ON app.media_throttle TO talgov_runtime;
