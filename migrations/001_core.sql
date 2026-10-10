CREATE TABLE IF NOT EXISTS users (
 id uuid PRIMARY KEY, subject text UNIQUE NOT NULL, email text NOT NULL, name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE tenants (id uuid PRIMARY KEY, name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE memberships (
 tenant_id uuid REFERENCES tenants(id), user_id uuid REFERENCES users(id), role text NOT NULL CHECK(role IN ('owner','editor','viewer')), PRIMARY KEY(tenant_id,user_id)
);
CREATE TABLE workspaces (id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES tenants(id), name text NOT NULL, ai_enabled boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,id));
CREATE TABLE workspace_access (
 workspace_id uuid REFERENCES workspaces(id), user_id uuid REFERENCES users(id), role text NOT NULL CHECK(role IN ('owner','editor','viewer')),
 hidden_fields jsonb NOT NULL DEFAULT '[]', allowed_types jsonb, ai_enabled boolean NOT NULL DEFAULT false, PRIMARY KEY(workspace_id,user_id)
);
CREATE TABLE entity_types (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), name text NOT NULL, fields jsonb NOT NULL, version integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(workspace_id,name)
);
CREATE TABLE records (
 id uuid PRIMARY KEY, type_id uuid NOT NULL REFERENCES entity_types(id), workspace_id uuid NOT NULL REFERENCES workspaces(id), data jsonb NOT NULL,
 version integer NOT NULL DEFAULT 0, state text NOT NULL DEFAULT 'draft' CHECK(state IN ('draft','in_review','approved','superseded','archived')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX records_workspace_type ON records(workspace_id,type_id);
CREATE TABLE document_versions (
 id uuid PRIMARY KEY, document_id uuid NOT NULL, workspace_id uuid NOT NULL REFERENCES workspaces(id), filename text NOT NULL, mime text NOT NULL,
 byte_size integer NOT NULL, checksum text NOT NULL, version integer NOT NULL, ai_enabled boolean NOT NULL DEFAULT false,
 linked_record_id uuid REFERENCES records(id), created_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(document_id,version)
);
CREATE TABLE document_payloads (version_id uuid PRIMARY KEY REFERENCES document_versions(id), bytes bytea NOT NULL);
CREATE TABLE extractions (
 version_id uuid PRIMARY KEY REFERENCES document_versions(id), status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','ready','partial','unavailable')),
 text_content text, sections jsonb NOT NULL DEFAULT '[]', method text, processor_version text, diagnostic text, updated_at timestamptz NOT NULL DEFAULT now(),
 search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce(text_content,''))) STORED
);
CREATE INDEX extraction_search ON extractions USING gin(search_vector);
CREATE TABLE revisions (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), object_id uuid NOT NULL, object_kind text NOT NULL, version integer NOT NULL,
 snapshot jsonb NOT NULL, actor_id uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(object_id,object_kind,version)
);
CREATE TABLE audit_events (
 id uuid PRIMARY KEY, workspace_id uuid REFERENCES workspaces(id), tenant_id uuid NOT NULL REFERENCES tenants(id), actor_id uuid NOT NULL REFERENCES users(id),
 action text NOT NULL, object_id uuid, origin text NOT NULL, before_value jsonb, after_value jsonb, reason text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION protect_history() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'History is append-only'; END $$;
CREATE TRIGGER immutable_audit BEFORE UPDATE OR DELETE ON audit_events FOR EACH ROW EXECUTE FUNCTION protect_history();
CREATE TRIGGER immutable_revisions BEFORE UPDATE OR DELETE ON revisions FOR EACH ROW EXECUTE FUNCTION protect_history();
CREATE TRIGGER immutable_originals BEFORE UPDATE OR DELETE ON document_versions FOR EACH ROW EXECUTE FUNCTION protect_history();
CREATE TRIGGER immutable_payloads BEFORE UPDATE OR DELETE ON document_payloads FOR EACH ROW EXECUTE FUNCTION protect_history();
CREATE TABLE commit_receipts (
 preview_id uuid PRIMARY KEY, actor_id uuid NOT NULL REFERENCES users(id), workspace_id uuid NOT NULL REFERENCES workspaces(id), digest text NOT NULL, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE jobs (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), kind text NOT NULL, payload jsonb NOT NULL,
 status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','running','done','unavailable')), attempts integer NOT NULL DEFAULT 0,
 run_after timestamptz NOT NULL DEFAULT now(), lease_until timestamptz, lease_token uuid, diagnostic text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX jobs_pending ON jobs(status,run_after);
CREATE TABLE action_grants (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), user_id uuid NOT NULL REFERENCES users(id), action text NOT NULL,
 destination text NOT NULL, future boolean NOT NULL DEFAULT false, revoked_at timestamptz, used_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE saved_views (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), name text NOT NULL, kind text NOT NULL, type_id uuid REFERENCES entity_types(id), config jsonb NOT NULL, version integer NOT NULL DEFAULT 0
);
CREATE TABLE approvals (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), record_id uuid NOT NULL REFERENCES records(id), record_version integer NOT NULL,
 actor_id uuid NOT NULL REFERENCES users(id), meaning text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(record_id,record_version,actor_id)
);
CREATE TABLE session (sid varchar PRIMARY KEY, sess json NOT NULL, expire timestamp NOT NULL);
CREATE INDEX session_expire ON session(expire);
