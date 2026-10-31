CREATE UNIQUE INDEX app_actions_authoring_key ON app_actions(workspace_id,user_id,app_id,(config->>'authoringKey')) WHERE config ? 'authoringKey';
CREATE INDEX app_monitors_owner_list ON app_monitors(workspace_id,user_id,created_at,id);
CREATE INDEX app_actions_owner_list ON app_actions(workspace_id,user_id,created_at,id);

-- Archive is the only app-write path touching automation state. Normal renders,
-- edits and publication never depend on the optional automation engine.
CREATE FUNCTION suspend_archived_app_automations() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.archived AND NOT OLD.archived THEN
  UPDATE app_monitors SET enabled=false,updated_at=now() WHERE app_id=NEW.id AND enabled;
  UPDATE app_actions SET paused=true WHERE app_id=NEW.id AND NOT paused;
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER archive_app_automations AFTER UPDATE OF archived ON workspace_components
 FOR EACH ROW EXECUTE FUNCTION suspend_archived_app_automations();

CREATE FUNCTION suspend_archived_project_automations() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE apps uuid[];
BEGIN
 IF NEW.archived AND NOT OLD.archived THEN
  WITH RECURSIVE nodes AS (
   SELECT id FROM workspace_nodes WHERE id=NEW.id AND workspace_id=NEW.workspace_id
   UNION ALL SELECT n.id FROM workspace_nodes n JOIN nodes p ON n.parent_id=p.id WHERE n.workspace_id=NEW.workspace_id
  ) SELECT array_agg(id) INTO apps FROM workspace_components WHERE workspace_id=NEW.workspace_id AND project_id IN (SELECT id FROM nodes);
  UPDATE app_monitors SET enabled=false,updated_at=now() WHERE app_id=ANY(apps) AND enabled;
  UPDATE app_actions SET paused=true WHERE app_id=ANY(apps) AND NOT paused;
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER archive_project_automations AFTER UPDATE OF archived ON workspace_nodes
 FOR EACH ROW EXECUTE FUNCTION suspend_archived_project_automations();
