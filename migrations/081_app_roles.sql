-- R1–R5, A1, A5 (defaults D2–D4, D7): app roles, member kinds and several organization owners.
-- Access rules in workspaces.permission_rules stay the enforced substrate. This migration records who
-- owns each app, who granted what, and the role the team receives by default.

-- Member kinds: a guest arrived through an email share, a public_link principal through a public link.
ALTER TABLE memberships ADD COLUMN kind text NOT NULL DEFAULT 'member' CHECK(kind IN ('member','guest','public_link'));
UPDATE memberships m SET kind='public_link' FROM users u WHERE u.id=m.user_id AND u.subject LIKE 'public-app|%';
UPDATE memberships m SET kind='guest' WHERE m.kind='member' AND m.role<>'owner'
 AND EXISTS(SELECT 1 FROM workspace_access a JOIN workspaces w ON w.id=a.workspace_id WHERE w.tenant_id=m.tenant_id AND a.user_id=m.user_id)
 AND NOT EXISTS(SELECT 1 FROM workspace_access a JOIN workspaces w ON w.id=a.workspace_id WHERE w.tenant_id=m.tenant_id AND a.user_id=m.user_id AND a.direct_data);

CREATE FUNCTION trialy_security.sync_member_kind() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE tenant uuid;
BEGIN
 SELECT tenant_id INTO tenant FROM workspaces WHERE id=NEW.workspace_id;
 IF EXISTS(SELECT 1 FROM users WHERE id=NEW.user_id AND subject LIKE 'public-app|%') THEN
  UPDATE memberships SET kind='public_link' WHERE tenant_id=tenant AND user_id=NEW.user_id AND kind<>'public_link';
 ELSIF NEW.direct_data THEN
  UPDATE memberships SET kind='member' WHERE tenant_id=tenant AND user_id=NEW.user_id AND kind='guest';
 ELSE
  UPDATE memberships m SET kind='guest' WHERE m.tenant_id=tenant AND m.user_id=NEW.user_id AND m.kind='member' AND m.role<>'owner'
   AND NOT EXISTS(SELECT 1 FROM workspace_access a JOIN workspaces w ON w.id=a.workspace_id WHERE w.tenant_id=tenant AND a.user_id=NEW.user_id AND a.direct_data);
 END IF;
 RETURN NULL;
END $$;
CREATE TRIGGER workspace_access_member_kind AFTER INSERT OR UPDATE OF direct_data ON workspace_access FOR EACH ROW EXECUTE FUNCTION trialy_security.sync_member_kind();

-- R1: an organization may have several owners, never none.
CREATE FUNCTION trialy_security.keep_one_owner() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF OLD.role='owner' AND (TG_OP='DELETE' OR NEW.role<>'owner')
  AND EXISTS(SELECT 1 FROM memberships WHERE tenant_id=OLD.tenant_id AND user_id<>OLD.user_id)
  AND NOT EXISTS(SELECT 1 FROM memberships WHERE tenant_id=OLD.tenant_id AND user_id<>OLD.user_id AND role='owner') THEN
  RAISE EXCEPTION 'An organization needs at least one owner' USING ERRCODE='check_violation';
 END IF;
 RETURN coalesce(NEW,OLD);
END $$;
CREATE TRIGGER memberships_keep_one_owner BEFORE UPDATE OF role OR DELETE ON memberships FOR EACH ROW EXECUTE FUNCTION trialy_security.keep_one_owner();

-- A1: the role team members receive on an app when nobody set one for them.
ALTER TABLE workspace_components ADD COLUMN team_default_role text NOT NULL DEFAULT 'editor' CHECK(team_default_role IN ('editor','viewer','none'));

