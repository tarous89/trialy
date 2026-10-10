CREATE TABLE record_review_requests (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), record_id uuid NOT NULL REFERENCES records(id),
 record_version integer NOT NULL, reviewer_id uuid NOT NULL REFERENCES users(id), requested_by uuid NOT NULL REFERENCES users(id),
 note text NOT NULL, due_on date, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX review_requests_record ON record_review_requests(record_id);
CREATE TABLE record_review_decisions (
 request_id uuid PRIMARY KEY REFERENCES record_review_requests(id), workspace_id uuid NOT NULL REFERENCES workspaces(id),
 actor_id uuid NOT NULL REFERENCES users(id), outcome text NOT NULL CHECK(outcome IN ('approved','changes_requested','cancelled')),
 meaning text NOT NULL, resulting_version integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE inbox_reminders (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), user_id uuid NOT NULL REFERENCES users(id),
 automation_id uuid NOT NULL REFERENCES automations(id), run_id uuid NOT NULL UNIQUE REFERENCES automation_runs(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE inbox_read_receipts (
 reminder_id uuid PRIMARY KEY REFERENCES inbox_reminders(id), user_id uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER immutable_review_requests BEFORE UPDATE OR DELETE ON record_review_requests FOR EACH ROW EXECUTE FUNCTION protect_history();
CREATE TRIGGER immutable_review_decisions BEFORE UPDATE OR DELETE ON record_review_decisions FOR EACH ROW EXECUTE FUNCTION protect_history();
CREATE TRIGGER immutable_reminders BEFORE UPDATE OR DELETE ON inbox_reminders FOR EACH ROW EXECUTE FUNCTION protect_history();
CREATE TRIGGER immutable_read_receipts BEFORE UPDATE OR DELETE ON inbox_read_receipts FOR EACH ROW EXECUTE FUNCTION protect_history();
