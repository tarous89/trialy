ALTER TABLE external_links ADD COLUMN project_id uuid REFERENCES workspace_nodes(id);
