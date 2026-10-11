CREATE TABLE project_records (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id),
 project_id uuid NOT NULL REFERENCES workspace_nodes(id), record_id uuid NOT NULL REFERENCES records(id),
 version integer NOT NULL DEFAULT 0, created_by uuid NOT NULL REFERENCES users(id),
 reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz
);
CREATE UNIQUE INDEX active_project_record ON project_records(project_id,record_id) WHERE revoked_at IS NULL;
CREATE INDEX project_records_lookup ON project_records(workspace_id,project_id,created_at,id);

CREATE TABLE record_facts (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), record_id uuid NOT NULL REFERENCES records(id),
 type_id uuid NOT NULL REFERENCES entity_types(id), field_key text NOT NULL, value jsonb NOT NULL,
 project_id uuid REFERENCES workspace_nodes(id), valid_from timestamptz, valid_until timestamptz,
 source_label text NOT NULL, rationale text NOT NULL, record_version integer NOT NULL,
 actor_id uuid NOT NULL REFERENCES users(id), "authorization" jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX record_facts_lookup ON record_facts(workspace_id,record_id,created_at,id);
CREATE TABLE record_fact_retractions (
 fact_id uuid PRIMARY KEY REFERENCES record_facts(id), workspace_id uuid NOT NULL REFERENCES workspaces(id),
 actor_id uuid NOT NULL REFERENCES users(id), reason text NOT NULL, "authorization" jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER immutable_record_fact BEFORE UPDATE OR DELETE ON record_facts FOR EACH ROW EXECUTE FUNCTION protect_history();
CREATE TRIGGER immutable_fact_retraction BEFORE UPDATE OR DELETE ON record_fact_retractions FOR EACH ROW EXECUTE FUNCTION protect_history();
