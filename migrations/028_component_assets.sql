ALTER TABLE workspace_components ADD COLUMN assets jsonb NOT NULL DEFAULT '[]'::jsonb;
