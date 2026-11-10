-- App-owned workflows are removed when their declared data or function binding
-- is removed. Hiding a tab keeps its bindings and does not delete anything.
CREATE FUNCTION app_config_uses_removed_binding(config jsonb, removed jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path=pg_catalog,public AS $$
 SELECT EXISTS(SELECT 1 FROM jsonb_array_elements(removed) d WHERE
  EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(config->'readBindings','[]')) b
   WHERE b->>'typeId'=d->>'typeId' AND ((d->>'whole')::boolean OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(d->'fields') k WHERE b->'fields' ? k)))
  OR (config->>'recordTypeId'=d->>'typeId' AND ((d->>'whole')::boolean OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(d->'fields') k WHERE config->'fields' ? k)))
  OR EXISTS(SELECT 1 FROM (VALUES(config->'trigger'),(config->'automation'->'trigger')) AS triggers(t)
   WHERE t->>'typeId'=d->>'typeId' AND ((d->>'whole')::boolean OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(d->'fields') k WHERE t->'fields' ? k OR t->>'field'=k OR t->'becomes'->>'field'=k)))
 );
$$;
REVOKE ALL ON FUNCTION app_config_uses_removed_binding(jsonb,jsonb) FROM PUBLIC;
CREATE OR REPLACE FUNCTION suspend_archived_app_automations() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE removed jsonb; monitors uuid[]; actions uuid[]; removed_execution text[];
BEGIN
 SELECT coalesce(jsonb_agg(jsonb_build_object('typeId',b->>'typeId','whole',NOT EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.bindings) n WHERE n->>'typeId'=b->>'typeId'),'fields',keys)),'[]') INTO removed
 FROM jsonb_array_elements(OLD.bindings) b CROSS JOIN LATERAL
 (SELECT jsonb_agg(k) AS keys FROM jsonb_array_elements_text(b->'fields') k WHERE NOT EXISTS
  (SELECT 1 FROM jsonb_array_elements(NEW.bindings) n WHERE n->>'typeId'=b->>'typeId' AND n->'fields' ? k)) diff WHERE keys IS NOT NULL;
 SELECT coalesce(array_agg(b->>'name'),ARRAY[]::text[]) INTO removed_execution FROM jsonb_array_elements(OLD.execution) b
 WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.execution) n WHERE n->>'name'=b->>'name');
 SELECT coalesce(array_agg(id),ARRAY[]::uuid[]) INTO monitors FROM app_monitors m WHERE app_id=NEW.id AND workspace_id=NEW.workspace_id AND deleted_at IS NULL
 AND (NEW.archived OR app_config_uses_removed_binding(config,removed)
  OR EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(config->'writeScopes','[]')) s JOIN maintenance_scopes ms ON ms.id::text=s->>'scopeId'
    WHERE ms.workspace_id=NEW.workspace_id AND app_config_uses_removed_binding(jsonb_build_object('readBindings',ms.body->'bindings'),removed)));
 SELECT coalesce(array_agg(id),ARRAY[]::uuid[]) INTO actions FROM app_actions a WHERE app_id=NEW.id AND workspace_id=NEW.workspace_id AND deleted_at IS NULL
 AND (NEW.archived OR app_config_uses_removed_binding(config,removed) OR config->'trigger'->>'automationId'=ANY(monitors::text[])
  OR EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(config->'steps','[]')) s WHERE s->>'binding'=ANY(removed_execution))
  OR EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(config->'steps','[]')) s JOIN connectors c ON c.id::text=s->>'connectionId'
   CROSS JOIN LATERAL jsonb_array_elements(c.config->'operations') op CROSS JOIN LATERAL jsonb_array_elements(op->'mappings') m
   WHERE c.workspace_id=NEW.workspace_id AND op->>'id'=s->>'operation' AND EXISTS(SELECT 1 FROM jsonb_array_elements(removed) d WHERE d->>'typeId'=m->>'typeId' AND d->'fields' ? (m->>'field'))));
 UPDATE app_monitors SET enabled=false,deleted_at=now(),updated_at=now() WHERE id=ANY(monitors);
 UPDATE app_actions SET paused=true,deleted_at=now(),next_at=NULL WHERE id=ANY(actions);
 DELETE FROM automation_dispatch WHERE monitor_id=ANY(monitors);
 UPDATE automation_occurrences SET status='cancelled',finished_at=now(),claim_token=NULL,lease_until=NULL WHERE monitor_id=ANY(monitors) AND status IN ('queued','running');
 UPDATE app_monitor_runs SET status='cancelled',finished_at=now() WHERE monitor_id=ANY(monitors) AND status='running';
 UPDATE app_action_runs SET status='cancelled',finished_at=now(),lease_token=NULL,lease_until=NULL,diagnostic='app_dependency_deleted' WHERE action_id=ANY(actions) AND status IN ('queued','waiting','running');
 UPDATE app_service_jobs SET status='cancelled',finished_at=now(),lease_token=NULL,lease_until=NULL,diagnostic='app_dependency_deleted'
 WHERE workspace_id=NEW.workspace_id AND app_id=NEW.id AND status='queued' AND (NEW.archived OR id IN
  (SELECT e.job_id FROM app_action_effects e JOIN app_action_runs r ON r.id=e.run_id WHERE r.action_id=ANY(actions)) OR id IN
  (SELECT pending_job FROM app_action_runs WHERE action_id=ANY(actions)) OR payload->'notification'->>'batchId' IN
  (SELECT id::text FROM app_notification_batches WHERE action_id=ANY(actions)));
 UPDATE app_notification_batches SET status='cancelled',finished_at=now(),diagnostic='app_dependency_deleted' WHERE action_id=ANY(actions) AND status IN ('collecting','sending');
 RETURN NEW;
