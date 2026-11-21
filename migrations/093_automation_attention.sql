-- Session 6, package 6.3 (T3, T2, U2, D30): retries, Needs attention and one alert per run.
-- A temporary failure is retried on the same run at 5, 15 and 60 minutes and never switches the automation off.
-- A permission, connection or setup failure stops runs and shows "Needs attention" with its cause until a check passes again.
ALTER TABLE app_monitors ADD COLUMN needs_attention_cause text;
ALTER TABLE app_monitors ADD COLUMN needs_attention_at timestamptz;
ALTER TABLE app_actions ADD COLUMN needs_attention_cause text;
ALTER TABLE app_actions ADD COLUMN needs_attention_at timestamptz;
ALTER TABLE app_actions ADD COLUMN failure_count integer NOT NULL DEFAULT 0;
ALTER TABLE automation_dispatch ADD COLUMN failure_count integer NOT NULL DEFAULT 0;
-- One first attempt and three retries (5, 15, 60 minutes) for new runs.
ALTER TABLE automation_occurrences ALTER COLUMN retry_limit SET DEFAULT 4;

-- D30: an organization setting for recurring research, default 60 minutes.
ALTER TABLE tenants ADD COLUMN automation_min_interval_minutes integer NOT NULL DEFAULT 60 CHECK (automation_min_interval_minutes BETWEEN 15 AND 1440);

-- One alert per run (and one per Needs-attention cause), for the owners of the app.
CREATE TABLE automation_alerts (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), app_id uuid NOT NULL REFERENCES workspace_components(id),
 automation_id uuid NOT NULL, automation_kind text NOT NULL CHECK (automation_kind IN ('research','action')),
 alert_key text NOT NULL, kind text NOT NULL CHECK (kind IN ('failed','needs_attention')), cause text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), dismissed_at timestamptz, dismissed_by uuid REFERENCES users(id),
 UNIQUE (automation_id,alert_key)
);
CREATE INDEX automation_alerts_open ON automation_alerts(workspace_id,created_at DESC) WHERE dismissed_at IS NULL;
ALTER TABLE automation_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY alert_owner ON automation_alerts FOR SELECT USING (trialy_security.worker() OR trialy_security.workspace_permission(workspace_id) AND trialy_security.manages_app(app_id));
CREATE POLICY alert_insert ON automation_alerts FOR INSERT WITH CHECK (trialy_security.worker() OR trialy_security.workspace_permission(workspace_id));
CREATE POLICY alert_dismiss ON automation_alerts FOR UPDATE USING (trialy_security.workspace_permission(workspace_id) AND trialy_security.manages_app(app_id)) WITH CHECK (trialy_security.workspace_permission(workspace_id) AND trialy_security.manages_app(app_id));
