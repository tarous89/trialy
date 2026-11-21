-- G4, G6 (package 5.3): the working context a person chose inside an app (for example the program or fund they look at),
-- remembered per person and app. It holds only the app's own small choice (at most 4 KB of JSON), never records. Only
-- the person can read or change their own row; it goes when the app or the person leaves the workspace.
CREATE TABLE app_person_context (
 workspace_id uuid NOT NULL REFERENCES workspaces(id),
 app_id uuid NOT NULL REFERENCES workspace_components(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES users(id),
 context jsonb NOT NULL CHECK(octet_length(context::text)<=4096),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(app_id,user_id)
);
ALTER TABLE app_person_context ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_person_context_own ON app_person_context FOR ALL
 USING(user_id=trialy_security.actor_id() AND trialy_security.workspace_permission(workspace_id))
 WITH CHECK(user_id=trialy_security.actor_id() AND trialy_security.workspace_permission(workspace_id));
