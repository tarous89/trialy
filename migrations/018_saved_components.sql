-- Components are saved source, not an implicit execution authorization.
CREATE TABLE workspace_components (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id),
 project_id uuid NOT NULL, name text NOT NULL, format text NOT NULL
 CHECK(format IN ('text','markdown','json','javascript','html')),
 source text NOT NULL, bindings jsonb NOT NULL DEFAULT '[]',
 version integer NOT NULL DEFAULT 0, archived boolean NOT NULL DEFAULT false,
 created_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(project_id,workspace_id) REFERENCES workspace_nodes(id,workspace_id)
);
CREATE INDEX workspace_component_project ON workspace_components(workspace_id,project_id);
