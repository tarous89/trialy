ALTER TABLE workspace_components ADD COLUMN resource_kind text NOT NULL DEFAULT 'generic' CHECK(resource_kind IN ('generic','tracker','form','visualization'));
ALTER TABLE workspace_components ADD COLUMN manifest jsonb;
ALTER TABLE workspace_components ADD CONSTRAINT connected_resource_manifest CHECK(resource_kind='generic' OR (manifest IS NOT NULL AND manifest->>'version'='1'));
