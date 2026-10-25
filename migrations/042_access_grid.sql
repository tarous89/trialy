-- Database-wide rules constrain every connected tool and direct table access.
CREATE OR REPLACE FUNCTION trialy_security.table_permission(w uuid,t uuid,writing boolean DEFAULT false) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE p record; tool uuid:=nullif(current_setting('trialy.tool_id',true),'')::uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM entity_types WHERE id=t AND workspace_id=w) THEN RETURN false; END IF;
 IF trialy_security.worker() THEN RETURN true; END IF;
 IF trialy_security.workspace_permission(w,writing) THEN
  SELECT m.role AS tenant_role,a.allowed_types,a.direct_data,ws.ai_hidden_types,ws.permission_rules INTO p FROM workspaces ws JOIN memberships m ON m.tenant_id=ws.tenant_id AND m.user_id=trialy_security.actor_id() LEFT JOIN workspace_access a ON a.workspace_id=ws.id AND a.user_id=m.user_id WHERE ws.id=w;
  IF current_setting('trialy.origin',true)='ai' AND p.ai_hidden_types ? t::text THEN RETURN false; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p.permission_rules) r WHERE (r->>'subject'=trialy_security.actor_id()::text OR (current_setting('trialy.origin',true)='ai' AND r->>'subject'='chatgpt')) AND (r->>'kind'='database' OR (r->>'kind'='connection' AND current_setting('trialy.origin',true)='ai') OR (r->>'kind'='table' AND r->>'resourceId'=t::text)) AND (r->>'read'='deny' OR (writing AND r->>'write'='deny'))) THEN RETURN false; END IF;
  IF p.tenant_role='owner' OR (p.direct_data AND (p.allowed_types IS NULL OR p.allowed_types ? t::text)) THEN RETURN true; END IF;
  RETURN EXISTS(SELECT 1 FROM jsonb_array_elements(p.permission_rules) r WHERE r->>'subject'=trialy_security.actor_id()::text AND r->>'read'='allow' AND (NOT writing OR r->>'write'='allow') AND ((r->>'kind'='database' OR (r->>'kind' IN ('table','column') AND r->>'resourceId'=t::text)) OR (tool IS NOT NULL AND EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(r->'bindings','[]')) b WHERE b->>'toolId'=tool::text AND b->>'typeId'=t::text))));
 END IF;
 IF writing THEN RETURN false; END IF;
 RETURN EXISTS(SELECT 1 FROM external_links l JOIN workspaces ws ON ws.id=l.workspace_id JOIN memberships m ON m.tenant_id=ws.tenant_id AND m.user_id=l.owner_id AND m.role='owner' WHERE l.token_hash=nullif(current_setting('trialy.public_link',true),'') AND l.workspace_id=w AND l.type_id=t AND l.kind='view' AND l.revoked_at IS NULL AND l.expires_at>now() AND NOT ws.archived);
END $$;
