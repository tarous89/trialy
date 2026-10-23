-- Optional organization on existing RLS-protected tool tables; no new runtime grants.
ALTER TABLE workspace_components ALTER COLUMN project_id DROP NOT NULL;
ALTER TABLE workspace_components ADD COLUMN home_project_id uuid, ADD COLUMN home_placement_version integer NOT NULL DEFAULT 0,
 ADD FOREIGN KEY(home_project_id,workspace_id) REFERENCES workspace_nodes(id,workspace_id);
ALTER TABLE foundation_functions ADD COLUMN home_project_id uuid, ADD COLUMN home_placement_version integer NOT NULL DEFAULT 0,
 ADD FOREIGN KEY(home_project_id,workspace_id) REFERENCES workspace_nodes(id,workspace_id);
ALTER TABLE external_links ADD COLUMN home_project_id uuid, ADD COLUMN home_placement_version integer NOT NULL DEFAULT 0,
 ADD FOREIGN KEY(home_project_id,workspace_id) REFERENCES workspace_nodes(id,workspace_id);
ALTER TABLE automations ADD COLUMN home_project_id uuid, ADD COLUMN home_placement_version integer NOT NULL DEFAULT 0,
 ADD FOREIGN KEY(home_project_id,workspace_id) REFERENCES workspace_nodes(id,workspace_id);
