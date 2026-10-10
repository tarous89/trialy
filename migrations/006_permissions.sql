ALTER TABLE workspaces ADD COLUMN ai_hidden_types jsonb NOT NULL DEFAULT '[]';
ALTER TABLE workspaces ADD COLUMN access_version integer NOT NULL DEFAULT 0;
CREATE TABLE document_access (
 document_id uuid PRIMARY KEY,
 workspace_id uuid NOT NULL REFERENCES workspaces(id),
 allowed_users jsonb,
 ai_enabled boolean NOT NULL DEFAULT true,
 version integer NOT NULL DEFAULT 0
);
