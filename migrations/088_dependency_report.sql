-- A13 (package 3.6): what relies on a table, field or app helper that a change would remove or redefine.
-- Automation rows are isolated per creator, so this reads them as a definer function and returns only what the
-- caller may learn: the kind of dependent, its identifier, the app it belongs to and the expected effect. The
-- application then names only the apps the caller can open (the rest are counted, not named).
--
-- removed: [{typeId, fields:[...], whole:boolean}] as in app_config_uses_removed_binding.
-- removed_execution: helper names an app change drops.
-- self: the app being changed (null for a schema change).
CREATE FUNCTION trialy_security.dependency_report(w uuid,removed jsonb,removed_execution text[],self uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE out jsonb:='[]'::jsonb;
BEGIN
 -- The signed-in person must be able to use the workspace. Without a person in the database context, only a
 -- connection that already bypasses row security (migrations, maintenance) gets an answer; the runtime role gets none.
 IF trialy_security.actor_id() IS NULL THEN
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=session_user AND (rolsuper OR rolbypassrls)) THEN RETURN '[]'::jsonb; END IF;
 ELSIF NOT trialy_security.workspace_permission(w) THEN RETURN '[]'::jsonb; END IF;
 -- Automations (research and actions) that read, write or are triggered by what is removed, or run a removed helper.
 SELECT out||coalesce(jsonb_agg(jsonb_build_object('kind','automation','id',m.id,'appId',m.app_id,'name',coalesce(m.config->>'name','Research automation'),
   'effect','would stop working','breaking',true)),'[]') INTO out
 FROM app_monitors m WHERE m.workspace_id=w AND m.deleted_at IS NULL AND (self IS NULL OR m.app_id=self)
  AND (app_config_uses_removed_binding(m.config,removed) OR (self IS NOT NULL AND m.config->'brief'->>'binding'=ANY(removed_execution)));
 SELECT out||coalesce(jsonb_agg(jsonb_build_object('kind','automation','id',x.id,'appId',x.app_id,'name',coalesce(x.config->>'name','Automation'),
   'effect','would stop working','breaking',true)),'[]') INTO out
 FROM app_actions x WHERE x.workspace_id=w AND x.deleted_at IS NULL AND (self IS NULL OR x.app_id=self)
  AND (app_config_uses_removed_binding(x.config,removed) OR (self IS NOT NULL AND EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(x.config->'steps','[]')) s
   WHERE s->>'binding'=ANY(removed_execution) OR s->'summary'->>'binding'=ANY(removed_execution))));
 IF self IS NULL THEN
  -- A schema change: apps that show the removed fields, saved views and outside links on them.
  SELECT out||coalesce(jsonb_agg(DISTINCT jsonb_build_object('kind','app','id',c.id,'appId',c.id,'name',c.name,'effect','would need its table connection reviewed before it opens again','breaking',true)),'[]') INTO out
  FROM workspace_components c CROSS JOIN LATERAL jsonb_array_elements(c.bindings) b JOIN jsonb_array_elements(removed) d ON d->>'typeId'=b->>'typeId'
  WHERE c.workspace_id=w AND c.deleted_at IS NULL AND ((d->>'whole')::boolean OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(d->'fields') k WHERE b->'fields' ? k));
  SELECT out||coalesce(jsonb_agg(jsonb_build_object('kind','view','id',v.id,'appId',NULL,'name',v.name,'effect','would lose the removed columns','breaking',false)),'[]') INTO out
  FROM saved_views v JOIN jsonb_array_elements(removed) d ON d->>'typeId'=v.type_id::text
  WHERE v.workspace_id=w AND ((d->>'whole')::boolean OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(d->'fields') k WHERE v.config::text LIKE '%"'||k||'"%'));
  SELECT out||coalesce(jsonb_agg(jsonb_build_object('kind','link','id',l.id,'appId',NULL,'name',l.name,'effect','an outside form or view would stop showing these fields','breaking',false)),'[]') INTO out
  FROM external_links l JOIN jsonb_array_elements(removed) d ON d->>'typeId'=l.type_id::text
  WHERE l.workspace_id=w AND l.revoked_at IS NULL AND ((d->>'whole')::boolean OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(d->'fields') k WHERE l.fields ? k));
 ELSE
  -- An app change: other apps that read data this app writes under a shared role keep their data, but no app writes it any more.
  SELECT out||coalesce(jsonb_agg(DISTINCT jsonb_build_object('kind','app','id',c.id,'appId',c.id,'name',c.name,'effect','reads data this app would stop writing','breaking',false)),'[]') INTO out
  FROM role_writers r JOIN jsonb_array_elements(removed) d ON d->>'typeId'=r.type_id::text AND (d->>'whole')::boolean
  JOIN workspace_components c ON c.workspace_id=w AND c.deleted_at IS NULL AND c.id<>self AND c.bindings @> jsonb_build_array(jsonb_build_object('typeId',r.type_id))
  WHERE r.workspace_id=w AND r.app_id=self;
 END IF;
 RETURN out;
END $$;
REVOKE ALL ON FUNCTION trialy_security.dependency_report(uuid,jsonb,text[],uuid) FROM PUBLIC;
