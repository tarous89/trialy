-- Claude becomes a separate AI access principal next to ChatGPT.
-- ChatGPT behaviour is unchanged: tokens, flags and rules without an assistant
-- marker keep resolving to ChatGPT exactly as before.

-- 1. Tokens are bound to the endpoint (assistant) they were issued for.
ALTER TABLE oauth_tokens ADD COLUMN resource text;
ALTER TABLE oauth_tokens ADD COLUMN assistant text NOT NULL DEFAULT 'chatgpt';
ALTER TABLE oauth_tokens ADD CONSTRAINT oauth_tokens_assistant CHECK (assistant IN ('chatgpt','claude'));

-- 2. Separate on/off switches. Existing values copy the current AI switch,
--    which the interface already described as "ChatGPT or Claude".
ALTER TABLE workspaces ADD COLUMN claude_enabled boolean;
UPDATE workspaces SET claude_enabled=ai_enabled;
ALTER TABLE workspaces ALTER COLUMN claude_enabled SET NOT NULL;

ALTER TABLE workspace_access ADD COLUMN claude_enabled boolean;
UPDATE workspace_access SET claude_enabled=ai_enabled AND role<>'inspector';
ALTER TABLE workspace_access ALTER COLUMN claude_enabled SET NOT NULL;

-- Inserts that do not mention Claude (account creation, invitations, shares)
-- inherit the AI switch they set; inspectors are always human-only.
CREATE FUNCTION trialy_security.default_claude_access() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'pg_catalog','public' AS $$
BEGIN
 IF NEW.claude_enabled IS NULL THEN NEW.claude_enabled:=NEW.ai_enabled; END IF;
 IF TG_TABLE_NAME='workspace_access' THEN
  IF NEW.role='inspector' THEN NEW.claude_enabled:=false; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER workspaces_default_claude BEFORE INSERT ON workspaces FOR EACH ROW EXECUTE FUNCTION trialy_security.default_claude_access();
CREATE TRIGGER workspace_access_default_claude BEFORE INSERT OR UPDATE OF role,claude_enabled ON workspace_access FOR EACH ROW EXECUTE FUNCTION trialy_security.default_claude_access();

-- 3. Copy existing ChatGPT restrictions to Claude once, so nothing that was
--    restricted for AI becomes reachable through the new connection.
--    Connection-level rules for a person are marked with field "claude".
UPDATE workspaces w SET permission_rules=w.permission_rules||copies.rules
FROM (
 SELECT ws.id,jsonb_agg(CASE WHEN r->>'subject'='chatgpt' THEN jsonb_set(r,'{subject}','"claude"') ELSE r||'{"field":"claude"}' END) AS rules
 FROM workspaces ws CROSS JOIN LATERAL jsonb_array_elements(ws.permission_rules) r
 WHERE r->>'subject'='chatgpt' OR (r->>'kind'='connection' AND r->>'subject'<>'claude' AND r->>'field' IS NULL)
 GROUP BY ws.id
) copies
WHERE w.id=copies.id;

-- 4. Policy helpers. Unset assistant means ChatGPT (existing sessions/tests).
CREATE FUNCTION trialy_security.assistant() RETURNS text
LANGUAGE sql STABLE SET search_path TO 'pg_catalog','public' AS $$
 SELECT CASE WHEN current_setting('trialy.origin',true)='ai'
  THEN CASE WHEN current_setting('trialy.assistant',true)='claude' THEN 'claude' ELSE 'chatgpt' END END
$$;

-- A connection rule belongs to the assistant named as its subject, otherwise to
-- the assistant in its field; unmarked person rules are ChatGPT rules.
CREATE FUNCTION trialy_security.rule_applies(r jsonb) RETURNS boolean
LANGUAGE sql STABLE SET search_path TO 'pg_catalog','public' AS $$
 SELECT (r->>'subject'=trialy_security.actor_id()::text OR (trialy_security.assistant() IS NOT NULL AND r->>'subject'=trialy_security.assistant()))
  AND (r->>'kind'<>'connection' OR (trialy_security.assistant() IS NOT NULL AND
   CASE WHEN r->>'subject' IN ('chatgpt','claude') THEN r->>'subject' WHEN r->>'field'='claude' THEN 'claude' ELSE 'chatgpt' END=trialy_security.assistant()))
