-- A4 (defaults D6, D11): two assistant permissions, Data and Apps, each Edit, View only or Blocked.
-- Set per assistant (ChatGPT and Claude separately) at two places: the organization maximum on the
-- workspace, and each person's own tighter limit. The level that applies is the lower of the two.
-- What the person themself may do keeps being decided by the existing access rules.
--
-- Mapping of the existing switches (nobody's assistant gains anything):
--   workspaces.ai_enabled = false            -> ChatGPT maximum: Data Blocked, Apps Blocked
--   workspaces.claude_enabled = false        -> Claude maximum:  Data Blocked, Apps Blocked
--   workspace_access.ai_enabled = false      -> that person's ChatGPT limit: Blocked, Blocked
--   workspace_access.claude_enabled = false  -> that person's Claude limit:  Blocked, Blocked
--   'connection' rule in workspaces.permission_rules with read 'deny'  -> Blocked, Blocked
--   'connection' rule in workspaces.permission_rules with write 'deny' -> View only, View only
--     a rule whose subject is 'chatgpt' or 'claude' sets that assistant's organization maximum;
--     a rule whose subject is a person sets that person's limit for the assistant the rule names
--     (field 'claude' means Claude, anything else ChatGPT, as in trialy_security.rule_applies).
--   Where several of these apply, the lowest level is kept.
-- The old switches and rules stay in place and stay enforced. The levels are an additional layer that
-- is as tight or tighter. Everything else (table rules, tables hidden from assistants, apps switched
-- off for assistants, fields closed to assistants) is untouched.

ALTER TABLE workspaces
 ADD COLUMN chatgpt_data_level text NOT NULL DEFAULT 'edit' CHECK(chatgpt_data_level IN ('edit','view','blocked')),
 ADD COLUMN chatgpt_apps_level text NOT NULL DEFAULT 'edit' CHECK(chatgpt_apps_level IN ('edit','view','blocked')),
 ADD COLUMN claude_data_level text NOT NULL DEFAULT 'edit' CHECK(claude_data_level IN ('edit','view','blocked')),
 ADD COLUMN claude_apps_level text NOT NULL DEFAULT 'edit' CHECK(claude_apps_level IN ('edit','view','blocked'));

-- A table, not columns on workspace_access: organization owners have no workspace_access row.
CREATE TABLE assistant_limits (
 workspace_id uuid NOT NULL REFERENCES workspaces(id),
 user_id uuid NOT NULL REFERENCES users(id),
 assistant text NOT NULL CHECK(assistant IN ('chatgpt','claude')),
 data_level text NOT NULL DEFAULT 'edit' CHECK(data_level IN ('edit','view','blocked')),
 apps_level text NOT NULL DEFAULT 'edit' CHECK(apps_level IN ('edit','view','blocked')),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(workspace_id,user_id,assistant)
);
ALTER TABLE assistant_limits ENABLE ROW LEVEL SECURITY;
-- A person reads their own limits; organization owners read everyone's (for the overview).
CREATE POLICY assistant_limits_read ON assistant_limits FOR SELECT USING(trialy_security.worker() OR (trialy_security.workspace_permission(workspace_id) AND (user_id=trialy_security.actor_id() OR trialy_security.workspace_owner(workspace_id))));
-- Only the person themself, signed in, writes their own limits. Nobody writes another person's.
CREATE POLICY assistant_limits_insert ON assistant_limits FOR INSERT WITH CHECK(user_id=trialy_security.actor_id() AND current_setting('trialy.origin',true)='human' AND trialy_security.workspace_permission(workspace_id));
CREATE POLICY assistant_limits_update ON assistant_limits FOR UPDATE USING(user_id=trialy_security.actor_id() AND current_setting('trialy.origin',true)='human' AND trialy_security.workspace_permission(workspace_id)) WITH CHECK(user_id=trialy_security.actor_id() AND current_setting('trialy.origin',true)='human' AND trialy_security.workspace_permission(workspace_id));

-- Changing a limit raises the workspace access version, so open apps check access again. A member who
-- may only view the workspace can still tighten their own assistant, hence a definer function.
CREATE FUNCTION trialy_security.assistant_limit_changed() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 UPDATE workspaces SET access_version=access_version+1 WHERE id=NEW.workspace_id;
 RETURN NULL;
END $$;
-- A person who leaves the organization (migration 082) takes no limits with them.
CREATE FUNCTION trialy_security.forget_assistant_limits() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 DELETE FROM assistant_limits l USING workspaces ws WHERE ws.id=l.workspace_id AND ws.tenant_id=OLD.tenant_id AND l.user_id=OLD.user_id;
 RETURN NULL;
END $$;
CREATE TRIGGER memberships_forget_assistant_limits AFTER DELETE ON memberships FOR EACH ROW EXECUTE FUNCTION trialy_security.forget_assistant_limits();

-- Backfill: organization maximum.
UPDATE workspaces SET chatgpt_data_level='blocked',chatgpt_apps_level='blocked' WHERE NOT ai_enabled;
UPDATE workspaces SET claude_data_level='blocked',claude_apps_level='blocked' WHERE NOT claude_enabled;
UPDATE workspaces w SET
 chatgpt_data_level=CASE WHEN w.chatgpt_data_level='blocked' OR x.rank=0 THEN 'blocked' ELSE 'view' END,
 chatgpt_apps_level=CASE WHEN w.chatgpt_apps_level='blocked' OR x.rank=0 THEN 'blocked' ELSE 'view' END
FROM (SELECT ws.id,min(CASE WHEN r->>'read'='deny' THEN 0 ELSE 1 END) AS rank FROM workspaces ws CROSS JOIN LATERAL jsonb_array_elements(ws.permission_rules) r
 WHERE r->>'kind'='connection' AND r->>'subject'='chatgpt' AND (r->>'read'='deny' OR r->>'write'='deny') GROUP BY ws.id) x WHERE x.id=w.id;
UPDATE workspaces w SET
 claude_data_level=CASE WHEN w.claude_data_level='blocked' OR x.rank=0 THEN 'blocked' ELSE 'view' END,
 claude_apps_level=CASE WHEN w.claude_apps_level='blocked' OR x.rank=0 THEN 'blocked' ELSE 'view' END
FROM (SELECT ws.id,min(CASE WHEN r->>'read'='deny' THEN 0 ELSE 1 END) AS rank FROM workspaces ws CROSS JOIN LATERAL jsonb_array_elements(ws.permission_rules) r
 WHERE r->>'kind'='connection' AND r->>'subject'='claude' AND (r->>'read'='deny' OR r->>'write'='deny') GROUP BY ws.id) x WHERE x.id=w.id;

-- Backfill: each person's limit, from their switches and from connection rules that name them.
INSERT INTO assistant_limits(workspace_id,user_id,assistant,data_level,apps_level)
SELECT s.workspace_id,s.user_id,s.assistant,(ARRAY['blocked','view'])[min(s.rank)+1],(ARRAY['blocked','view'])[min(s.rank)+1]
FROM (
 SELECT a.workspace_id,a.user_id,'chatgpt' AS assistant,0 AS rank FROM workspace_access a WHERE NOT a.ai_enabled
 UNION ALL SELECT a.workspace_id,a.user_id,'claude',0 FROM workspace_access a WHERE NOT a.claude_enabled
 UNION ALL SELECT w.id,u.id,CASE WHEN r->>'field'='claude' THEN 'claude' ELSE 'chatgpt' END,CASE WHEN r->>'read'='deny' THEN 0 ELSE 1 END
  FROM workspaces w CROSS JOIN LATERAL jsonb_array_elements(w.permission_rules) r JOIN users u ON u.id::text=r->>'subject'
  WHERE r->>'kind'='connection' AND (r->>'read'='deny' OR r->>'write'='deny')
) s GROUP BY s.workspace_id,s.user_id,s.assistant;

CREATE TRIGGER assistant_limits_changed AFTER INSERT OR UPDATE OF data_level,apps_level ON assistant_limits FOR EACH ROW EXECUTE FUNCTION trialy_security.assistant_limit_changed();

-- The level that applies to the acting person's assistant in one area ('data' or 'apps'):
-- the lower of the organization maximum and their own limit. 'edit' when no assistant is acting.
CREATE FUNCTION trialy_security.assistant_level(w uuid, area text) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog','public' AS $$
 SELECT CASE WHEN trialy_security.assistant() IS NULL THEN 'edit' ELSE coalesce((
  SELECT CASE WHEN 'blocked' IN (o.level,coalesce(l.level,'edit')) THEN 'blocked' WHEN 'view' IN (o.level,coalesce(l.level,'edit')) THEN 'view' ELSE 'edit' END
  FROM workspaces ws
  CROSS JOIN LATERAL (SELECT CASE WHEN area='apps' THEN CASE WHEN trialy_security.assistant()='claude' THEN ws.claude_apps_level ELSE ws.chatgpt_apps_level END
   ELSE CASE WHEN trialy_security.assistant()='claude' THEN ws.claude_data_level ELSE ws.chatgpt_data_level END END AS level) o
  LEFT JOIN LATERAL (SELECT CASE WHEN area='apps' THEN al.apps_level ELSE al.data_level END AS level FROM assistant_limits al
   WHERE al.workspace_id=ws.id AND al.user_id=trialy_security.actor_id() AND al.assistant=trialy_security.assistant()) l ON true
  WHERE ws.id=w),'blocked') END
$$;

-- Records are the Data area. An assistant reads them unless Data is Blocked and changes them only with Data = Edit.
-- Restrictive: these never open anything the existing record policies refuse.
CREATE FUNCTION trialy_security.assistant_data(w uuid, writing boolean DEFAULT false) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog','public' AS $$
DECLARE level text;
BEGIN
 IF trialy_security.assistant() IS NULL OR trialy_security.worker() THEN RETURN true; END IF;
 level:=trialy_security.assistant_level(w,'data');
 RETURN level='edit' OR (level='view' AND NOT writing);
END $$;
CREATE POLICY assistant_data_read ON records AS RESTRICTIVE FOR SELECT USING(current_setting('trialy.origin',true) IS DISTINCT FROM 'ai' OR trialy_security.assistant_data(workspace_id));
CREATE POLICY assistant_data_insert ON records AS RESTRICTIVE FOR INSERT WITH CHECK(current_setting('trialy.origin',true) IS DISTINCT FROM 'ai' OR trialy_security.assistant_data(workspace_id,true));
CREATE POLICY assistant_data_update ON records AS RESTRICTIVE FOR UPDATE USING(current_setting('trialy.origin',true) IS DISTINCT FROM 'ai' OR trialy_security.assistant_data(workspace_id)) WITH CHECK(current_setting('trialy.origin',true) IS DISTINCT FROM 'ai' OR trialy_security.assistant_data(workspace_id,true));
CREATE POLICY assistant_data_delete ON records AS RESTRICTIVE FOR DELETE USING(current_setting('trialy.origin',true) IS DISTINCT FROM 'ai' OR trialy_security.assistant_data(workspace_id,true));

-- The organization maximum is set by organization owners, signed in as themselves.
CREATE FUNCTION trialy_security.guard_assistant_maximum() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE who uuid:=trialy_security.actor_id();
BEGIN
 IF who IS NULL OR trialy_security.worker() THEN RETURN NEW; END IF;
 IF coalesce(current_setting('trialy.origin',true),'')<>'human' OR NOT EXISTS(SELECT 1 FROM memberships WHERE tenant_id=NEW.tenant_id AND user_id=who AND role='owner') THEN
  RAISE EXCEPTION 'Only an organization owner can change what assistants may do' USING ERRCODE='insufficient_privilege';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER workspaces_assistant_maximum BEFORE UPDATE OF chatgpt_data_level,chatgpt_apps_level,claude_data_level,claude_apps_level ON workspaces FOR EACH ROW
 WHEN (OLD.chatgpt_data_level IS DISTINCT FROM NEW.chatgpt_data_level OR OLD.chatgpt_apps_level IS DISTINCT FROM NEW.chatgpt_apps_level OR OLD.claude_data_level IS DISTINCT FROM NEW.claude_data_level OR OLD.claude_apps_level IS DISTINCT FROM NEW.claude_apps_level)
 EXECUTE FUNCTION trialy_security.guard_assistant_maximum();

-- Workspace access for an assistant, as in migration 057, plus one rule: an assistant that is Blocked
-- for both Data and Apps has nothing left in the workspace. A single Blocked or View only area cannot be
-- decided here, because this function also guards app drafts and other rows that are not record data;
-- records carry their own policies above, and the application decides the rest.
CREATE OR REPLACE FUNCTION trialy_security.workspace_permission(w uuid, writing boolean DEFAULT false)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE p record; who uuid:=trialy_security.actor_id(); origin text:=current_setting('trialy.origin',true); tool uuid:=nullif(current_setting('trialy.tool_id',true),'')::uuid;
BEGIN
 IF trialy_security.worker() THEN RETURN true; END IF;
 IF who IS NULL OR origin NOT IN ('human','ai') THEN RETURN false; END IF;
 SELECT ws.archived,ws.ai_enabled,ws.claude_enabled,ws.permission_rules,m.role AS tenant_role,a.role,a.ai_enabled AS user_ai,a.claude_enabled AS user_claude,
  CASE WHEN trialy_security.assistant()='claude' THEN ws.claude_data_level ELSE ws.chatgpt_data_level END AS data_level,CASE WHEN trialy_security.assistant()='claude' THEN ws.claude_apps_level ELSE ws.chatgpt_apps_level END AS apps_level,l.data_level AS own_data,l.apps_level AS own_apps
  INTO p FROM workspaces ws JOIN memberships m ON m.tenant_id=ws.tenant_id AND m.user_id=who LEFT JOIN workspace_access a ON a.workspace_id=ws.id AND a.user_id=who
  LEFT JOIN assistant_limits l ON l.workspace_id=ws.id AND l.user_id=who AND l.assistant=trialy_security.assistant() WHERE ws.id=w;
 IF NOT FOUND OR (p.tenant_role<>'owner' AND p.role IS NULL) THEN RETURN false; END IF;
 IF origin='ai' AND trialy_security.assistant()='claude' AND (NOT p.claude_enabled OR (p.tenant_role<>'owner' AND NOT coalesce(p.user_claude,false))) THEN RETURN false; END IF;
 IF origin='ai' AND trialy_security.assistant()='chatgpt' AND (NOT p.ai_enabled OR (p.tenant_role<>'owner' AND NOT coalesce(p.user_ai,false))) THEN RETURN false; END IF;
 IF origin='ai' AND 'blocked' IN (p.data_level,coalesce(p.own_data,'edit')) AND 'blocked' IN (p.apps_level,coalesce(p.own_apps,'edit')) THEN RETURN false; END IF;
 IF writing AND p.archived THEN RETURN false; END IF;
 IF writing AND p.tenant_role<>'owner' AND p.role NOT IN ('owner','editor') THEN
  IF p.role='inspector' OR tool IS NULL OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p.permission_rules) r CROSS JOIN LATERAL jsonb_array_elements(coalesce(r->'bindings','[]')) b WHERE r->>'subject'=who::text AND r->>'write'='allow' AND b->>'toolId'=tool::text) THEN RETURN false; END IF;
 END IF;
 RETURN true;
END $function$;
