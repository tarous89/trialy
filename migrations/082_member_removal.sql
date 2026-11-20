-- A11 (default D8): an organization owner removes a team member and inherits their apps.
-- The person loses membership, access and personal rules in every workspace of the organization in one
-- transaction. Their app Owner roles move to the owner who removes them, and their automations are
-- switched off with a reason. Nothing is deleted except access: history, runs and definitions stay.

-- Why an automation was switched off for its owner. app_actions already keeps this in last_error.
ALTER TABLE automations ADD COLUMN off_reason text;
ALTER TABLE foundation_schedules ADD COLUMN off_reason text;
ALTER TABLE app_monitors ADD COLUMN off_reason text;
ALTER TABLE automation_runners ADD COLUMN off_reason text;
-- The reason belongs to the switched-off state and goes when the automation is switched on again.
CREATE FUNCTION trialy_security.clear_off_reason() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$ BEGIN NEW.off_reason:=NULL; RETURN NEW; END $$;
CREATE TRIGGER automations_off_reason BEFORE UPDATE ON automations FOR EACH ROW WHEN (NEW.off_reason IS NOT NULL AND NOT NEW.paused) EXECUTE FUNCTION trialy_security.clear_off_reason();
CREATE TRIGGER foundation_schedules_off_reason BEFORE UPDATE ON foundation_schedules FOR EACH ROW WHEN (NEW.off_reason IS NOT NULL AND NOT NEW.paused) EXECUTE FUNCTION trialy_security.clear_off_reason();
CREATE TRIGGER app_monitors_off_reason BEFORE UPDATE ON app_monitors FOR EACH ROW WHEN (NEW.off_reason IS NOT NULL AND NEW.enabled) EXECUTE FUNCTION trialy_security.clear_off_reason();
CREATE TRIGGER automation_runners_off_reason BEFORE UPDATE ON automation_runners FOR EACH ROW WHEN (NEW.off_reason IS NOT NULL AND NEW.enabled) EXECUTE FUNCTION trialy_security.clear_off_reason();

