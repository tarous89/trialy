-- Session 6, package 6.1 (T1, A7, D23–D25): automations belong to their app.
-- Every owner of the app (and every organization owner, D4) sees and manages the app's automations.
-- The person an automation runs as is its linked owner (user_id). Runs still execute with that person's
-- rights through the assistant it runs on (D23: the assistant column says where it runs, not who owns it).
-- Runners and their subscriptions stay personal: they are one person's connection to an assistant.

-- True when the signed-in person is an owner of the app.
CREATE FUNCTION trialy_security.manages_app(app uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT trialy_security.actor_id() IS NOT NULL AND coalesce(trialy_security.app_role(app,trialy_security.actor_id()),'none')='owner'
$$;
REVOKE ALL ON FUNCTION trialy_security.manages_app(uuid) FROM PUBLIC;
-- The same for rows that point at a research automation. Definer, so the check does not depend on the row rules of app_monitors.
CREATE FUNCTION trialy_security.manages_monitor(m uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT coalesce((SELECT trialy_security.manages_app(app_id) FROM app_monitors WHERE id=m),false)
$$;
REVOKE ALL ON FUNCTION trialy_security.manages_monitor(uuid) FROM PUBLIC;
CREATE FUNCTION trialy_security.manages_run(r uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT coalesce((SELECT trialy_security.manages_monitor(monitor_id) FROM app_monitor_runs WHERE id=r),false)
$$;
REVOKE ALL ON FUNCTION trialy_security.manages_run(uuid) FROM PUBLIC;
CREATE FUNCTION trialy_security.manages_occurrence(o uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT coalesce((SELECT monitor_id IS NOT NULL AND trialy_security.manages_monitor(monitor_id) FROM automation_occurrences WHERE id=o),false)
$$;
REVOKE ALL ON FUNCTION trialy_security.manages_occurrence(uuid) FROM PUBLIC;
-- The runtime role receives EXECUTE through ops/runtime-role.sql (all trialy_security functions).

-- The creator-only rule becomes "linked owner or an owner of the app" on the nine automation tables.
DROP POLICY monitor_scope ON app_monitors;
CREATE POLICY monitor_scope ON app_monitors FOR ALL
 USING (trialy_security.workspace_permission(workspace_id) AND (user_id=trialy_security.actor_id() OR trialy_security.manages_app(app_id)))
 WITH CHECK (trialy_security.workspace_permission(workspace_id) AND (user_id=trialy_security.actor_id() OR trialy_security.manages_app(app_id)));
DROP POLICY monitor_scope ON app_monitor_runs;
CREATE POLICY monitor_scope ON app_monitor_runs FOR ALL
 USING (trialy_security.workspace_permission(workspace_id) AND (user_id=trialy_security.actor_id() OR trialy_security.manages_monitor(monitor_id)))
 WITH CHECK (trialy_security.workspace_permission(workspace_id) AND (user_id=trialy_security.actor_id() OR trialy_security.manages_monitor(monitor_id)));
DROP POLICY monitor_scope ON app_monitor_receipts;
CREATE POLICY monitor_scope ON app_monitor_receipts FOR ALL
 USING (trialy_security.workspace_permission(workspace_id) AND (user_id=trialy_security.actor_id() OR trialy_security.manages_run(run_id)))
 WITH CHECK (trialy_security.workspace_permission(workspace_id) AND user_id=trialy_security.actor_id());
DROP POLICY automation_owner ON automation_dispatch;
CREATE POLICY automation_owner ON automation_dispatch FOR ALL
 USING (trialy_security.workspace_permission(workspace_id) AND (user_id=trialy_security.actor_id() OR trialy_security.manages_monitor(monitor_id)))
 WITH CHECK (trialy_security.workspace_permission(workspace_id) AND (user_id=trialy_security.actor_id() OR trialy_security.manages_monitor(monitor_id)));
DROP POLICY automation_owner ON automation_occurrences;
CREATE POLICY automation_owner ON automation_occurrences FOR ALL
 USING (trialy_security.workspace_permission(workspace_id) AND (user_id=trialy_security.actor_id() OR monitor_id IS NOT NULL AND trialy_security.manages_monitor(monitor_id)))
 WITH CHECK (trialy_security.workspace_permission(workspace_id) AND (user_id=trialy_security.actor_id() OR monitor_id IS NOT NULL AND trialy_security.manages_monitor(monitor_id)));
DROP POLICY automation_owner ON automation_attempts;
CREATE POLICY automation_owner ON automation_attempts FOR ALL
 USING (trialy_security.workspace_permission(workspace_id) AND (user_id=trialy_security.actor_id() OR trialy_security.manages_occurrence(occurrence_id)))
 WITH CHECK (trialy_security.workspace_permission(workspace_id) AND user_id=trialy_security.actor_id());
DROP POLICY recipe_owner ON automation_recipe_setups;
CREATE POLICY recipe_owner ON automation_recipe_setups FOR ALL
 USING (trialy_security.workspace_permission(workspace_id) AND (user_id=trialy_security.actor_id() OR trialy_security.manages_app(app_id)))
 WITH CHECK (trialy_security.workspace_permission(workspace_id) AND (user_id=trialy_security.actor_id() OR trialy_security.manages_app(app_id)));
-- Action automations already use the workspace rule; the application decides who manages them (appRole owner).
-- An app owner may read (never use) the runner a research automation of their app is linked to, to show whether it is connected.
CREATE POLICY automation_runner_app_owner ON automation_runners FOR SELECT USING (
 trialy_security.workspace_permission(workspace_id) AND EXISTS(SELECT 1 FROM app_monitors m WHERE m.workspace_id=automation_runners.workspace_id AND m.config->'automation'->>'runnerId'=automation_runners.id::text AND trialy_security.manages_app(m.app_id)));

-- Authoring keys are unique per app, not per person, now that several owners manage one app's automations.
-- If two people already used the same key on one app, the old per-person index stays and the migration report lists it.
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM app_monitors WHERE config->>'authoringKey' IS NOT NULL AND deleted_at IS NULL GROUP BY workspace_id,app_id,config->>'authoringKey' HAVING count(*)>1) THEN
  DROP INDEX automation_authoring_key;
  CREATE UNIQUE INDEX automation_authoring_key ON app_monitors(workspace_id,app_id,(config->>'authoringKey')) WHERE config->>'authoringKey' IS NOT NULL AND deleted_at IS NULL;
 ELSE RAISE NOTICE 'automation_authoring_key kept per person: shared authoring keys exist';
 END IF;
END $$;

-- D25: functions, code schedules and record rules tied to no app are listed as Unassigned for organization owners.
-- They keep their current state. Attaching one to an app or archiving it is recorded here.
ALTER TABLE automations ADD COLUMN app_id uuid REFERENCES workspace_components(id);
ALTER TABLE automations ADD COLUMN archived_at timestamptz;
ALTER TABLE foundation_schedules ADD COLUMN archived_at timestamptz;

-- Moves are audited like every other automation change (moveAutomation in src/automations/management.ts).
