-- Session 6, package 6.5 (T6, T4).
-- T6: a copied automation stays off until an owner of the new app has reviewed its tables, connections and recipients
-- by opening and saving it. Grants are never copied.
ALTER TABLE app_monitors ADD COLUMN copy_review_required boolean NOT NULL DEFAULT false;
ALTER TABLE app_actions ADD COLUMN copy_review_required boolean NOT NULL DEFAULT false;

-- T4: one delivery per automation, recipient, business event and due occurrence, whatever version of the automation
-- is current. Editing an automation never sends the same due notice again.
CREATE TABLE automation_deliveries (
 workspace_id uuid NOT NULL REFERENCES workspaces(id), automation_id uuid NOT NULL, recipient text NOT NULL,
 business_event text NOT NULL, occurrence text NOT NULL, job_id uuid, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (automation_id,recipient,business_event,occurrence)
);
ALTER TABLE automation_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY delivery_scope ON automation_deliveries FOR ALL USING (trialy_security.worker() OR trialy_security.workspace_permission(workspace_id)) WITH CHECK (trialy_security.worker() OR trialy_security.workspace_permission(workspace_id));
