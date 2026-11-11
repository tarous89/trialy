-- Archive first (docs/product/MODULAR_APPS_AND_SHARED_DATA.md §6), amending 053/059.
-- Archiving an app is fully reversible: its automations are suspended (not
-- deleted) and its bindings keep protecting fields. Unused empty fields and
-- tables are archived instead of removed; permanent deletion is a separate
-- owner action or an optional purge after 90 days. Records and history are
-- never deleted.

-- Archived field definitions leave `fields`, so every picker, export, search
-- and total that reads the active schema excludes them. Values stay on records.
-- Element shape: {"field":{...definition},"archivedAt":ts,"archivedBy":uuid|null,"appId":uuid|null}
ALTER TABLE entity_types ADD COLUMN archived_fields jsonb NOT NULL DEFAULT '[]',
 ADD COLUMN archived_at timestamptz, ADD COLUMN archived_by uuid REFERENCES users(id), ADD COLUMN deleted_at timestamptz;
-- deleted_at on apps and tables is a tombstone: the row, revisions, audit and
-- foreign keys remain; the item is gone from every list and cannot be restored.
ALTER TABLE workspace_components ADD COLUMN archived_at timestamptz, ADD COLUMN archived_by uuid REFERENCES users(id), ADD COLUMN deleted_at timestamptz;
ALTER TABLE app_monitors ADD COLUMN archived_with_app_at timestamptz;
ALTER TABLE app_actions ADD COLUMN archived_with_app_at timestamptz;
CREATE INDEX entity_types_archived ON entity_types(workspace_id) WHERE archived_at IS NOT NULL OR archived_fields<>'[]';

CREATE FUNCTION stamp_component_archive() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$ BEGIN
 IF NEW.archived AND NOT OLD.archived THEN NEW.archived_at:=now();NEW.archived_by:=trialy_security.actor_id();
 ELSIF OLD.archived AND NOT NEW.archived THEN NEW.archived_at:=NULL;NEW.archived_by:=NULL;END IF;
 IF OLD.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'Permanently deleted apps cannot change'; END IF;
 IF NEW.deleted_at IS NOT NULL AND NOT NEW.archived THEN RAISE EXCEPTION 'Only archived apps can be deleted permanently'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER stamp_component_archive BEFORE UPDATE ON workspace_components FOR EACH ROW EXECUTE FUNCTION stamp_component_archive();

-- App archive suspends; restore un-suspends but leaves everything disabled;
-- permanent deletion and binding removal retire (as in 059).
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
 AND (deleting OR app_config_uses_removed_binding(config,removed)
  OR EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(config->'writeScopes','[]')) s JOIN maintenance_scopes ms ON ms.id::text=s->>'scopeId'
    WHERE ms.workspace_id=NEW.workspace_id AND app_config_uses_removed_binding(jsonb_build_object('readBindings',ms.body->'bindings'),removed)));
 SELECT coalesce(array_agg(id),ARRAY[]::uuid[]) INTO retire_actions FROM app_actions a WHERE app_id=NEW.id AND workspace_id=NEW.workspace_id AND deleted_at IS NULL
 AND (deleting OR app_config_uses_removed_binding(config,removed) OR config->'trigger'->>'automationId'=ANY(retire_monitors::text[])
  OR EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(config->'steps','[]')) s WHERE s->>'binding'=ANY(removed_execution))
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
DROP TRIGGER archive_app_automations ON workspace_components;
CREATE TRIGGER archive_app_automations AFTER UPDATE OF archived,bindings,execution,deleted_at ON workspace_components
 FOR EACH ROW WHEN (OLD.archived IS DISTINCT FROM NEW.archived OR OLD.bindings IS DISTINCT FROM NEW.bindings OR OLD.execution IS DISTINCT FROM NEW.execution OR OLD.deleted_at IS DISTINCT FROM NEW.deleted_at)
 EXECUTE FUNCTION suspend_archived_app_automations();

