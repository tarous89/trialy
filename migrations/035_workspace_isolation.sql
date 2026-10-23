-- Workspace/table row isolation for non-owner runtime connections.
-- Migration owners bypass RLS; runtime startup auditing must reject owner credentials.
CREATE SCHEMA trialy_security;
REVOKE ALL ON SCHEMA trialy_security FROM PUBLIC;
CREATE FUNCTION trialy_security.actor_id() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT nullif(current_setting('trialy.actor_id',true),'')::uuid
$$;
CREATE FUNCTION trialy_security.worker() RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE caller text := coalesce(nullif(current_setting('role',true),'none'),session_user);
BEGIN
 IF current_setting('trialy.service',true) IS DISTINCT FROM 'worker' THEN RETURN false; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='trialy_worker') THEN RETURN false; END IF;
 RETURN pg_has_role(caller,'trialy_worker','MEMBER');
END $$;
CREATE FUNCTION trialy_security.workspace_permission(w uuid,writing boolean DEFAULT false) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE p record; who uuid:=trialy_security.actor_id(); origin text:=current_setting('trialy.origin',true);
BEGIN
 IF trialy_security.worker() THEN RETURN true; END IF;
 IF who IS NULL OR origin NOT IN ('human','ai') THEN RETURN false; END IF;
 SELECT ws.archived,ws.ai_enabled,m.role AS tenant_role,a.role,a.ai_enabled AS user_ai INTO p
 FROM workspaces ws JOIN memberships m ON m.tenant_id=ws.tenant_id AND m.user_id=who
 LEFT JOIN workspace_access a ON a.workspace_id=ws.id AND a.user_id=who WHERE ws.id=w;
 IF NOT FOUND OR (p.tenant_role<>'owner' AND p.role IS NULL) THEN RETURN false; END IF;
 IF origin='ai' AND (NOT p.ai_enabled OR (p.tenant_role<>'owner' AND NOT coalesce(p.user_ai,false))) THEN RETURN false; END IF;
 IF writing AND (p.archived OR (p.tenant_role<>'owner' AND p.role NOT IN ('owner','editor'))) THEN RETURN false; END IF;
 RETURN true;
END $$;
CREATE FUNCTION trialy_security.capability_workspace(w uuid,relation_name text,writing boolean DEFAULT false) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE l record; inv record;
BEGIN
 SELECT * INTO l FROM external_links WHERE token_hash=nullif(current_setting('trialy.public_link',true),'') AND workspace_id=w AND revoked_at IS NULL AND expires_at>now();
 IF FOUND AND EXISTS(SELECT 1 FROM workspaces ws JOIN memberships m ON m.tenant_id=ws.tenant_id AND m.user_id=l.owner_id AND m.role='owner' WHERE ws.id=w AND NOT ws.archived) THEN
  IF writing THEN RETURN l.kind='form' AND relation_name IN ('form_submissions','submission_files','audit_events'); END IF;
  RETURN relation_name IN ('workspaces','workspace_access','workspace_nodes','entity_types','saved_views','external_links','form_submissions','submission_files');
 END IF;
 IF trialy_security.actor_id() IS NULL THEN RETURN false; END IF;
 SELECT * INTO inv FROM workspace_invitations WHERE token_hash=nullif(current_setting('trialy.invitation',true),'') AND workspace_id=w AND revoked_at IS NULL AND expires_at>now() AND (accepted_by IS NULL OR accepted_by=trialy_security.actor_id());
 IF FOUND AND EXISTS(SELECT 1 FROM workspaces ws JOIN memberships m ON m.tenant_id=ws.tenant_id AND m.user_id=inv.owner_id AND m.role='owner' WHERE ws.id=w AND NOT ws.archived) THEN
  IF writing THEN RETURN relation_name IN ('workspace_invitations','workspace_access','audit_events'); END IF;
  RETURN relation_name IN ('workspaces','workspace_access','workspace_invitations','entity_types');
 END IF;
 RETURN false;
