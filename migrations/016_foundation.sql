-- Generic code/data foundation. No legacy rows are removed or translated.
CREATE TABLE foundation_functions (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), user_id uuid NOT NULL REFERENCES users(id),
 name text NOT NULL, version integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE foundation_revisions (
 id uuid PRIMARY KEY, function_id uuid NOT NULL REFERENCES foundation_functions(id), version integer NOT NULL,
 body jsonb NOT NULL, digest text NOT NULL, runtime text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(function_id,version)
);
CREATE TRIGGER immutable_function_revision BEFORE UPDATE OR DELETE ON foundation_revisions FOR EACH ROW EXECUTE FUNCTION protect_history();
CREATE TABLE foundation_previews (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), user_id uuid NOT NULL REFERENCES users(id),
 body jsonb NOT NULL, digest text NOT NULL, expires_at timestamptz NOT NULL DEFAULT now()+interval '24 hours'
);
CREATE TABLE foundation_grants (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), user_id uuid NOT NULL REFERENCES users(id),
 revision_id uuid NOT NULL REFERENCES foundation_revisions(id), type_ids jsonb NOT NULL, max_changes integer NOT NULL CHECK(max_changes BETWEEN 1 AND 200),
 future boolean NOT NULL, used_at timestamptz, revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE foundation_schedules (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), user_id uuid NOT NULL REFERENCES users(id),
 revision_id uuid NOT NULL REFERENCES foundation_revisions(id), input jsonb NOT NULL, grant_id uuid REFERENCES foundation_grants(id),
 interval_minutes integer NOT NULL CHECK(interval_minutes BETWEEN 1 AND 43200), paused boolean NOT NULL DEFAULT false,
 next_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE foundation_runs (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), user_id uuid NOT NULL REFERENCES users(id),
 revision_id uuid REFERENCES foundation_revisions(id), schedule_id uuid REFERENCES foundation_schedules(id), grant_id uuid REFERENCES foundation_grants(id),
 request_key uuid NOT NULL, program jsonb NOT NULL, source_digest text NOT NULL,
 status text NOT NULL CHECK(status IN ('queued','running','succeeded','failed','cancelled')), attempts integer NOT NULL DEFAULT 0,
 lease_token uuid, lease_until timestamptz, cancel_requested boolean NOT NULL DEFAULT false,
 result jsonb, proposal jsonb, proposal_digest text, data_stamp text, access_stamp text, diagnostic text,
 created_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz, expires_at timestamptz NOT NULL DEFAULT now()+interval '24 hours',
 UNIQUE(user_id,request_key)
);
CREATE INDEX foundation_run_queue ON foundation_runs(status,created_at);
CREATE INDEX foundation_schedule_due ON foundation_schedules(next_at) WHERE NOT paused;
CREATE TABLE foundation_receipts (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), user_id uuid NOT NULL REFERENCES users(id),
 digest text NOT NULL, kind text NOT NULL, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER immutable_foundation_receipt BEFORE UPDATE OR DELETE ON foundation_receipts FOR EACH ROW EXECUTE FUNCTION protect_history();

ALTER TABLE foundation_schedules ADD COLUMN trigger jsonb;
ALTER TABLE foundation_schedules ADD COLUMN event_cursor bigint NOT NULL DEFAULT 0;
ALTER TABLE audit_events ADD COLUMN source_run_id uuid DEFAULT NULLIF(current_setting('trialy.run_id',true),'')::uuid;
