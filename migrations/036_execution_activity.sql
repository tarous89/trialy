-- Keep terminal execution metadata after temporary source/results are removed.
-- The existing audit table already has append-only protection and workspace RLS.
CREATE FUNCTION record_execution_outcome() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE tenant uuid; object uuid;
BEGIN
 IF NEW.status NOT IN ('succeeded','failed','cancelled') OR NEW.status=OLD.status THEN RETURN NEW; END IF;
 SELECT tenant_id INTO tenant FROM workspaces WHERE id=NEW.workspace_id;
 SELECT function_id INTO object FROM foundation_revisions WHERE id=NEW.revision_id;
 INSERT INTO audit_events(id,workspace_id,tenant_id,actor_id,action,object_id,origin,source_run_id,after_value)
 VALUES(gen_random_uuid(),NEW.workspace_id,tenant,NEW.user_id,'automation.'||NEW.status,coalesce(object,NEW.id),coalesce(nullif(current_setting('trialy.origin',true),''),'worker'),NEW.id,jsonb_build_object('componentId',NEW.component_context->>'id'));
 RETURN NEW;
END $$;
CREATE TRIGGER execution_outcome AFTER UPDATE OF status ON foundation_runs FOR EACH ROW EXECUTE FUNCTION record_execution_outcome();
INSERT INTO audit_events(id,workspace_id,tenant_id,actor_id,action,object_id,origin,source_run_id,created_at,after_value)
 SELECT gen_random_uuid(),r.workspace_id,w.tenant_id,r.user_id,'automation.'||r.status,coalesce(rev.function_id,r.id),'worker',r.id,coalesce(r.finished_at,r.created_at),jsonb_build_object('componentId',r.component_context->>'id')
 FROM foundation_runs r JOIN workspaces w ON w.id=r.workspace_id LEFT JOIN foundation_revisions rev ON rev.id=r.revision_id
 WHERE r.status IN ('succeeded','failed','cancelled');
CREATE INDEX audit_activity_page ON audit_events(workspace_id,created_at DESC,id DESC);
