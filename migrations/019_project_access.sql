ALTER TABLE workspace_nodes ADD COLUMN allowed_users jsonb, ADD COLUMN ai_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE workspace_components ADD COLUMN allowed_users jsonb, ADD COLUMN ai_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE workspace_components DROP CONSTRAINT workspace_components_format_check;
ALTER TABLE workspace_components ADD CHECK(format IN ('text','markdown','json','javascript','html','trialy-ui'));