$$;

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
 SELECT ws.archived,ws.ai_enabled,ws.claude_enabled,ws.permission_rules,m.role AS tenant_role,a.role,a.ai_enabled AS user_ai,a.claude_enabled AS user_claude INTO p FROM workspaces ws JOIN memberships m ON m.tenant_id=ws.tenant_id AND m.user_id=who LEFT JOIN workspace_access a ON a.workspace_id=ws.id AND a.user_id=who WHERE ws.id=w;
 IF NOT FOUND OR (p.tenant_role<>'owner' AND p.role IS NULL) THEN RETURN false; END IF;
 IF origin='ai' AND trialy_security.assistant()='claude' AND (NOT p.claude_enabled OR (p.tenant_role<>'owner' AND NOT coalesce(p.user_claude,false))) THEN RETURN false; END IF;
 IF origin='ai' AND trialy_security.assistant()='chatgpt' AND (NOT p.ai_enabled OR (p.tenant_role<>'owner' AND NOT coalesce(p.user_ai,false))) THEN RETURN false; END IF;
 IF writing AND p.archived THEN RETURN false; END IF;
 IF writing AND p.tenant_role<>'owner' AND p.role NOT IN ('owner','editor') THEN
  IF p.role='inspector' OR tool IS NULL OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p.permission_rules) r CROSS JOIN LATERAL jsonb_array_elements(coalesce(r->'bindings','[]')) b WHERE r->>'subject'=who::text AND r->>'write'='allow' AND b->>'toolId'=tool::text) THEN RETURN false; END IF;
 END IF;
 RETURN true;
END $function$;

CREATE OR REPLACE FUNCTION trialy_security.table_permission(w uuid, t uuid, writing boolean DEFAULT false)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE p record; tool uuid:=nullif(current_setting('trialy.tool_id',true),'')::uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM entity_types WHERE id=t AND workspace_id=w) THEN RETURN false; END IF;
 IF trialy_security.worker() THEN RETURN true; END IF;
 IF trialy_security.workspace_permission(w,writing) THEN
  SELECT m.role AS tenant_role,a.allowed_types,a.direct_data,ws.ai_hidden_types,ws.permission_rules INTO p FROM workspaces ws JOIN memberships m ON m.tenant_id=ws.tenant_id AND m.user_id=trialy_security.actor_id() LEFT JOIN workspace_access a ON a.workspace_id=ws.id AND a.user_id=m.user_id WHERE ws.id=w;
  IF current_setting('trialy.origin',true)='ai' AND p.ai_hidden_types ? t::text THEN RETURN false; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p.permission_rules) r WHERE trialy_security.rule_applies(r) AND (r->>'kind' IN ('database','connection') OR (r->>'kind'='table' AND r->>'resourceId'=t::text)) AND (r->>'read'='deny' OR (writing AND r->>'write'='deny'))) THEN RETURN false; END IF;
  IF p.tenant_role='owner' OR (p.direct_data AND (p.allowed_types IS NULL OR p.allowed_types ? t::text)) THEN RETURN true; END IF;
  RETURN EXISTS(SELECT 1 FROM jsonb_array_elements(p.permission_rules) r WHERE r->>'subject'=trialy_security.actor_id()::text AND r->>'read'='allow' AND (NOT writing OR r->>'write'='allow') AND ((r->>'kind'='database' OR (r->>'kind' IN ('table','column') AND r->>'resourceId'=t::text)) OR (tool IS NOT NULL AND EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(r->'bindings','[]')) b WHERE b->>'toolId'=tool::text AND b->>'typeId'=t::text))));
 END IF;
 IF writing THEN RETURN false; END IF;
 RETURN EXISTS(SELECT 1 FROM external_links l JOIN workspaces ws ON ws.id=l.workspace_id JOIN memberships m ON m.tenant_id=ws.tenant_id AND m.user_id=l.owner_id AND m.role='owner' WHERE l.token_hash=nullif(current_setting('trialy.public_link',true),'') AND l.workspace_id=w AND l.type_id=t AND l.kind='view' AND l.revoked_at IS NULL AND l.expires_at>now() AND NOT ws.archived);
END $function$;