-- R3: app owners, and a record of who granted each role and when.
CREATE TABLE app_members (
 workspace_id uuid NOT NULL REFERENCES workspaces(id),
 app_id uuid NOT NULL REFERENCES workspace_components(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES users(id),
 role text NOT NULL CHECK(role IN ('owner','editor','viewer')),
 granted_by uuid REFERENCES users(id),
 granted_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(app_id,user_id)
);
CREATE INDEX app_members_user ON app_members(workspace_id,user_id);
ALTER TABLE app_members ENABLE ROW LEVEL SECURITY;
-- Read with the workspace. Every write goes through the functions below.
CREATE POLICY app_members_read ON app_members FOR SELECT USING(trialy_security.workspace_permission(workspace_id));

-- D3: the creator of an existing app becomes its owner when still a team member.
INSERT INTO app_members(workspace_id,app_id,user_id,role,granted_by,granted_at)
 SELECT c.workspace_id,c.id,c.created_by,'owner',c.created_by,c.created_at FROM workspace_components c JOIN workspaces w ON w.id=c.workspace_id
 JOIN memberships m ON m.tenant_id=w.tenant_id AND m.user_id=c.created_by AND m.kind='member' WHERE c.deleted_at IS NULL;

-- Whoever creates an app owns it.
CREATE FUNCTION trialy_security.claim_new_app() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 INSERT INTO app_members(workspace_id,app_id,user_id,role,granted_by)
  SELECT NEW.workspace_id,NEW.id,NEW.created_by,'owner',NEW.created_by FROM workspaces w JOIN memberships m ON m.tenant_id=w.tenant_id AND m.user_id=NEW.created_by AND m.kind='member' WHERE w.id=NEW.workspace_id
  ON CONFLICT DO NOTHING;
 RETURN NULL;
END $$;
CREATE TRIGGER workspace_components_claim AFTER INSERT ON workspace_components FOR EACH ROW EXECUTE FUNCTION trialy_security.claim_new_app();

-- The role one person holds on one app: owner, editor, viewer or NULL (no access).
-- Mirrors appRole in src/domain/app-roles.ts for human access; project and connection rules stay with the application.
CREATE FUNCTION trialy_security.app_role(app uuid, who uuid) RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE c record; m record; r jsonb; owns boolean; explicit boolean; can_write boolean;
BEGIN
 SELECT wc.workspace_id,wc.allowed_users,wc.team_default_role,ws.tenant_id,ws.permission_rules INTO c FROM workspace_components wc JOIN workspaces ws ON ws.id=wc.workspace_id WHERE wc.id=app AND wc.deleted_at IS NULL;
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT ms.role AS tenant_role,a.role,coalesce(a.direct_data,true) AS direct_data INTO m FROM memberships ms LEFT JOIN workspace_access a ON a.workspace_id=c.workspace_id AND a.user_id=ms.user_id WHERE ms.tenant_id=c.tenant_id AND ms.user_id=who;
 IF NOT FOUND THEN RETURN NULL; END IF;
 IF m.tenant_role='owner' OR m.role='owner' THEN RETURN 'owner'; END IF;
 IF m.role IS NULL THEN RETURN NULL; END IF;
 SELECT x INTO r FROM jsonb_array_elements(c.permission_rules) x WHERE x->>'subject'=who::text AND x->>'kind'='tool' AND x->>'resourceId'=app::text LIMIT 1;
 IF r->>'read'='deny' THEN RETURN NULL; END IF;
 IF c.allowed_users IS NOT NULL AND NOT c.allowed_users ? who::text THEN RETURN NULL; END IF;
 owns:=EXISTS(SELECT 1 FROM app_members WHERE app_id=app AND user_id=who AND role='owner');
 explicit:=owns OR coalesce(r->>'read','')='allow';
 IF NOT explicit AND (NOT m.direct_data OR c.team_default_role='none') THEN RETURN NULL; END IF;
 IF owns THEN RETURN 'owner'; END IF;
 can_write:=m.role<>'inspector' AND coalesce(r->>'write','')<>'deny' AND (coalesce(r->>'write','')='allow' OR (m.role='editor' AND m.direct_data AND (explicit OR c.team_default_role='editor')));
 RETURN CASE WHEN can_write THEN 'editor' ELSE 'viewer' END;
END $$;
REVOKE ALL ON FUNCTION trialy_security.app_role(uuid,uuid) FROM PUBLIC;

-- R3–R5, A5: grant, lower or remove one person's role on one app.
-- An owner may set any role. An editor may grant Editor or Viewer, a viewer may grant Viewer.
-- Lowering or removing a role, and undoing a removal, is for owners only.
-- The caller passes the compiled access rule; this function checks who may do what and applies it.
CREATE FUNCTION trialy_security.set_app_role(app uuid, target uuid, new_role text, new_rule jsonb) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE who uuid:=trialy_security.actor_id(); c record; t record; mine text; theirs text; old_rule jsonb;
 ranks text[]:=ARRAY['none','viewer','editor','owner']; want_read text; want_write text;
BEGIN
 IF who IS NULL OR coalesce(current_setting('trialy.origin',true),'')<>'human' THEN RAISE EXCEPTION 'A signed-in person must change app roles'; END IF;
 IF new_role IS NULL OR NOT new_role=ANY(ranks) THEN RAISE EXCEPTION 'Unknown app role'; END IF;
 SELECT wc.workspace_id,wc.allowed_users,ws.tenant_id,ws.archived,ws.permission_rules INTO c FROM workspace_components wc JOIN workspaces ws ON ws.id=wc.workspace_id WHERE wc.id=app AND wc.deleted_at IS NULL FOR UPDATE OF ws;
 IF NOT FOUND OR c.archived THEN RAISE EXCEPTION 'App unavailable'; END IF;
 IF target=who THEN RAISE EXCEPTION 'You cannot change your own role'; END IF;
 SELECT ms.role AS tenant_role,ms.kind,a.role INTO t FROM memberships ms LEFT JOIN workspace_access a ON a.workspace_id=c.workspace_id AND a.user_id=ms.user_id WHERE ms.tenant_id=c.tenant_id AND ms.user_id=target;
 IF NOT FOUND OR t.role IS NULL AND t.tenant_role<>'owner' THEN RAISE EXCEPTION 'Add this person to the team first'; END IF;
 IF t.tenant_role='owner' OR t.role='owner' THEN RAISE EXCEPTION 'Organization owners already own every app'; END IF;
 IF new_role='owner' AND t.kind<>'member' THEN RAISE EXCEPTION 'Only team members can own an app'; END IF;
 mine:=trialy_security.app_role(app,who);
 IF mine IS NULL THEN RAISE EXCEPTION 'App unavailable'; END IF;
 IF t.kind<>'member' AND mine<>'owner' THEN RAISE EXCEPTION 'Only an app owner can change a guest''s access'; END IF;
 theirs:=coalesce(trialy_security.app_role(app,target),'none');
 SELECT x INTO old_rule FROM jsonb_array_elements(c.permission_rules) x WHERE x->>'subject'=target::text AND x->>'kind'='tool' AND x->>'resourceId'=app::text LIMIT 1;
 IF mine<>'owner' THEN
  IF array_position(ranks,new_role)<array_position(ranks,theirs) OR old_rule->>'read'='deny' THEN RAISE EXCEPTION 'Only an app owner can lower or remove access'; END IF;
  IF array_position(ranks,new_role)>array_position(ranks,mine) THEN RAISE EXCEPTION 'You can grant roles up to your own'; END IF;
 END IF;
 want_read:=CASE WHEN new_role='none' THEN 'deny' ELSE 'allow' END;
 want_write:=CASE WHEN new_role IN ('editor','owner') THEN 'allow' ELSE 'deny' END;
 IF new_rule IS NULL OR new_rule->>'subject'<>target::text OR new_rule->>'kind'<>'tool' OR new_rule->>'resourceId'<>app::text OR new_rule->>'read'<>want_read OR new_rule->>'write'<>want_write
  OR EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(new_rule->'bindings','[]')) b WHERE b->>'toolId' IS DISTINCT FROM app::text) THEN RAISE EXCEPTION 'Invalid access rule'; END IF;
 UPDATE workspaces SET permission_rules=(SELECT coalesce(jsonb_agg(x),'[]') FROM jsonb_array_elements(permission_rules) x WHERE NOT(x->>'subject'=target::text AND x->>'kind'='tool' AND x->>'resourceId'=app::text))||jsonb_build_array(new_rule),access_version=access_version+1 WHERE id=c.workspace_id;
 IF new_role<>'none' AND c.allowed_users IS NOT NULL AND NOT c.allowed_users ? target::text THEN
  PERFORM set_config('trialy.app_role_change','on',true);
  UPDATE workspace_components SET allowed_users=allowed_users||to_jsonb(target::text) WHERE id=app;
  PERFORM set_config('trialy.app_role_change','',true);
 END IF;
 IF new_role='none' THEN DELETE FROM app_members WHERE app_id=app AND user_id=target;
 ELSE INSERT INTO app_members(workspace_id,app_id,user_id,role,granted_by) VALUES(c.workspace_id,app,target,new_role,who)
  ON CONFLICT(app_id,user_id) DO UPDATE SET role=excluded.role,granted_by=excluded.granted_by,granted_at=now();
 END IF;
 RETURN theirs;
END $$;
REVOKE ALL ON FUNCTION trialy_security.set_app_role(uuid,uuid,text,jsonb) FROM PUBLIC;

-- A3, R4: only an owner of the app changes its code, its team default or who may open it.
CREATE FUNCTION trialy_security.guard_app_admin() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE who uuid:=trialy_security.actor_id();
BEGIN
 IF who IS NULL OR trialy_security.worker() OR coalesce(current_setting('trialy.origin',true),'') NOT IN ('human','ai') OR coalesce(current_setting('trialy.app_role_change',true),'')='on' THEN RETURN NEW; END IF;
 IF (NEW.source IS DISTINCT FROM OLD.source OR NEW.team_default_role IS DISTINCT FROM OLD.team_default_role OR NEW.allowed_users IS DISTINCT FROM OLD.allowed_users)
  AND coalesce(trialy_security.app_role(OLD.id,who),'')<>'owner' THEN
  RAISE EXCEPTION 'Only an owner of this app can change it' USING ERRCODE='insufficient_privilege';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER workspace_components_admin BEFORE UPDATE OF source,team_default_role,allowed_users ON workspace_components FOR EACH ROW EXECUTE FUNCTION trialy_security.guard_app_admin();
