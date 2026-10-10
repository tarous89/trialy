CREATE TABLE folder_access (
 workspace_id uuid NOT NULL REFERENCES workspaces(id), folder text NOT NULL,
 allowed_users jsonb, ai_enabled boolean NOT NULL DEFAULT true, version integer NOT NULL DEFAULT 0,
 PRIMARY KEY(workspace_id,folder)
);
