-- A view is issued only while its published source is current and authorized.
-- It pins code, never permissions. No customer app or schema is modified.
CREATE TABLE app_runtime_views (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), user_id uuid NOT NULL REFERENCES users(id),
 app_id uuid NOT NULL REFERENCES workspace_components(id), origin text NOT NULL CHECK(origin IN ('human','ai')),
 version integer NOT NULL, component jsonb NOT NULL, schemas jsonb NOT NULL, read_access jsonb NOT NULL,
 expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days'
);
ALTER TABLE app_runtime_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY runtime_view_scope ON app_runtime_views FOR ALL
 USING (trialy_security.workspace_permission(workspace_id) AND user_id=trialy_security.actor_id())
 WITH CHECK (trialy_security.workspace_permission(workspace_id) AND user_id=trialy_security.actor_id());
CREATE POLICY expired_runtime_view_read ON app_runtime_views FOR SELECT USING (current_setting('trialy.service',true)='maintenance' AND expires_at<=now());
CREATE POLICY expired_runtime_view_cleanup ON app_runtime_views FOR DELETE USING (current_setting('trialy.service',true)='maintenance' AND expires_at<=now());
CREATE INDEX runtime_view_expiry ON app_runtime_views(expires_at);
