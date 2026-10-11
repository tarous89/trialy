CREATE TABLE table_mappings (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id),
 source_type_id uuid NOT NULL REFERENCES entity_types(id), preferred_type_id uuid NOT NULL REFERENCES entity_types(id),
 name text NOT NULL, field_pairs jsonb NOT NULL, schema_stamp text NOT NULL, rationale text NOT NULL,
 created_by uuid NOT NULL REFERENCES users(id), "authorization" jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(source_type_id<>preferred_type_id)
);
CREATE TABLE table_mapping_revocations (
 mapping_id uuid PRIMARY KEY REFERENCES table_mappings(id), workspace_id uuid NOT NULL REFERENCES workspaces(id),
 actor_id uuid NOT NULL REFERENCES users(id), reason text NOT NULL, "authorization" jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX table_mappings_lookup ON table_mappings(workspace_id,created_at,id);
CREATE TRIGGER immutable_table_mapping BEFORE UPDATE OR DELETE ON table_mappings FOR EACH ROW EXECUTE FUNCTION protect_history();
CREATE TRIGGER immutable_table_mapping_revocation BEFORE UPDATE OR DELETE ON table_mapping_revocations FOR EACH ROW EXECUTE FUNCTION protect_history();
ALTER TABLE cross_table_links ADD COLUMN mapping_id uuid REFERENCES table_mappings(id);
