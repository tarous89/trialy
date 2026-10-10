CREATE TABLE automations (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), owner_id uuid NOT NULL REFERENCES users(id), grant_id uuid NOT NULL REFERENCES action_grants(id),
 name text NOT NULL, interval_minutes integer NOT NULL CHECK(interval_minutes BETWEEN 60 AND 43200), next_run timestamptz NOT NULL,
 paused boolean NOT NULL DEFAULT false, version integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE automation_runs (
 id uuid PRIMARY KEY, automation_id uuid NOT NULL REFERENCES automations(id), workspace_id uuid NOT NULL REFERENCES workspaces(id),
 status text NOT NULL CHECK(status IN ('completed','skipped')), summary jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE holds (workspace_id uuid PRIMARY KEY REFERENCES workspaces(id), reason text NOT NULL, actor_id uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now());
