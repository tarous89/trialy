ALTER TABLE workspace_components ADD COLUMN execution jsonb NOT NULL DEFAULT '[]';
ALTER TABLE foundation_runs ADD COLUMN component_context jsonb;
ALTER TABLE foundation_schedules ADD COLUMN component_context jsonb;
