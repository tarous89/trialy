-- Additive workspace organization, scoped capture and reversible identity evidence.
CREATE TABLE workspace_nodes (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id),
 kind text NOT NULL CHECK(kind IN ('folder','project')), name text NOT NULL,
 parent_id uuid REFERENCES workspace_nodes(id), version integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,workspace_id)
);
CREATE TABLE maintenance_scopes (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), user_id uuid NOT NULL REFERENCES users(id),
 project_id uuid NOT NULL REFERENCES workspace_nodes(id), body jsonb NOT NULL, schema_stamp text NOT NULL,
 version integer NOT NULL DEFAULT 0, revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE workspace_previews (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), user_id uuid NOT NULL REFERENCES users(id),
 body jsonb NOT NULL, digest text NOT NULL, expires_at timestamptz NOT NULL DEFAULT now()+interval '24 hours'
);
CREATE TABLE workspace_receipts (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), user_id uuid NOT NULL REFERENCES users(id),
 digest text NOT NULL, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE identity_links (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id),
 source_record_id uuid NOT NULL REFERENCES records(id), preferred_record_id uuid NOT NULL REFERENCES records(id),
 rationale text NOT NULL, created_by uuid NOT NULL REFERENCES users(id),
 version integer NOT NULL DEFAULT 0, revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(source_record_id<>preferred_record_id)
);
CREATE UNIQUE INDEX active_identity_source ON identity_links(source_record_id) WHERE revoked_at IS NULL;
CREATE TABLE record_observations (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), record_id uuid NOT NULL REFERENCES records(id),
 scope_id uuid REFERENCES maintenance_scopes(id), receipt_id uuid NOT NULL REFERENCES workspace_receipts(id),
 actor_id uuid NOT NULL REFERENCES users(id), data jsonb NOT NULL, source_label text NOT NULL,
 interpretation text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX record_observation_lookup ON record_observations(workspace_id,record_id,created_at);
CREATE TRIGGER immutable_workspace_receipt BEFORE UPDATE OR DELETE ON workspace_receipts FOR EACH ROW EXECUTE FUNCTION protect_history();
CREATE TRIGGER immutable_record_observation BEFORE UPDATE OR DELETE ON record_observations FOR EACH ROW EXECUTE FUNCTION protect_history();
