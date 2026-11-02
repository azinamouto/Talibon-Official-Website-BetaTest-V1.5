CREATE TABLE app.staff_session_assurance (
  session_id text PRIMARY KEY REFERENCES public.r2_auth_session(id) ON DELETE CASCADE,
  verified_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE app.staff_totp_replay (digest text PRIMARY KEY, expires_at timestamptz NOT NULL);
CREATE TABLE app.staff_auth_throttle (key text PRIMARY KEY, started_at timestamptz NOT NULL DEFAULT now(), attempts integer NOT NULL);
CREATE INDEX staff_totp_replay_expiry_idx ON app.staff_totp_replay(expires_at);
CREATE INDEX staff_auth_throttle_started_idx ON app.staff_auth_throttle(started_at);
CREATE TABLE app.staff_auth_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL CHECK (length(action) BETWEEN 1 AND 100),
  subject text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER immutable_auth_audit BEFORE UPDATE OR DELETE ON app.staff_auth_audit
  FOR EACH ROW EXECUTE FUNCTION app.immutable_record();
REVOKE ALL ON app.staff_session_assurance,app.staff_totp_replay,app.staff_auth_audit FROM PUBLIC;
GRANT SELECT,INSERT,UPDATE,DELETE ON app.staff_session_assurance TO talgov_runtime;
GRANT SELECT,INSERT,UPDATE,DELETE ON app.staff_totp_replay TO talgov_runtime;
REVOKE ALL ON app.staff_auth_throttle FROM PUBLIC;
GRANT SELECT,INSERT,UPDATE,DELETE ON app.staff_auth_throttle TO talgov_runtime;
GRANT SELECT,INSERT ON app.staff_auth_audit TO talgov_runtime;
REVOKE ALL ON public.r2_auth_user,public.r2_auth_account,public.r2_auth_session,
  public.r2_auth_verification,public.r2_auth_rate_limit,public.r2_auth_two_factor FROM PUBLIC;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.r2_auth_user,public.r2_auth_account,public.r2_auth_session,
  public.r2_auth_verification,public.r2_auth_rate_limit,public.r2_auth_two_factor TO talgov_runtime;
