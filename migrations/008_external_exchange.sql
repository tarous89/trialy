CREATE TABLE external_links (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), owner_id uuid NOT NULL REFERENCES users(id),
 token_hash text NOT NULL UNIQUE, kind text NOT NULL CHECK(kind IN ('form','view')), name text NOT NULL,
 type_id uuid NOT NULL REFERENCES entity_types(id), type_version integer NOT NULL, fields jsonb NOT NULL,
 view_id uuid REFERENCES saved_views(id), view_version integer,
 expires_at timestamptz NOT NULL, revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE form_submissions (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), link_id uuid NOT NULL REFERENCES external_links(id),
 type_id uuid NOT NULL REFERENCES entity_types(id), nonce uuid NOT NULL, data jsonb NOT NULL,
 provenance text NOT NULL DEFAULT 'External link holder; identity not verified', created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(link_id,nonce)
);
CREATE TABLE submission_acceptances (
 submission_id uuid PRIMARY KEY REFERENCES form_submissions(id), workspace_id uuid NOT NULL REFERENCES workspaces(id),
 record_id uuid NOT NULL REFERENCES records(id), actor_id uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER immutable_submissions BEFORE UPDATE OR DELETE ON form_submissions FOR EACH ROW EXECUTE FUNCTION protect_history();
CREATE TRIGGER immutable_submission_acceptances BEFORE UPDATE OR DELETE ON submission_acceptances FOR EACH ROW EXECUTE FUNCTION protect_history();
