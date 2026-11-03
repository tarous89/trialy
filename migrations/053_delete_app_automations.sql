-- Keep historical receipts while permanently removing app-owned definitions.
ALTER TABLE app_monitors ADD COLUMN deleted_at timestamptz;
ALTER TABLE app_actions ADD COLUMN deleted_at timestamptz;
ALTER TABLE app_monitors ADD CONSTRAINT deleted_monitor_disabled CHECK(deleted_at IS NULL OR NOT enabled);
ALTER TABLE app_actions ADD CONSTRAINT deleted_action_paused CHECK(deleted_at IS NULL OR paused);
CREATE FUNCTION preserve_automation_deletion() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF OLD.deleted_at IS NOT NULL THEN NEW.deleted_at=OLD.deleted_at; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER monitor_deletion_permanent BEFORE UPDATE ON app_monitors FOR EACH ROW EXECUTE FUNCTION preserve_automation_deletion();
CREATE TRIGGER action_deletion_permanent BEFORE UPDATE ON app_actions FOR EACH ROW EXECUTE FUNCTION preserve_automation_deletion();

-- The app update is authorized by existing RLS. Cleanup must cover every owner,
-- including definitions not visible to the person deleting the app.
CREATE OR REPLACE FUNCTION suspend_archived_app_automations() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$ BEGIN
 IF NEW.archived THEN
  UPDATE app_monitors SET enabled=false,deleted_at=coalesce(deleted_at,now()),updated_at=now() WHERE app_id=NEW.id AND workspace_id=NEW.workspace_id;
  UPDATE app_actions SET paused=true,deleted_at=coalesce(deleted_at,now()),next_at=NULL WHERE app_id=NEW.id AND workspace_id=NEW.workspace_id;
  DELETE FROM automation_dispatch WHERE monitor_id IN (SELECT id FROM app_monitors WHERE app_id=NEW.id);
  UPDATE automation_occurrences SET status='cancelled',finished_at=now(),claim_token=NULL,lease_until=NULL
   WHERE monitor_id IN (SELECT id FROM app_monitors WHERE app_id=NEW.id) AND status IN ('queued','running');
  UPDATE app_monitor_runs SET status='cancelled',finished_at=now() WHERE monitor_id IN (SELECT id FROM app_monitors WHERE app_id=NEW.id) AND status='running';
  UPDATE app_action_runs SET status='cancelled',finished_at=now(),lease_token=NULL,lease_until=NULL,diagnostic='app_deleted'
   WHERE action_id IN (SELECT id FROM app_actions WHERE app_id=NEW.id) AND status IN ('queued','waiting','running');
  UPDATE app_service_jobs SET status='cancelled',finished_at=now(),lease_token=NULL,lease_until=NULL,diagnostic='app_deleted'
   WHERE app_id=NEW.id AND status='queued';
  UPDATE app_notification_batches SET status='cancelled',finished_at=now(),diagnostic='app_deleted' WHERE app_id=NEW.id AND status IN ('collecting','sending');
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION suspend_archived_app_automations() FROM PUBLIC;
-- Apply the same deletion semantics to apps already removed from the platform.
UPDATE workspace_components SET archived=true WHERE archived;
DROP INDEX app_actions_authoring_key;
CREATE UNIQUE INDEX app_actions_authoring_key ON app_actions(workspace_id,user_id,app_id,(config->>'authoringKey')) WHERE config ? 'authoringKey' AND deleted_at IS NULL;