END $$;
CREATE FUNCTION trialy_security.table_permission(w uuid,t uuid,writing boolean DEFAULT false) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE p record;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM entity_types WHERE id=t AND workspace_id=w) THEN RETURN false; END IF;
 IF trialy_security.worker() THEN RETURN true; END IF;
 IF trialy_security.workspace_permission(w,writing) THEN
  SELECT m.role AS tenant_role,a.allowed_types,ws.ai_hidden_types INTO p FROM workspaces ws JOIN memberships m ON m.tenant_id=ws.tenant_id AND m.user_id=trialy_security.actor_id() LEFT JOIN workspace_access a ON a.workspace_id=ws.id AND a.user_id=m.user_id WHERE ws.id=w;
  IF current_setting('trialy.origin',true)='ai' AND p.ai_hidden_types ? t::text THEN RETURN false; END IF;
  RETURN p.tenant_role='owner' OR p.allowed_types IS NULL OR p.allowed_types ? t::text;
 END IF;
 IF writing THEN RETURN false; END IF;
 RETURN EXISTS(SELECT 1 FROM external_links l JOIN workspaces ws ON ws.id=l.workspace_id JOIN memberships m ON m.tenant_id=ws.tenant_id AND m.user_id=l.owner_id AND m.role='owner' WHERE l.token_hash=nullif(current_setting('trialy.public_link',true),'') AND l.workspace_id=w AND l.type_id=t AND l.kind='view' AND l.revoked_at IS NULL AND l.expires_at>now() AND NOT ws.archived);
END $$;
CREATE FUNCTION trialy_security.link_row(w uuid,link uuid,nonce_value uuid DEFAULT NULL) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT trialy_security.capability_workspace(w,'form_submissions') AND EXISTS(SELECT 1 FROM external_links WHERE id=link AND workspace_id=w AND token_hash=nullif(current_setting('trialy.public_link',true),'')) AND (nonce_value IS NULL OR nonce_value::text=nullif(current_setting('trialy.submission_nonce',true),''))
$$;
-- Every workspace-bearing table is fail-closed without actor or narrow capability context.
DO $$ DECLARE t record; BEGIN
 FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid WHERE n.nspname='public' AND c.relkind='r' AND a.attname='workspace_id' AND NOT a.attisdropped LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t.relname);
  EXECUTE format('CREATE POLICY workspace_read ON public.%I FOR SELECT USING (trialy_security.workspace_permission(workspace_id) OR trialy_security.capability_workspace(workspace_id,%L))',t.relname,t.relname);
  EXECUTE format('CREATE POLICY workspace_insert ON public.%I FOR INSERT WITH CHECK (trialy_security.workspace_permission(workspace_id,true) OR trialy_security.capability_workspace(workspace_id,%L,true))',t.relname,t.relname);
  EXECUTE format('CREATE POLICY workspace_update ON public.%I FOR UPDATE USING (trialy_security.workspace_permission(workspace_id) OR trialy_security.capability_workspace(workspace_id,%L)) WITH CHECK (trialy_security.workspace_permission(workspace_id,true) OR trialy_security.capability_workspace(workspace_id,%L,true))',t.relname,t.relname,t.relname);
  EXECUTE format('CREATE POLICY workspace_delete ON public.%I FOR DELETE USING (trialy_security.workspace_permission(workspace_id,true))',t.relname);
 END LOOP;
