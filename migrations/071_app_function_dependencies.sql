-- E7: brief and email-summary bindings participate in the existing retirement/cancellation lifecycle.
CREATE OR REPLACE FUNCTION suspend_archived_app_automations() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE removed jsonb; retire_monitors uuid[]; retire_actions uuid[]; suspend_monitors uuid[]; suspend_actions uuid[]; removed_execution text[];
 suspending boolean := NEW.archived AND NOT OLD.archived;
 deleting boolean := NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL;
BEGIN
 IF OLD.archived AND NOT NEW.archived THEN
  UPDATE app_monitors SET archived_with_app_at=NULL,enabled=false,updated_at=now() WHERE app_id=NEW.id AND workspace_id=NEW.workspace_id AND deleted_at IS NULL AND archived_with_app_at IS NOT NULL;
  UPDATE app_actions SET archived_with_app_at=NULL,paused=true,next_at=NULL WHERE app_id=NEW.id AND workspace_id=NEW.workspace_id AND deleted_at IS NULL AND archived_with_app_at IS NOT NULL;
 END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('typeId',b->>'typeId','whole',NOT EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.bindings) n WHERE n->>'typeId'=b->>'typeId'),'fields',keys)),'[]') INTO removed
 FROM jsonb_array_elements(OLD.bindings) b CROSS JOIN LATERAL
 (SELECT jsonb_agg(k) AS keys FROM jsonb_array_elements_text(b->'fields') k WHERE NOT EXISTS
  (SELECT 1 FROM jsonb_array_elements(NEW.bindings) n WHERE n->>'typeId'=b->>'typeId' AND n->'fields' ? k)) diff WHERE keys IS NOT NULL;
 SELECT coalesce(array_agg(b->>'name'),ARRAY[]::text[]) INTO removed_execution FROM jsonb_array_elements(OLD.execution) b
 WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.execution) n WHERE n->>'name'=b->>'name');
 SELECT coalesce(array_agg(id),ARRAY[]::uuid[]) INTO retire_monitors FROM app_monitors m WHERE app_id=NEW.id AND workspace_id=NEW.workspace_id AND deleted_at IS NULL
 AND (deleting OR app_config_uses_removed_binding(config,removed) OR config->'brief'->>'binding'=ANY(removed_execution)
  OR EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(config->'writeScopes','[]')) s JOIN maintenance_scopes ms ON ms.id::text=s->>'scopeId'
    WHERE ms.workspace_id=NEW.workspace_id AND app_config_uses_removed_binding(jsonb_build_object('readBindings',ms.body->'bindings'),removed)));
 SELECT coalesce(array_agg(id),ARRAY[]::uuid[]) INTO retire_actions FROM app_actions a WHERE app_id=NEW.id AND workspace_id=NEW.workspace_id AND deleted_at IS NULL
 AND (deleting OR app_config_uses_removed_binding(config,removed) OR config->'trigger'->>'automationId'=ANY(retire_monitors::text[])
  OR EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(config->'steps','[]')) s WHERE (s->>'binding'=ANY(removed_execution) OR s->'summary'->>'binding'=ANY(removed_execution)))
  OR EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(config->'steps','[]')) s JOIN connectors c ON c.id::text=s->>'connectionId'
   CROSS JOIN LATERAL jsonb_array_elements(c.config->'operations') op CROSS JOIN LATERAL jsonb_array_elements(op->'mappings') m
   WHERE c.workspace_id=NEW.workspace_id AND op->>'id'=s->>'operation' AND EXISTS(SELECT 1 FROM jsonb_array_elements(removed) d WHERE d->>'typeId'=m->>'typeId' AND d->'fields' ? (m->>'field'))));
 SELECT coalesce(array_agg(id),ARRAY[]::uuid[]) INTO suspend_monitors FROM app_monitors WHERE suspending AND app_id=NEW.id AND workspace_id=NEW.workspace_id AND deleted_at IS NULL AND NOT id=ANY(retire_monitors);
 SELECT coalesce(array_agg(id),ARRAY[]::uuid[]) INTO suspend_actions FROM app_actions WHERE suspending AND app_id=NEW.id AND workspace_id=NEW.workspace_id AND deleted_at IS NULL AND NOT id=ANY(retire_actions);
 UPDATE app_monitors SET enabled=false,deleted_at=now(),archived_with_app_at=NULL,updated_at=now() WHERE id=ANY(retire_monitors);
 UPDATE app_actions SET paused=true,deleted_at=now(),archived_with_app_at=NULL,next_at=NULL WHERE id=ANY(retire_actions);
 UPDATE app_monitors SET enabled=false,archived_with_app_at=coalesce(archived_with_app_at,now()),updated_at=now() WHERE id=ANY(suspend_monitors);
 UPDATE app_actions SET paused=true,archived_with_app_at=coalesce(archived_with_app_at,now()),next_at=NULL WHERE id=ANY(suspend_actions);
 -- Queued and running work is cancelled whether the definition is retired or suspended.
 retire_monitors:=retire_monitors||suspend_monitors; retire_actions:=retire_actions||suspend_actions;
 DELETE FROM automation_dispatch WHERE monitor_id=ANY(retire_monitors);
 UPDATE automation_occurrences SET status='cancelled',finished_at=now(),claim_token=NULL,lease_until=NULL WHERE monitor_id=ANY(retire_monitors) AND status IN ('queued','running');
 UPDATE app_monitor_runs SET status='cancelled',finished_at=now() WHERE monitor_id=ANY(retire_monitors) AND status='running';
 UPDATE app_action_runs SET status='cancelled',finished_at=now(),lease_token=NULL,lease_until=NULL,diagnostic=CASE WHEN suspending THEN 'app_archived' ELSE 'app_dependency_deleted' END WHERE action_id=ANY(retire_actions) AND status IN ('queued','waiting','running');
 UPDATE app_service_jobs SET status='cancelled',finished_at=now(),lease_token=NULL,lease_until=NULL,diagnostic=CASE WHEN suspending THEN 'app_archived' ELSE 'app_dependency_deleted' END
 WHERE workspace_id=NEW.workspace_id AND app_id=NEW.id AND status='queued' AND (suspending OR deleting OR id IN
  (SELECT e.job_id FROM app_action_effects e JOIN app_action_runs r ON r.id=e.run_id WHERE r.action_id=ANY(retire_actions)) OR id IN
  (SELECT pending_job FROM app_action_runs WHERE action_id=ANY(retire_actions)) OR payload->'notification'->>'batchId' IN
  (SELECT id::text FROM app_notification_batches WHERE action_id=ANY(retire_actions)));
 UPDATE app_notification_batches SET status='cancelled',finished_at=now(),diagnostic=CASE WHEN suspending THEN 'app_archived' ELSE 'app_dependency_deleted' END WHERE action_id=ANY(retire_actions) AND status IN ('collecting','sending');
 RETURN NEW;
END $$;
