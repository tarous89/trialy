ALTER TABLE workspace_components ADD COLUMN source_access text NOT NULL DEFAULT 'workspace' CHECK(source_access IN ('workspace','bindings'));