END $$;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY workspace_read ON workspaces FOR SELECT USING (trialy_security.workspace_permission(id) OR trialy_security.capability_workspace(id,'workspaces'));
CREATE POLICY workspace_insert ON workspaces FOR INSERT WITH CHECK (EXISTS(SELECT 1 FROM memberships WHERE tenant_id=workspaces.tenant_id AND user_id=trialy_security.actor_id() AND role='owner'));
CREATE POLICY workspace_update ON workspaces FOR UPDATE USING (trialy_security.workspace_permission(id) OR trialy_security.capability_workspace(id,'workspaces')) WITH CHECK (trialy_security.workspace_permission(id,true));
-- Additional restrictive policies cannot be bypassed by a broad workspace policy.
CREATE POLICY record_table_read ON records AS RESTRICTIVE FOR SELECT USING (trialy_security.table_permission(workspace_id,type_id));
CREATE POLICY record_table_insert ON records AS RESTRICTIVE FOR INSERT WITH CHECK (trialy_security.table_permission(workspace_id,type_id,true));
CREATE POLICY record_table_update ON records AS RESTRICTIVE FOR UPDATE USING (trialy_security.table_permission(workspace_id,type_id)) WITH CHECK (trialy_security.table_permission(workspace_id,type_id,true));
CREATE POLICY public_view_rows ON records FOR SELECT USING (trialy_security.table_permission(workspace_id,type_id));
CREATE POLICY exact_public_link ON external_links AS RESTRICTIVE USING (trialy_security.workspace_permission(workspace_id) OR token_hash=nullif(current_setting('trialy.public_link',true),''));
CREATE POLICY exact_public_submission ON form_submissions AS RESTRICTIVE USING (trialy_security.workspace_permission(workspace_id) OR trialy_security.link_row(workspace_id,link_id,nonce)) WITH CHECK (trialy_security.workspace_permission(workspace_id,true) OR trialy_security.link_row(workspace_id,link_id,nonce));
CREATE POLICY exact_public_files ON submission_files AS RESTRICTIVE USING (trialy_security.workspace_permission(workspace_id) OR EXISTS(SELECT 1 FROM form_submissions s WHERE s.id=submission_id AND trialy_security.link_row(s.workspace_id,s.link_id,s.nonce))) WITH CHECK (trialy_security.workspace_permission(workspace_id,true) OR EXISTS(SELECT 1 FROM form_submissions s WHERE s.id=submission_id AND trialy_security.link_row(s.workspace_id,s.link_id,s.nonce)));
CREATE POLICY exact_invitation ON workspace_invitations AS RESTRICTIVE USING (trialy_security.workspace_permission(workspace_id) OR token_hash=nullif(current_setting('trialy.invitation',true),''));
CREATE POLICY invitation_recipient ON workspace_access AS RESTRICTIVE FOR INSERT WITH CHECK (trialy_security.workspace_permission(workspace_id,true) OR (user_id=trialy_security.actor_id() AND NOT ai_enabled AND EXISTS(SELECT 1 FROM workspace_invitations i WHERE i.workspace_id=workspace_access.workspace_id AND i.token_hash=nullif(current_setting('trialy.invitation',true),'') AND i.role=workspace_access.role AND i.allowed_types=workspace_access.allowed_types)));
-- Records without workspace_id inherit isolation from their parent.
ALTER TABLE foundation_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY revision_read ON foundation_revisions FOR SELECT USING (EXISTS(SELECT 1 FROM foundation_functions f WHERE f.id=function_id));
CREATE POLICY revision_insert ON foundation_revisions FOR INSERT WITH CHECK (EXISTS(SELECT 1 FROM foundation_functions f WHERE f.id=function_id AND trialy_security.workspace_permission(f.workspace_id,true)));
ALTER TABLE document_payloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY payload_read ON document_payloads FOR SELECT USING (EXISTS(SELECT 1 FROM document_versions d WHERE d.id=version_id));
CREATE POLICY payload_insert ON document_payloads FOR INSERT WITH CHECK (EXISTS(SELECT 1 FROM document_versions d WHERE d.id=version_id AND trialy_security.workspace_permission(d.workspace_id,true)));
ALTER TABLE extractions ENABLE ROW LEVEL SECURITY;
CREATE POLICY extraction_read ON extractions FOR SELECT USING (EXISTS(SELECT 1 FROM document_versions d WHERE d.id=version_id));
CREATE POLICY extraction_write ON extractions FOR ALL USING (trialy_security.worker()) WITH CHECK (trialy_security.worker() OR EXISTS(SELECT 1 FROM document_versions d WHERE d.id=version_id AND trialy_security.workspace_permission(d.workspace_id,true)));
CREATE POLICY expired_preview_cleanup ON data_previews FOR DELETE USING (current_setting('trialy.service',true)='maintenance' AND expires_at<=now());
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA trialy_security FROM PUBLIC;
CREATE POLICY expired_preview_read ON data_previews FOR SELECT USING (current_setting('trialy.service',true)='maintenance' AND expires_at<=now());

-- Aggregate quota checks bypass response RLS without returning another response.
CREATE FUNCTION trialy_security.form_capacity(link uuid,additional_bytes bigint) RETURNS TABLE(responses_full boolean,files_full boolean) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE w uuid;
BEGIN
 SELECT workspace_id INTO w FROM external_links WHERE id=link AND kind='form';
 IF w IS NULL OR NOT trialy_security.link_row(w,link) THEN RAISE EXCEPTION 'Form unavailable'; END IF;
 RETURN QUERY SELECT (SELECT count(*)>=1000 FROM form_submissions WHERE link_id=link),
 (SELECT coalesce(sum(f.byte_size),0)+greatest(additional_bytes,0)>104857600 FROM submission_files f JOIN form_submissions s ON s.id=f.submission_id WHERE s.link_id=link);
END $$;
REVOKE ALL ON FUNCTION trialy_security.form_capacity(uuid,bigint) FROM PUBLIC;
