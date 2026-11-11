-- Role-based connections (docs/product/MODULAR_APPS_AND_SHARED_DATA.md §7).
-- 1. "Do not connect" in the data access step is remembered per app and role,
--    until the user chooses Connect from the app or the Access tab.
-- 2. One writer per output role: the app that writes an output table. Other
--    apps bind it read-only. A replacement takes over only after the writer is
--    archived or permanently deleted, with an explicit owner choice.
-- Neither table holds records or grants access; both are audited by the
-- reviewed transactions that change them.

CREATE TABLE app_role_choices (
 workspace_id uuid NOT NULL REFERENCES workspaces(id),
 app_id uuid NOT NULL REFERENCES workspace_components(id),
 role text NOT NULL CHECK (role ~ '^[a-z][a-z0-9_]{0,39}(\.[a-z][a-z0-9_]{0,39})?$'),
 choice text NOT NULL CHECK (choice IN ('declined')),
 decided_by uuid NOT NULL REFERENCES users(id),
 decided_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (app_id, role)
);
CREATE INDEX app_role_choices_workspace ON app_role_choices(workspace_id);

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

ALTER TABLE app_role_choices ENABLE ROW LEVEL SECURITY;
CREATE POLICY role_choice_read ON app_role_choices FOR SELECT USING (trialy_security.workspace_permission(workspace_id));
CREATE POLICY role_choice_write ON app_role_choices FOR ALL USING (trialy_security.workspace_permission(workspace_id,true)) WITH CHECK (trialy_security.workspace_permission(workspace_id,true));
ALTER TABLE role_writers ENABLE ROW LEVEL SECURITY;
CREATE POLICY role_writer_read ON role_writers FOR SELECT USING (trialy_security.workspace_permission(workspace_id));
CREATE POLICY role_writer_write ON role_writers FOR ALL USING (trialy_security.workspace_permission(workspace_id,true)) WITH CHECK (trialy_security.workspace_permission(workspace_id,true));
