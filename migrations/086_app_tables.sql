-- A2: a table added for an app follows each person's role on that app.
-- No role on the app: the table is blocked. Viewer: read only. Editor or Owner: whatever the person's own table
-- access allows. The rule only narrows; it never opens a table an organization owner restricted for someone.
-- Tables that belong to no app keep today's access (D5). Ownership of every table stays with organization owners.
ALTER TABLE entity_types ADD COLUMN origin_app_id uuid REFERENCES workspace_components(id) ON DELETE SET NULL;
CREATE INDEX entity_types_origin_app ON entity_types(origin_app_id) WHERE origin_app_id IS NOT NULL;

-- When the app is deleted its tables remain, as ordinary tables of the organization.
CREATE FUNCTION trialy_security.release_app_tables() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN UPDATE entity_types SET origin_app_id=NULL WHERE origin_app_id=NEW.id; END IF;
 RETURN NULL;
END $$;
CREATE TRIGGER workspace_components_release_tables AFTER UPDATE OF deleted_at ON workspace_components FOR EACH ROW EXECUTE FUNCTION trialy_security.release_app_tables();

-- Only whoever may administer the app decides which tables belong to it; nobody attaches a table to an app they do not own.
CREATE FUNCTION trialy_security.guard_table_origin() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE who uuid:=trialy_security.actor_id();
BEGIN
 IF NEW.origin_app_id IS NOT DISTINCT FROM OLD.origin_app_id OR who IS NULL OR trialy_security.worker() OR coalesce(current_setting('trialy.origin',true),'') NOT IN ('human','ai') THEN RETURN NEW; END IF;
 IF NEW.origin_app_id IS NOT NULL AND (OLD.origin_app_id IS NOT NULL OR coalesce(trialy_security.app_role(NEW.origin_app_id,who),'')<>'owner'
  OR NOT EXISTS(SELECT 1 FROM workspace_components c WHERE c.id=NEW.origin_app_id AND c.workspace_id=NEW.workspace_id)) THEN
  RAISE EXCEPTION 'Only an owner of the app can add a table to it' USING ERRCODE='insufficient_privilege';
 END IF;
 IF NEW.origin_app_id IS NULL AND NOT EXISTS(SELECT 1 FROM workspaces w JOIN memberships m ON m.tenant_id=w.tenant_id AND m.user_id=who AND m.role='owner' WHERE w.id=NEW.workspace_id) THEN
  RAISE EXCEPTION 'Only an organization owner can detach a table from its app' USING ERRCODE='insufficient_privilege';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER entity_types_origin_guard BEFORE UPDATE OF origin_app_id ON entity_types FOR EACH ROW EXECUTE FUNCTION trialy_security.guard_table_origin();

-- The table permission check, as last defined in migration 057, plus the app-table rule.
CREATE OR REPLACE FUNCTION trialy_security.table_permission(w uuid, t uuid, writing boolean DEFAULT false)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE p record; tool uuid:=nullif(current_setting('trialy.tool_id',true),'')::uuid; app uuid; app_role text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM entity_types WHERE id=t AND workspace_id=w) THEN RETURN false; END IF;
 IF trialy_security.worker() THEN RETURN true; END IF;
 IF trialy_security.workspace_permission(w,writing) THEN
  SELECT m.role AS tenant_role,a.allowed_types,a.direct_data,ws.ai_hidden_types,ws.permission_rules INTO p FROM workspaces ws JOIN memberships m ON m.tenant_id=ws.tenant_id AND m.user_id=trialy_security.actor_id() LEFT JOIN workspace_access a ON a.workspace_id=ws.id AND a.user_id=m.user_id WHERE ws.id=w;
  IF current_setting('trialy.origin',true)='ai' AND p.ai_hidden_types ? t::text THEN RETURN false; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p.permission_rules) r WHERE trialy_security.rule_applies(r) AND (r->>'kind' IN ('database','connection') OR (r->>'kind'='table' AND r->>'resourceId'=t::text)) AND (r->>'read'='deny' OR (writing AND r->>'write'='deny'))) THEN RETURN false; END IF;
  -- A2: an app's own table follows the person's role on that app. Guests keep their scoped sharing rules.
  SELECT origin_app_id INTO app FROM entity_types WHERE id=t;
  IF app IS NOT NULL AND p.tenant_role<>'owner' AND coalesce(p.direct_data,true) THEN
   app_role:=trialy_security.app_role(app,trialy_security.actor_id());
   IF app_role IS NULL OR (writing AND app_role='viewer') THEN RETURN false; END IF;
  END IF;
  IF p.tenant_role='owner' OR (p.direct_data AND (p.allowed_types IS NULL OR p.allowed_types ? t::text)) THEN RETURN true; END IF;
  RETURN EXISTS(SELECT 1 FROM jsonb_array_elements(p.permission_rules) r WHERE r->>'subject'=trialy_security.actor_id()::text AND r->>'read'='allow' AND (NOT writing OR r->>'write'='allow') AND ((r->>'kind'='database' OR (r->>'kind' IN ('table','column') AND r->>'resourceId'=t::text)) OR (tool IS NOT NULL AND EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(r->'bindings','[]')) b WHERE b->>'toolId'=tool::text AND b->>'typeId'=t::text))));
 END IF;
 IF writing THEN RETURN false; END IF;
 RETURN EXISTS(SELECT 1 FROM external_links l JOIN workspaces ws ON ws.id=l.workspace_id JOIN memberships m ON m.tenant_id=ws.tenant_id AND m.user_id=l.owner_id AND m.role='owner' WHERE l.token_hash=nullif(current_setting('trialy.public_link',true),'') AND l.workspace_id=w AND l.type_id=t AND l.kind='view' AND l.revoked_at IS NULL AND l.expires_at>now() AND NOT ws.archived);
END $function$;