-- Who may remove whom, and what the removal will change. Reads only; remove_member calls it before changing anything.
-- The acting person is a signed-in organization owner. The target is a member or guest who is not an owner.
CREATE FUNCTION trialy_security.member_removal(w uuid, target uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE who uuid:=trialy_security.actor_id(); tenant uuid; t record; spaces uuid[]; n jsonb;
BEGIN
 IF who IS NULL OR coalesce(current_setting('trialy.origin',true),'')<>'human' THEN RAISE EXCEPTION 'A signed-in organization owner must remove team members' USING ERRCODE='insufficient_privilege'; END IF;
 SELECT ws.tenant_id INTO tenant FROM workspaces ws JOIN memberships m ON m.tenant_id=ws.tenant_id AND m.user_id=who AND m.role='owner' WHERE ws.id=w;
 IF tenant IS NULL THEN RAISE EXCEPTION 'Only an organization owner can remove team members' USING ERRCODE='insufficient_privilege'; END IF;
 IF target=who THEN RAISE EXCEPTION 'You cannot remove yourself'; END IF;
 SELECT role,kind INTO t FROM memberships WHERE tenant_id=tenant AND user_id=target;
 IF NOT FOUND OR t.kind='public_link' THEN RAISE EXCEPTION 'This person is not in your organization'; END IF;
 IF t.role='owner' THEN RAISE EXCEPTION 'An owner cannot be removed. Make this person a member first'; END IF;
 SELECT coalesce(array_agg(id),'{}') INTO spaces FROM workspaces WHERE tenant_id=tenant;
 n:=jsonb_build_object(
  'records',(SELECT count(*) FROM automations WHERE owner_id=target AND workspace_id=ANY(spaces) AND NOT paused),
  'schedules',(SELECT count(*) FROM foundation_schedules WHERE user_id=target AND workspace_id=ANY(spaces) AND NOT paused),
  'research',(SELECT count(*) FROM app_monitors WHERE user_id=target AND workspace_id=ANY(spaces) AND enabled),
  -- An email step counts with the research automation it follows.
  'actions',(SELECT count(*) FROM app_actions WHERE user_id=target AND workspace_id=ANY(spaces) AND NOT paused AND follow_up_of IS NULL));
 RETURN jsonb_build_object(
  'workspaces',(SELECT count(*) FROM workspace_access WHERE user_id=target AND workspace_id=ANY(spaces)),
  'apps',(SELECT count(*) FROM app_members m JOIN workspace_components c ON c.id=m.app_id WHERE m.user_id=target AND m.role='owner' AND m.workspace_id=ANY(spaces) AND c.deleted_at IS NULL),
  'automations',(n->>'records')::int+(n->>'schedules')::int+(n->>'research')::int+(n->>'actions')::int,
  'automationKinds',n);
END $$;
REVOKE ALL ON FUNCTION trialy_security.member_removal(uuid,uuid) FROM PUBLIC;

-- Removes one person from the organization that owns workspace w. Returns what member_removal counted.
CREATE FUNCTION trialy_security.remove_member(w uuid, target uuid, reason text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE who uuid:=trialy_security.actor_id(); tenant uuid; spaces uuid[]; touched uuid[]; summary jsonb; why text;
BEGIN
 SELECT tenant_id INTO tenant FROM workspaces WHERE id=w;
 -- One removal at a time per organization: every workspace and both memberships are locked in a fixed order before the checks.
 SELECT coalesce(array_agg(id),'{}') INTO spaces FROM (SELECT id FROM workspaces WHERE tenant_id=tenant ORDER BY id FOR UPDATE) x;
 PERFORM 1 FROM memberships WHERE tenant_id=tenant AND user_id IN (who,target) ORDER BY user_id FOR UPDATE;
 summary:=trialy_security.member_removal(w,target);
 SELECT left(coalesce(nullif(btrim(reason),''),'Switched off because '||coalesce(nullif(btrim(name),''),'this person')||' left the organization.'),300) INTO why FROM users WHERE id=target;

 -- Access, personal rules and audience lists.
 WITH gone AS (DELETE FROM workspace_access WHERE user_id=target AND workspace_id=ANY(spaces) RETURNING workspace_id)
  SELECT coalesce(array_agg(workspace_id),'{}') INTO touched FROM gone;
 UPDATE workspaces ws SET permission_rules=(SELECT coalesce(jsonb_agg(r.x ORDER BY r.i),'[]') FROM jsonb_array_elements(ws.permission_rules) WITH ORDINALITY r(x,i) WHERE r.x->>'subject' IS DISTINCT FROM target::text),access_version=access_version+1
  WHERE ws.id=ANY(spaces) AND (ws.id=ANY(touched) OR EXISTS(SELECT 1 FROM jsonb_array_elements(ws.permission_rules) x WHERE x->>'subject'=target::text));
 PERFORM set_config('trialy.app_role_change','on',true);
 UPDATE workspace_components SET allowed_users=allowed_users-target::text WHERE workspace_id=ANY(spaces) AND deleted_at IS NULL AND allowed_users ? target::text;
 PERFORM set_config('trialy.app_role_change','',true);
 UPDATE workspace_nodes SET allowed_users=allowed_users-target::text WHERE workspace_id=ANY(spaces) AND allowed_users ? target::text;
 UPDATE folder_access SET allowed_users=allowed_users-target::text WHERE workspace_id=ANY(spaces) AND allowed_users ? target::text;
 UPDATE document_access SET allowed_users=allowed_users-target::text WHERE workspace_id=ANY(spaces) AND allowed_users ? target::text;

 -- D8: their app Owner roles move to the owner who removes them. Co-owners keep theirs.
 INSERT INTO app_members(workspace_id,app_id,user_id,role,granted_by) SELECT m.workspace_id,m.app_id,who,'owner',who FROM app_members m WHERE m.user_id=target AND m.role='owner' AND m.workspace_id=ANY(spaces)
  ON CONFLICT(app_id,user_id) DO UPDATE SET role='owner',granted_by=excluded.granted_by,granted_at=now() WHERE app_members.role<>'owner';
 DELETE FROM app_members WHERE user_id=target AND workspace_id=ANY(spaces);
 -- Links they shared belong to the apps and keep working under the new owner.
 UPDATE app_shares SET owner_id=who WHERE owner_id=target AND workspace_id=ANY(spaces) AND revoked_at IS NULL;
 -- An app invitation addressed to this person would let them straight back in.
 UPDATE app_shares s SET revoked_at=now() WHERE s.workspace_id=ANY(spaces) AND s.kind='email' AND s.revoked_at IS NULL
  AND (s.principal_id=target OR s.accepted_at IS NULL AND s.email=(SELECT lower(email) FROM users WHERE id=target));

 -- Nothing keeps running under a person who is gone. Definitions, history and grants stay for whoever sets them up again.
 WITH off AS (UPDATE automations SET paused=true,version=version+1,off_reason=why WHERE owner_id=target AND workspace_id=ANY(spaces) AND NOT paused RETURNING *)
  INSERT INTO revisions(id,workspace_id,object_id,object_kind,version,snapshot,actor_id) SELECT gen_random_uuid(),off.workspace_id,off.id,'automation',off.version,to_jsonb(off),who FROM off;
 UPDATE foundation_schedules SET paused=true,off_reason=why WHERE user_id=target AND workspace_id=ANY(spaces) AND NOT paused;
 UPDATE automation_occurrences SET status='cancelled',finished_at=now(),claim_token=NULL,lease_until=NULL WHERE user_id=target AND workspace_id=ANY(spaces) AND status IN ('queued','running');
 UPDATE app_monitor_runs SET status='cancelled',finished_at=now() WHERE user_id=target AND workspace_id=ANY(spaces) AND status='running';
 UPDATE app_monitors SET enabled=false,updated_at=now(),off_reason=why WHERE user_id=target AND workspace_id=ANY(spaces) AND enabled;
 UPDATE app_actions SET paused=true,last_error=why WHERE user_id=target AND workspace_id=ANY(spaces) AND NOT paused;
 UPDATE automation_runners SET enabled=false,version=version+1,off_reason=why WHERE user_id=target AND workspace_id=ANY(spaces) AND enabled;
 UPDATE automation_outbox SET status='cancelled',diagnostic='member_removed' WHERE user_id=target AND workspace_id=ANY(spaces) AND status='queued';
 UPDATE automation_recipe_setups SET status='cancelled',diagnostic='member_removed',revision=revision+1,updated_at=now() WHERE user_id=target AND workspace_id=ANY(spaces) AND status IN ('pending','needs_setup');

 DELETE FROM memberships WHERE tenant_id=tenant AND user_id=target;
 RETURN summary;
END $$;
REVOKE ALL ON FUNCTION trialy_security.remove_member(uuid,uuid,text) FROM PUBLIC;
