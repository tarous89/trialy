-- Existing grants remain valid. New accounts/connections inherit permitted access.
ALTER TABLE workspaces ADD COLUMN permission_rules jsonb NOT NULL DEFAULT '[]';
ALTER TABLE workspace_access ADD COLUMN database_browse boolean NOT NULL DEFAULT true;
ALTER TABLE workspace_access ADD COLUMN direct_data boolean NOT NULL DEFAULT true;
ALTER TABLE workspaces ALTER COLUMN ai_enabled SET DEFAULT true;
ALTER TABLE workspace_access ALTER COLUMN ai_enabled SET DEFAULT true;
-- Only repair the old creation default where no deliberate AI decision was recorded.
UPDATE workspaces w SET ai_enabled=true WHERE NOT ai_enabled
 AND EXISTS(SELECT 1 FROM audit_events e WHERE e.workspace_id=w.id AND e.action='workspace.created')
 AND NOT EXISTS(SELECT 1 FROM audit_events e WHERE e.workspace_id=w.id AND e.action IN ('workspace.ai_access','access.policy_changed'));

ALTER TABLE document_versions ALTER COLUMN ai_enabled SET DEFAULT true;

-- The runtime never receives database credentials in generated code. RLS remains
-- a tenant/table boundary; server policy further restricts columns and record scope.
CREATE OR REPLACE FUNCTION trialy_security.workspace_permission(w uuid,writing boolean DEFAULT false) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE p record; who uuid:=trialy_security.actor_id(); origin text:=current_setting('trialy.origin',true); tool uuid:=nullif(current_setting('trialy.tool_id',true),'')::uuid;
BEGIN
 IF trialy_security.worker() THEN RETURN true; END IF;
 IF who IS NULL OR origin NOT IN ('human','ai') THEN RETURN false; END IF;
 SELECT ws.archived,ws.ai_enabled,ws.permission_rules,m.role AS tenant_role,a.role,a.ai_enabled AS user_ai INTO p FROM workspaces ws JOIN memberships m ON m.tenant_id=ws.tenant_id AND m.user_id=who LEFT JOIN workspace_access a ON a.workspace_id=ws.id AND a.user_id=who WHERE ws.id=w;
 IF NOT FOUND OR (p.tenant_role<>'owner' AND p.role IS NULL) THEN RETURN false; END IF;
 IF origin='ai' AND (NOT p.ai_enabled OR (p.tenant_role<>'owner' AND NOT coalesce(p.user_ai,false))) THEN RETURN false; END IF;
 IF writing AND p.archived THEN RETURN false; END IF;
 IF writing AND p.tenant_role<>'owner' AND p.role NOT IN ('owner','editor') THEN
  IF p.role='inspector' OR tool IS NULL OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p.permission_rules) r CROSS JOIN LATERAL jsonb_array_elements(coalesce(r->'bindings','[]')) b WHERE r->>'subject'=who::text AND r->>'write'='allow' AND b->>'toolId'=tool::text) THEN RETURN false; END IF;
 END IF;
 RETURN true;
END $$;
CREATE OR REPLACE FUNCTION trialy_security.table_permission(w uuid,t uuid,writing boolean DEFAULT false) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE p record; tool uuid:=nullif(current_setting('trialy.tool_id',true),'')::uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM entity_types WHERE id=t AND workspace_id=w) THEN RETURN false; END IF;
 IF trialy_security.worker() THEN RETURN true; END IF;
 IF trialy_security.workspace_permission(w,writing) THEN
  SELECT m.role AS tenant_role,a.allowed_types,a.direct_data,ws.ai_hidden_types,ws.permission_rules INTO p FROM workspaces ws JOIN memberships m ON m.tenant_id=ws.tenant_id AND m.user_id=trialy_security.actor_id() LEFT JOIN workspace_access a ON a.workspace_id=ws.id AND a.user_id=m.user_id WHERE ws.id=w;
  IF current_setting('trialy.origin',true)='ai' AND p.ai_hidden_types ? t::text THEN RETURN false; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p.permission_rules) r WHERE (r->>'subject'=trialy_security.actor_id()::text OR (current_setting('trialy.origin',true)='ai' AND r->>'subject'='chatgpt')) AND r->>'kind'='table' AND r->>'resourceId'=t::text AND (r->>'read'='deny' OR (writing AND r->>'write'='deny'))) THEN RETURN false; END IF;
  IF p.tenant_role='owner' OR (p.direct_data AND (p.allowed_types IS NULL OR p.allowed_types ? t::text)) THEN RETURN true; END IF;
  RETURN EXISTS(SELECT 1 FROM jsonb_array_elements(p.permission_rules) r WHERE r->>'subject'=trialy_security.actor_id()::text AND r->>'read'='allow' AND (NOT writing OR r->>'write'='allow') AND ((r->>'kind' IN ('table','column') AND r->>'resourceId'=t::text) OR (tool IS NOT NULL AND EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(r->'bindings','[]')) b WHERE b->>'toolId'=tool::text AND b->>'typeId'=t::text))));
 END IF;
 IF writing THEN RETURN false; END IF;
 RETURN EXISTS(SELECT 1 FROM external_links l JOIN workspaces ws ON ws.id=l.workspace_id JOIN memberships m ON m.tenant_id=ws.tenant_id AND m.user_id=l.owner_id AND m.role='owner' WHERE l.token_hash=nullif(current_setting('trialy.public_link',true),'') AND l.workspace_id=w AND l.type_id=t AND l.kind='view' AND l.revoked_at IS NULL AND l.expires_at>now() AND NOT ws.archived);
END $$;
DROP POLICY invitation_recipient ON workspace_access;
CREATE POLICY invitation_recipient ON workspace_access AS RESTRICTIVE FOR INSERT WITH CHECK (trialy_security.workspace_permission(workspace_id,true) OR (user_id=trialy_security.actor_id() AND ai_enabled=(role<>'inspector') AND EXISTS(SELECT 1 FROM workspace_invitations i WHERE i.workspace_id=workspace_access.workspace_id AND i.token_hash=nullif(current_setting('trialy.invitation',true),'') AND i.role=workspace_access.role AND i.allowed_types=workspace_access.allowed_types)));
