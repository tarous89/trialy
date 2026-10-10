ALTER TABLE external_links ADD COLUMN file_request jsonb;
CREATE TABLE submission_files (
 id uuid PRIMARY KEY, submission_id uuid NOT NULL REFERENCES form_submissions(id), workspace_id uuid NOT NULL REFERENCES workspaces(id),
 position integer NOT NULL, filename text NOT NULL, mime text NOT NULL, byte_size integer NOT NULL, checksum text NOT NULL, bytes bytea NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(submission_id,position), CHECK(byte_size=octet_length(bytes))
);
CREATE TABLE submission_file_acceptances (
 file_id uuid PRIMARY KEY REFERENCES submission_files(id), workspace_id uuid NOT NULL REFERENCES workspaces(id),
 version_id uuid NOT NULL REFERENCES document_versions(id), actor_id uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER immutable_submission_files BEFORE UPDATE OR DELETE ON submission_files FOR EACH ROW EXECUTE FUNCTION protect_history();
CREATE TRIGGER immutable_submission_file_acceptances BEFORE UPDATE OR DELETE ON submission_file_acceptances FOR EACH ROW EXECUTE FUNCTION protect_history();