-- One dependency inventory for cleanup, the archived lists and permanent
-- deletion. k NULL describes the whole table. Internal: no caller checks, never
-- returns record values, only counts and app names.
CREATE FUNCTION archive_usage(w uuid,t uuid,k text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE uses text[]:=ARRAY[]::text[]; vals bigint; apps jsonb; probe jsonb:=jsonb_build_array(jsonb_build_object('typeId',t,'fields',jsonb_build_array(k),'whole',k IS NULL));
BEGIN
 IF k IS NULL THEN SELECT count(*) INTO vals FROM records WHERE workspace_id=w AND type_id=t;
 ELSE SELECT count(*) INTO vals FROM records WHERE workspace_id=w AND type_id=t AND data ? k AND data->k NOT IN ('null'::jsonb,'""'::jsonb,'[]'::jsonb); END IF;
 -- Archived apps protect their bindings until they are permanently deleted.
 SELECT coalesce(jsonb_agg(DISTINCT jsonb_build_object('id',c.id,'name',c.name,'archived',c.archived)),'[]') INTO apps FROM workspace_components c CROSS JOIN LATERAL jsonb_array_elements(c.bindings) b
  WHERE c.workspace_id=w AND c.deleted_at IS NULL AND b->>'typeId'=t::text AND (k IS NULL OR b->'fields' ? k);
 IF EXISTS(SELECT 1 FROM entity_types e CROSS JOIN LATERAL jsonb_array_elements(e.fields) f WHERE e.workspace_id=w AND e.deleted_at IS NULL AND
  (f->>'targetTypeId'=t::text AND (k IS NOT NULL OR e.id<>t) OR k IS NOT NULL AND e.id=t AND (coalesce(f->'formula'->'fields','[]') ? k OR coalesce(f->'computed'->'fields','[]') ? k OR f->'lookup'->>'reference'=k)))
  THEN uses:=array_append(uses,'field'); END IF;
 IF EXISTS(SELECT 1 FROM saved_views WHERE workspace_id=w AND type_id=t) THEN uses:=array_append(uses,'view'); END IF;
 IF EXISTS(SELECT 1 FROM external_links WHERE workspace_id=w AND type_id=t AND revoked_at IS NULL AND (k IS NULL OR fields ? k)) THEN uses:=array_append(uses,'link'); END IF;
 IF EXISTS(SELECT 1 FROM maintenance_scopes s CROSS JOIN LATERAL jsonb_array_elements(s.body->'bindings') b WHERE s.workspace_id=w AND s.revoked_at IS NULL AND b->>'typeId'=t::text AND (k IS NULL OR b->'fields' ? k)) THEN uses:=array_append(uses,'scope'); END IF;
 IF EXISTS(SELECT 1 FROM foundation_functions f JOIN foundation_revisions r ON r.function_id=f.id WHERE f.workspace_id=w AND r.body::text LIKE '%'||t::text||'%') THEN uses:=array_append(uses,'function'); END IF;
 IF EXISTS(SELECT 1 FROM connectors WHERE workspace_id=w AND removed_at IS NULL AND config::text LIKE '%'||t::text||'%') THEN uses:=array_append(uses,'connector'); END IF;
 IF EXISTS(SELECT 1 FROM app_monitors WHERE workspace_id=w AND deleted_at IS NULL AND (app_config_uses_removed_binding(config,probe) OR k IS NULL AND config::text LIKE '%'||t::text||'%'))
  OR EXISTS(SELECT 1 FROM app_actions WHERE workspace_id=w AND deleted_at IS NULL AND (app_config_uses_removed_binding(config,probe) OR k IS NULL AND config::text LIKE '%'||t::text||'%')) THEN uses:=array_append(uses,'automation'); END IF;
 IF EXISTS(SELECT 1 FROM cross_table_links l JOIN records r ON r.id IN (l.source_record_id,l.preferred_record_id) WHERE l.workspace_id=w AND l.revoked_at IS NULL AND r.type_id=t) THEN uses:=array_append(uses,'cross_table_link'); END IF;
 IF k IS NULL AND EXISTS(SELECT 1 FROM table_mappings tm WHERE workspace_id=w AND NOT EXISTS(SELECT 1 FROM table_mapping_revocations v WHERE v.mapping_id=tm.id) AND t IN (source_type_id,preferred_type_id)) THEN uses:=array_append(uses,'table_mapping'); END IF;
 RETURN jsonb_build_object('values',vals,'apps',apps,'uses',to_jsonb(uses),'unused',vals=0 AND apps='[]'::jsonb AND cardinality(uses)=0);
END $$;
REVOKE ALL ON FUNCTION archive_usage(uuid,uuid,text) FROM PUBLIC;

CREATE FUNCTION trialy_security.workspace_owner(w uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT EXISTS(SELECT 1 FROM workspaces ws JOIN memberships m ON m.tenant_id=ws.tenant_id WHERE ws.id=w AND m.user_id=trialy_security.actor_id() AND m.role='owner')
$$;

-- Same eligibility contract as 059, with archived apps' bindings counting as in use.
CREATE OR REPLACE FUNCTION trialy_security.unused_app_fields(w uuid,t uuid,candidates text[]) RETURNS SETOF text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE k text;
BEGIN
 IF NOT trialy_security.table_permission(w,t,true) OR NOT trialy_security.workspace_owner(w) THEN RETURN; END IF;
 FOREACH k IN ARRAY candidates LOOP
  IF (archive_usage(w,t,k)->>'unused')::boolean THEN RETURN NEXT k; END IF;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION trialy_security.unused_app_fields(uuid,uuid,text[]) FROM PUBLIC;

-- Owner-only read of the inventory, for archived lists and deletion checks.
CREATE FUNCTION trialy_security.archived_item_usage(w uuid,t uuid,k text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NOT trialy_security.workspace_owner(w) OR NOT EXISTS(SELECT 1 FROM entity_types WHERE id=t AND workspace_id=w) THEN RETURN NULL; END IF;
 RETURN archive_usage(w,t,k);
END $$;
REVOKE ALL ON FUNCTION trialy_security.archived_item_usage(uuid,uuid,text) FROM PUBLIC;

-- Optional purge (worker only): fields and tables archived for at least 90
-- days that are still empty and unused. Populated, bound or recently archived
-- items are never touched. Each purge is recorded in the audit trail.
CREATE FUNCTION trialy_security.purge_archived_schema() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE t record; item jsonb; keep jsonb; purged jsonb; n integer:=0; owner_id uuid;
BEGIN
 IF NOT trialy_security.worker() THEN RETURN 0; END IF;
 FOR t IN SELECT e.*,ws.tenant_id FROM entity_types e JOIN workspaces ws ON ws.id=e.workspace_id WHERE e.deleted_at IS NULL AND (e.archived_at IS NOT NULL OR e.archived_fields<>'[]') FOR UPDATE OF e LOOP
  SELECT m.user_id INTO owner_id FROM memberships m WHERE m.tenant_id=t.tenant_id AND m.role='owner' ORDER BY m.user_id LIMIT 1;
  IF owner_id IS NULL THEN CONTINUE; END IF;
  keep:='[]';purged:='[]';
  FOR item IN SELECT * FROM jsonb_array_elements(t.archived_fields) LOOP
   IF (item->>'archivedAt')::timestamptz<=now()-interval '90 days' AND (archive_usage(t.workspace_id,t.id,item->'field'->>'key')->>'unused')::boolean THEN purged:=purged||jsonb_build_array(item);
   ELSE keep:=keep||jsonb_build_array(item); END IF;
  END LOOP;
  IF purged<>'[]' THEN
   UPDATE entity_types SET archived_fields=keep,version=version+1 WHERE id=t.id;
   INSERT INTO revisions(id,workspace_id,object_id,object_kind,version,snapshot,actor_id) VALUES(gen_random_uuid(),t.workspace_id,t.id,'type',t.version+1,jsonb_build_object('id',t.id,'name',t.name,'fields',t.fields,'archivedFields',keep,'version',t.version+1),owner_id);
   INSERT INTO audit_events(id,workspace_id,tenant_id,actor_id,action,object_id,origin,before_value,after_value,reason) VALUES(gen_random_uuid(),t.workspace_id,t.tenant_id,owner_id,'field.purged',t.id,'system',jsonb_build_object('archivedFields',t.archived_fields),jsonb_build_object('purged',purged),'Archived for 90 days, empty and unused');
   n:=n+jsonb_array_length(purged);
  END IF;
  IF t.archived_at IS NOT NULL AND t.archived_at<=now()-interval '90 days' AND keep='[]' AND t.fields='[]' AND (archive_usage(t.workspace_id,t.id,NULL)->>'unused')::boolean THEN
   UPDATE entity_types SET deleted_at=now() WHERE id=t.id;
   INSERT INTO audit_events(id,workspace_id,tenant_id,actor_id,action,object_id,origin,before_value,after_value,reason) VALUES(gen_random_uuid(),t.workspace_id,t.tenant_id,owner_id,'table.purged',t.id,'system',jsonb_build_object('name',t.name,'archivedAt',t.archived_at),jsonb_build_object('deleted',true),'Archived for 90 days, empty and unused');
   n:=n+1;
  END IF;
 END LOOP;
 RETURN n;
END $$;
REVOKE ALL ON FUNCTION trialy_security.purge_archived_schema() FROM PUBLIC;

-- Backfill 1: fields removed by 059 cleanup become archived fields again, from
-- the immutable audit before-state. Keys that are active again are skipped.
WITH removed AS (
 SELECT DISTINCT ON (e.object_id,f->>'key') e.object_id type_id,f field,e.created_at,e.actor_id,e.after_value->>'componentId' app
 FROM audit_events e CROSS JOIN LATERAL jsonb_array_elements(e.before_value->'fields') f
 WHERE e.action='app.empty_fields_removed' AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(e.after_value->'fields') a WHERE a->>'key'=f->>'key')
 ORDER BY e.object_id,f->>'key',e.created_at DESC
)
UPDATE entity_types t SET archived_fields=t.archived_fields||r.items FROM (
 SELECT type_id,jsonb_agg(jsonb_build_object('field',field,'archivedAt',created_at,'archivedBy',actor_id,'appId',app) ORDER BY created_at,field->>'key') items
 FROM removed r WHERE NOT EXISTS(SELECT 1 FROM entity_types x CROSS JOIN LATERAL jsonb_array_elements(x.fields) a WHERE x.id=r.type_id AND a->>'key'=r.field->>'key') GROUP BY type_id
) r WHERE t.id=r.type_id;
-- Backfill 2: schemas emptied by 059 become archived tables.
UPDATE entity_types SET archived_at=(SELECT max((x->>'archivedAt')::timestamptz) FROM jsonb_array_elements(archived_fields) x)
 WHERE fields='[]' AND archived_fields<>'[]' AND archived_at IS NULL;
-- Backfill 3: archive timestamps for apps archived before this migration.
UPDATE workspace_components c SET archived_at=coalesce((SELECT min(r.created_at) FROM revisions r WHERE r.object_id=c.id AND r.object_kind='workspace_component' AND (r.snapshot->>'archived')::boolean
  AND r.version>coalesce((SELECT max(p.version) FROM revisions p WHERE p.object_id=c.id AND p.object_kind='workspace_component' AND NOT coalesce((p.snapshot->>'archived')::boolean,false)),-1)),c.created_at)
 WHERE archived AND archived_at IS NULL;
-- Backfill 4: automations deleted as a side effect of archiving their app
-- (053/059) become suspended and disabled, restorable with the app. Those
-- retired earlier by binding removal stay retired. The 053 permanence trigger
-- is lifted only for this one-time recovery; deletion stays permanent afterwards.
ALTER TABLE app_monitors DISABLE TRIGGER monitor_deletion_permanent;
ALTER TABLE app_actions DISABLE TRIGGER action_deletion_permanent;
UPDATE app_monitors m SET archived_with_app_at=m.deleted_at,deleted_at=NULL,enabled=false FROM workspace_components c
 WHERE c.id=m.app_id AND c.archived AND c.deleted_at IS NULL AND m.deleted_at IS NOT NULL AND m.deleted_at>=c.archived_at;
UPDATE app_actions a SET archived_with_app_at=a.deleted_at,deleted_at=NULL,paused=true,next_at=NULL FROM workspace_components c
 WHERE c.id=a.app_id AND c.archived AND c.deleted_at IS NULL AND a.deleted_at IS NOT NULL AND a.deleted_at>=c.archived_at;
ALTER TABLE app_monitors ENABLE TRIGGER monitor_deletion_permanent;
ALTER TABLE app_actions ENABLE TRIGGER action_deletion_permanent;
-- A suspended automation can never run until its app is restored and an owner re-enables it.
ALTER TABLE app_monitors ADD CONSTRAINT archived_monitor_disabled CHECK(archived_with_app_at IS NULL OR NOT enabled);
ALTER TABLE app_actions ADD CONSTRAINT archived_action_paused CHECK(archived_with_app_at IS NULL OR paused);
