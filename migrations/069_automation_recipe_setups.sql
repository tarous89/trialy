-- Optional reviewed setup intents, separate from the installed app and live definitions.
CREATE TABLE automation_recipe_setups (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), user_id uuid NOT NULL REFERENCES users(id),
 app_id uuid NOT NULL REFERENCES workspace_components(id), recipe_key text NOT NULL, context_key text NOT NULL DEFAULT '',
 assistant text CHECK(assistant IN ('chatgpt','claude')), body jsonb NOT NULL, digest text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','needs_setup','cancelled')),
 revision integer NOT NULL DEFAULT 0, attempts integer NOT NULL DEFAULT 0,
 definition_id uuid, definition_kind text CHECK(definition_kind IN ('research','action')), definition_version integer,
 diagnostic text, available_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(workspace_id,user_id,app_id,recipe_key,context_key)
);
CREATE INDEX automation_recipe_setups_pending ON automation_recipe_setups(available_at) WHERE status='pending';
ALTER TABLE automation_recipe_setups ENABLE ROW LEVEL SECURITY;
CREATE POLICY recipe_owner ON automation_recipe_setups FOR ALL USING (trialy_security.workspace_permission(workspace_id) AND user_id=trialy_security.actor_id()) WITH CHECK (trialy_security.workspace_permission(workspace_id) AND user_id=trialy_security.actor_id());
CREATE POLICY recipe_worker ON automation_recipe_setups FOR ALL USING (trialy_security.worker()) WITH CHECK (trialy_security.worker());

CREATE TABLE automation_recipe_approvals (
 id uuid PRIMARY KEY, setup_id uuid NOT NULL REFERENCES automation_recipe_setups(id), revision integer NOT NULL,
 workspace_id uuid NOT NULL REFERENCES workspaces(id), user_id uuid NOT NULL REFERENCES users(id),
 assistant text CHECK(assistant IN ('chatgpt','claude')), body jsonb NOT NULL, digest text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(setup_id,revision)
);
ALTER TABLE automation_recipe_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY recipe_approval_owner ON automation_recipe_approvals FOR ALL USING (trialy_security.workspace_permission(workspace_id) AND user_id=trialy_security.actor_id()) WITH CHECK (trialy_security.workspace_permission(workspace_id) AND user_id=trialy_security.actor_id());
CREATE POLICY recipe_approval_worker ON automation_recipe_approvals FOR SELECT USING (trialy_security.worker());
CREATE FUNCTION protect_recipe_approval() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Automation recipe approvals are immutable'; END $$;
CREATE TRIGGER recipe_approval_immutable BEFORE UPDATE OR DELETE ON automation_recipe_approvals FOR EACH ROW EXECUTE FUNCTION protect_recipe_approval();

-- Restoring an app never revives unmaterialized authorizations.
CREATE FUNCTION retire_app_recipe_setups() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NEW.archived AND NOT OLD.archived THEN
  UPDATE automation_recipe_setups SET status='cancelled',diagnostic='app_archived',revision=revision+1,updated_at=now()
  WHERE app_id=NEW.id AND status IN ('pending','needs_setup');
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER retire_app_recipe_setups AFTER UPDATE OF archived ON workspace_components FOR EACH ROW EXECUTE FUNCTION retire_app_recipe_setups();

CREATE FUNCTION retire_project_recipe_setups() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NEW.archived AND NOT OLD.archived THEN
  WITH RECURSIVE nodes AS (
   SELECT id FROM workspace_nodes WHERE id=NEW.id AND workspace_id=NEW.workspace_id
   UNION ALL SELECT n.id FROM workspace_nodes n JOIN nodes p ON n.parent_id=p.id WHERE n.workspace_id=NEW.workspace_id
  ) UPDATE automation_recipe_setups SET status='cancelled',diagnostic='project_archived',revision=revision+1,updated_at=now()
    WHERE status IN ('pending','needs_setup') AND app_id IN (SELECT id FROM workspace_components WHERE project_id IN (SELECT id FROM nodes) AND workspace_id=NEW.workspace_id);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER retire_project_recipe_setups AFTER UPDATE OF archived ON workspace_nodes FOR EACH ROW EXECUTE FUNCTION retire_project_recipe_setups();

ALTER TABLE app_notification_batches ADD COLUMN summary_run_id uuid, ADD COLUMN routing_key text NOT NULL DEFAULT '';
CREATE INDEX notification_summary_run ON app_notification_batches(summary_run_id) WHERE summary_run_id IS NOT NULL;
DROP INDEX notification_open_batch;
CREATE UNIQUE INDEX notification_open_batch ON app_notification_batches
 (action_id,action_version,coalesce(source_run_id,'00000000-0000-0000-0000-000000000000'::uuid),routing_key) WHERE status='collecting';

ALTER TABLE foundation_runs ADD COLUMN assistant text NOT NULL DEFAULT 'chatgpt' CHECK(assistant IN ('chatgpt','claude'));

ALTER TABLE app_monitor_runs ADD COLUMN brief_run_id uuid;
CREATE INDEX monitoring_brief_run ON app_monitor_runs(brief_run_id) WHERE brief_run_id IS NOT NULL;

CREATE OR REPLACE FUNCTION protect_monitor_run() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF OLD.status<>'running' THEN RAISE EXCEPTION 'Completed monitoring receipt is immutable'; END IF;
 IF OLD.brief_run_id IS NOT NULL AND NEW.brief_run_id IS DISTINCT FROM OLD.brief_run_id THEN RAISE EXCEPTION 'Research brief identity is immutable'; END IF;
 IF (to_jsonb(OLD)-ARRAY['status','result','result_digest','finished_at','brief_run_id']) IS DISTINCT FROM (to_jsonb(NEW)-ARRAY['status','result','result_digest','finished_at','brief_run_id']) THEN RAISE EXCEPTION 'Monitoring run request is immutable'; END IF;
 RETURN NEW;
END $$;
