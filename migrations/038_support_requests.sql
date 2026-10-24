CREATE TABLE support_requests (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id),
 subject text NOT NULL, message text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY support_owner ON support_requests USING(user_id=trialy_security.actor_id() AND current_setting('trialy.origin',true)='human') WITH CHECK(user_id=trialy_security.actor_id() AND current_setting('trialy.origin',true)='human');
