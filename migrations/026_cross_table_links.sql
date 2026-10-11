CREATE TABLE cross_table_links (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id),
 source_record_id uuid NOT NULL REFERENCES records(id), preferred_record_id uuid NOT NULL REFERENCES records(id),
 field_pairs jsonb NOT NULL, schema_stamp text NOT NULL, rationale text NOT NULL,
 version integer NOT NULL DEFAULT 0, created_by uuid NOT NULL REFERENCES users(id),
 "authorization" jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz, revoked_by uuid REFERENCES users(id), revocation_reason text, revocation_authorization jsonb,
 CHECK(source_record_id<>preferred_record_id)
);
CREATE UNIQUE INDEX cross_table_active_pair ON cross_table_links(workspace_id,LEAST(source_record_id,preferred_record_id),GREATEST(source_record_id,preferred_record_id)) WHERE revoked_at IS NULL;
CREATE INDEX cross_table_source ON cross_table_links(workspace_id,source_record_id,created_at,id);
CREATE INDEX cross_table_preferred ON cross_table_links(workspace_id,preferred_record_id,created_at,id);
