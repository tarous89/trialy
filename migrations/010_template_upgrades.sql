CREATE TABLE template_installations (
 workspace_id uuid NOT NULL REFERENCES workspaces(id), template_id text NOT NULL, version integer NOT NULL,
 tables jsonb NOT NULL, installed_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(workspace_id,template_id)
);