END $$;
DROP TRIGGER archive_app_automations ON workspace_components;
CREATE TRIGGER archive_app_automations AFTER UPDATE OF archived,bindings,execution ON workspace_components
 FOR EACH ROW WHEN (OLD.archived IS DISTINCT FROM NEW.archived OR OLD.bindings IS DISTINCT FROM NEW.bindings OR OLD.execution IS DISTINCT FROM NEW.execution)
 EXECUTE FUNCTION suspend_archived_app_automations();

-- Read-only eligibility check sees every owner's dependencies and archived rows,
-- irrespective of the caller's RLS visibility. It never returns record values.
CREATE FUNCTION trialy_security.unused_app_fields(w uuid,t uuid,candidates text[]) RETURNS SETOF text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE k text;
BEGIN
 IF NOT trialy_security.table_permission(w,t,true) OR NOT EXISTS
 (SELECT 1 FROM workspaces ws JOIN memberships m ON m.tenant_id=ws.tenant_id WHERE ws.id=w AND m.user_id=trialy_security.actor_id() AND m.role='owner') THEN RETURN; END IF;
 FOREACH k IN ARRAY candidates LOOP
  IF NOT EXISTS(SELECT 1 FROM records WHERE workspace_id=w AND type_id=t AND data ? k AND data->k NOT IN ('null'::jsonb,'""'::jsonb,'[]'::jsonb))
  AND NOT EXISTS(SELECT 1 FROM workspace_components c CROSS JOIN LATERAL jsonb_array_elements(c.bindings) b WHERE c.workspace_id=w AND NOT c.archived AND b->>'typeId'=t::text AND b->'fields' ? k)
  AND NOT EXISTS(SELECT 1 FROM entity_types e CROSS JOIN LATERAL jsonb_array_elements(e.fields) f WHERE e.workspace_id=w AND
   (f->>'targetTypeId'=t::text OR e.id=t AND (coalesce(f->'formula'->'fields','[]') ? k OR coalesce(f->'computed'->'fields','[]') ? k OR f->'lookup'->>'reference'=k)))
  AND NOT EXISTS(SELECT 1 FROM saved_views WHERE workspace_id=w AND type_id=t)
  AND NOT EXISTS(SELECT 1 FROM external_links WHERE workspace_id=w AND type_id=t AND revoked_at IS NULL AND fields ? k)
  AND NOT EXISTS(SELECT 1 FROM maintenance_scopes s CROSS JOIN LATERAL jsonb_array_elements(s.body->'bindings') b WHERE s.workspace_id=w AND s.revoked_at IS NULL AND b->>'typeId'=t::text AND b->'fields' ? k)
  AND NOT EXISTS(SELECT 1 FROM foundation_functions f JOIN foundation_revisions r ON r.function_id=f.id WHERE f.workspace_id=w AND r.body::text LIKE '%'||t::text||'%')
  AND NOT EXISTS(SELECT 1 FROM connectors WHERE workspace_id=w AND removed_at IS NULL AND config::text LIKE '%'||t::text||'%')
  AND NOT EXISTS(SELECT 1 FROM app_monitors WHERE workspace_id=w AND deleted_at IS NULL AND app_config_uses_removed_binding(config,jsonb_build_array(jsonb_build_object('typeId',t,'fields',jsonb_build_array(k),'whole',false))))
  AND NOT EXISTS(SELECT 1 FROM app_actions WHERE workspace_id=w AND deleted_at IS NULL AND app_config_uses_removed_binding(config,jsonb_build_array(jsonb_build_object('typeId',t,'fields',jsonb_build_array(k),'whole',false))))
  AND NOT EXISTS(SELECT 1 FROM cross_table_links l JOIN records r ON r.id IN (l.source_record_id,l.preferred_record_id) WHERE l.workspace_id=w AND l.revoked_at IS NULL AND r.type_id=t)
  THEN RETURN NEXT k; END IF;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION trialy_security.unused_app_fields(uuid,uuid,text[]) FROM PUBLIC;
