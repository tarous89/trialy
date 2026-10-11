-- Temporary staging only; not an authoritative record or immutable audit entry.
CREATE TABLE data_previews (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id),
 actor_id uuid NOT NULL REFERENCES users(id), body jsonb NOT NULL, file_bytes bytea,
 digest text NOT NULL, schema_fingerprint text, migration_fingerprint text,
 expires_at timestamptz NOT NULL, byte_size bigint NOT NULL CHECK(byte_size>=0),
 CHECK ((body->>'kind'='save_document') = (file_bytes IS NOT NULL))
);
CREATE INDEX data_preview_expiry ON data_previews(expires_at);
CREATE INDEX data_preview_workspace ON data_previews(workspace_id);
