ALTER TABLE workspaces ADD COLUMN archived boolean NOT NULL DEFAULT false;
ALTER TABLE workspaces ADD COLUMN retention_until date;
ALTER TABLE workspaces ADD COLUMN legal_hold boolean NOT NULL DEFAULT false;
ALTER TABLE workspaces ADD COLUMN policy_version integer NOT NULL DEFAULT 0;
CREATE TABLE document_controls (
 document_id uuid PRIMARY KEY,
 workspace_id uuid NOT NULL REFERENCES workspaces(id),
 linked_record_id uuid REFERENCES records(id),
 reviewer_id uuid REFERENCES users(id),
 expires_on date,
 folder text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','in_review','approved','archived')),
 reviewed_version_id uuid REFERENCES document_versions(id),
 version integer NOT NULL DEFAULT 0
);
CREATE TABLE acknowledgements (
 id uuid PRIMARY KEY,workspace_id uuid NOT NULL REFERENCES workspaces(id),
 document_version_id uuid NOT NULL REFERENCES document_versions(id),
 actor_id uuid NOT NULL REFERENCES users(id),meaning text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(document_version_id,actor_id)
);
CREATE TRIGGER immutable_acknowledgements BEFORE UPDATE OR DELETE ON acknowledgements FOR EACH ROW EXECUTE FUNCTION protect_history();
CREATE TABLE account_acceptances (
 user_id uuid PRIMARY KEY REFERENCES users(id),notice_version text NOT NULL,
 accepted_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER immutable_acceptances BEFORE UPDATE OR DELETE ON account_acceptances FOR EACH ROW EXECUTE FUNCTION protect_history();

CREATE TRIGGER immutable_approvals BEFORE UPDATE OR DELETE ON approvals FOR EACH ROW EXECUTE FUNCTION protect_history();
CREATE TRIGGER immutable_runs BEFORE UPDATE OR DELETE ON automation_runs FOR EACH ROW EXECUTE FUNCTION protect_history();
ALTER TABLE extractions ADD COLUMN tables jsonb NOT NULL DEFAULT '[]';
ALTER TABLE extractions ADD COLUMN table_status text NOT NULL DEFAULT 'unavailable' CHECK(table_status IN ('ready','partial','unavailable'));
ALTER TABLE automations ADD COLUMN conditions jsonb;
ALTER TABLE workspace_access DROP CONSTRAINT workspace_access_role_check;
ALTER TABLE workspace_access ADD CONSTRAINT workspace_access_role_check CHECK(role IN ('owner','editor','viewer','inspector'));
