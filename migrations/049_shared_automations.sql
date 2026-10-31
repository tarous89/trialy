-- Optional automation state. No app source, published version, or user record changes.
CREATE TABLE automation_runners (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), user_id uuid NOT NULL REFERENCES users(id),
 version integer NOT NULL DEFAULT 0, enabled boolean NOT NULL DEFAULT true,
 preferences jsonb NOT NULL, next_daily_at timestamptz NOT NULL,
 verified_at timestamptz, last_check_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(workspace_id,user_id)
);
CREATE TABLE automation_subscriptions (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), user_id uuid NOT NULL REFERENCES users(id),
 runner_id uuid NOT NULL REFERENCES automation_runners(id), identity_hash text NOT NULL UNIQUE,
 connection_family text NOT NULL, client_id text NOT NULL, callback text NOT NULL, secret text NOT NULL,
 callback_verified_at timestamptz, previous_secret text, previous_secret_until timestamptz, enabled boolean NOT NULL DEFAULT true, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX automation_one_subscription ON automation_subscriptions(runner_id) WHERE enabled;
CREATE TABLE automation_dispatch (
 monitor_id uuid PRIMARY KEY REFERENCES app_monitors(id), workspace_id uuid NOT NULL REFERENCES workspaces(id), user_id uuid NOT NULL REFERENCES users(id),
 runner_id uuid NOT NULL REFERENCES automation_runners(id), monitor_version integer NOT NULL,
 next_at timestamptz, event_cursor bigint NOT NULL DEFAULT 0, scan_cursor uuid,
 last_success_at timestamptz, diagnostic text, retry_at timestamptz, activated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX automation_dispatch_due ON automation_dispatch(next_at);
CREATE TABLE automation_occurrences (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), user_id uuid NOT NULL REFERENCES users(id),
 runner_id uuid NOT NULL REFERENCES automation_runners(id), monitor_id uuid REFERENCES app_monitors(id), monitor_version integer,
 occurrence_key text NOT NULL, due_at timestamptz NOT NULL, reason text NOT NULL, input jsonb NOT NULL DEFAULT '{}',
 status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','running','completed','no_update','partial','blocked','failed','cancelled')),
 attempts integer NOT NULL DEFAULT 0, retry_limit integer NOT NULL DEFAULT 3, run_id uuid REFERENCES app_monitor_runs(id), claim_token uuid, lease_until timestamptz,
 checkpoint jsonb, result jsonb, available_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz,
 completion_action_id uuid REFERENCES app_actions(id), completion_action_version integer, completion_dispatched_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(runner_id,occurrence_key)
);
CREATE INDEX automation_occurrences_ready ON automation_occurrences(runner_id,status,available_at,due_at);
CREATE UNIQUE INDEX automation_occurrence_run ON automation_occurrences(run_id) WHERE run_id IS NOT NULL;
CREATE TABLE automation_attempts (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), user_id uuid NOT NULL REFERENCES users(id),
 occurrence_id uuid NOT NULL REFERENCES automation_occurrences(id), run_id uuid REFERENCES app_monitor_runs(id), claim_token uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX automation_claim_request ON automation_attempts(occurrence_id,claim_token);
CREATE TABLE automation_outbox (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), user_id uuid NOT NULL REFERENCES users(id),
 runner_id uuid NOT NULL REFERENCES automation_runners(id), event_key text NOT NULL, reason text NOT NULL,
 status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','sending','accepted','failed','cancelled')),
 attempts integer NOT NULL DEFAULT 0, available_at timestamptz NOT NULL DEFAULT now(), lease_until timestamptz, lease_token uuid,
 subscription_id uuid REFERENCES automation_subscriptions(id), delivered_at timestamptz, diagnostic text,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(runner_id,event_key)
);
CREATE INDEX automation_outbox_due ON automation_outbox(status,available_at);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['automation_runners','automation_subscriptions','automation_dispatch','automation_occurrences','automation_attempts','automation_outbox'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY automation_owner ON %I FOR ALL USING (trialy_security.workspace_permission(workspace_id) AND user_id=trialy_security.actor_id()) WITH CHECK (trialy_security.workspace_permission(workspace_id) AND user_id=trialy_security.actor_id())',t);
  EXECUTE format('CREATE POLICY automation_worker ON %I FOR ALL USING (trialy_security.worker()) WITH CHECK (trialy_security.worker())',t);
 END LOOP;
END $$;

CREATE UNIQUE INDEX automation_authoring_key ON app_monitors(workspace_id,user_id,app_id,(config->>'authoringKey')) WHERE config->>'authoringKey' IS NOT NULL;
