ALTER TABLE local_accounts ADD COLUMN session_version integer NOT NULL DEFAULT 0;
CREATE TABLE account_security_events (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES users(id),
 action text NOT NULL CHECK(action IN ('password_changed','access_revoked')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX account_security_events_user ON account_security_events(user_id,created_at);
CREATE TRIGGER account_security_events_immutable BEFORE UPDATE OR DELETE ON account_security_events FOR EACH ROW EXECUTE FUNCTION protect_history();
