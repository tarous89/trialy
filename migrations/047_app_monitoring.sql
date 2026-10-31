-- Optional host-managed monitoring. No existing app, template, schema or grant changes.
CREATE TABLE app_monitors (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), user_id uuid NOT NULL REFERENCES users(id),
 app_id uuid NOT NULL REFERENCES workspace_components(id), version integer NOT NULL DEFAULT 0,
 config jsonb NOT NULL, scope_stamp text NOT NULL, enabled boolean NOT NULL DEFAULT true,
 task jsonb, coverage_through timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE app_monitor_runs (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), user_id uuid NOT NULL REFERENCES users(id),
 monitor_id uuid NOT NULL REFERENCES app_monitors(id), monitor_version integer NOT NULL, occurrence_key text NOT NULL,
 status text NOT NULL DEFAULT 'running' CHECK(status IN ('running','completed','no_update','partial','blocked','failed','cancelled')),
 config_snapshot jsonb NOT NULL, result jsonb, result_digest text, started_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '2 hours', finished_at timestamptz,
 UNIQUE(monitor_id,occurrence_key)
);
CREATE UNIQUE INDEX one_active_monitor_run ON app_monitor_runs(monitor_id) WHERE status='running';
CREATE INDEX monitors_by_app ON app_monitors(workspace_id,user_id,app_id,created_at,id);
CREATE INDEX monitor_run_history ON app_monitor_runs(monitor_id,started_at DESC,id);
CREATE TABLE app_monitor_receipts (
 run_id uuid NOT NULL REFERENCES app_monitor_runs(id), workspace_id uuid NOT NULL REFERENCES workspaces(id), user_id uuid NOT NULL REFERENCES users(id),
 request_key uuid NOT NULL UNIQUE REFERENCES workspace_receipts(id), change_count integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(run_id,request_key)
);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['app_monitors','app_monitor_runs','app_monitor_receipts'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY monitor_scope ON %I FOR ALL USING (trialy_security.workspace_permission(workspace_id) AND user_id=trialy_security.actor_id()) WITH CHECK (trialy_security.workspace_permission(workspace_id) AND user_id=trialy_security.actor_id())',t);
 END LOOP;
END $$;
CREATE FUNCTION protect_monitor_run() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF OLD.status<>'running' THEN RAISE EXCEPTION 'Completed monitoring receipt is immutable'; END IF;
 IF (to_jsonb(OLD)-ARRAY['status','result','result_digest','finished_at']) IS DISTINCT FROM (to_jsonb(NEW)-ARRAY['status','result','result_digest','finished_at']) THEN RAISE EXCEPTION 'Monitoring run request is immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER monitor_run_immutable BEFORE UPDATE ON app_monitor_runs FOR EACH ROW EXECUTE FUNCTION protect_monitor_run();
