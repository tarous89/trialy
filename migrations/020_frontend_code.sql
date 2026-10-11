ALTER TABLE workspace_components DROP CONSTRAINT workspace_components_format_check;
ALTER TABLE workspace_components ADD CHECK(format IN ('text','markdown','json','javascript','html','trialy-ui','frontend-js'));
