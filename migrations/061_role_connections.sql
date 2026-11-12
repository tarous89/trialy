-- Role-based connections (docs/product/MODULAR_APPS_AND_SHARED_DATA.md §7).
-- One writer per output role: the app that writes an output table. Other
-- apps bind it read-only. A replacement takes over only after the writer is
-- archived or permanently deleted, with an explicit owner choice.
-- The table holds no records and grants no access; it changes only inside
-- reviewed app saves.

CREATE TABLE role_writers (
 workspace_id uuid NOT NULL REFERENCES workspaces(id),
 type_id uuid NOT NULL REFERENCES entity_types(id),
 role text NOT NULL CHECK (role ~ '^[a-z][a-z0-9_]{0,39}\.[a-z][a-z0-9_]{0,39}$'),
 app_id uuid NOT NULL REFERENCES workspace_components(id),
 contract text NOT NULL CHECK (contract ~ '^[a-z][a-z0-9_]{0,39}\.v[0-9]{1,4}$'),
 since timestamptz NOT NULL DEFAULT now(),
 taken_over_from uuid REFERENCES workspace_components(id),
 PRIMARY KEY (workspace_id, type_id)
);

ALTER TABLE role_writers ENABLE ROW LEVEL SECURITY;
CREATE POLICY role_writer_read ON role_writers FOR SELECT USING (trialy_security.workspace_permission(workspace_id));
CREATE POLICY role_writer_write ON role_writers FOR ALL USING (trialy_security.workspace_permission(workspace_id,true)) WITH CHECK (trialy_security.workspace_permission(workspace_id,true));
