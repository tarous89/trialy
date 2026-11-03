ALTER TABLE users ADD COLUMN first_name text NOT NULL DEFAULT '', ADD COLUMN last_name text NOT NULL DEFAULT '';
ALTER TABLE workspace_invitations ALTER COLUMN allowed_types DROP NOT NULL;
ALTER TABLE workspace_invitations ADD COLUMN access_rules jsonb NOT NULL DEFAULT '[]';
ALTER TABLE support_requests ADD COLUMN delivery_status text NOT NULL DEFAULT 'pending', ADD COLUMN attempts integer NOT NULL DEFAULT 0, ADD COLUMN available_at timestamptz NOT NULL DEFAULT now(), ADD COLUMN provider_id text;
-- Historical requests are retained without resending old messages.
UPDATE support_requests SET delivery_status='historical';

-- Assign unfiled apps to an ordinary, editable project. Existing placements remain intact.
CREATE FUNCTION ensure_default_project(w uuid) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE result uuid;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext(w::text));
 SELECT id INTO result FROM workspace_nodes WHERE workspace_id=w AND kind='project' AND parent_id IS NULL AND archived=false ORDER BY CASE WHEN name='Project 1' THEN 0 ELSE 1 END,created_at,id LIMIT 1;
 IF result IS NULL THEN
  result:=gen_random_uuid();
  INSERT INTO workspace_nodes(id,workspace_id,kind,name) VALUES(result,w,'project','Project 1');
 END IF;
 RETURN result;
END $$;
CREATE FUNCTION assign_app_project() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.project_id IS NULL THEN NEW.project_id:=ensure_default_project(NEW.workspace_id); END IF;
 IF NEW.home_project_id IS NULL THEN NEW.home_project_id:=NEW.project_id; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER app_project_required BEFORE INSERT OR UPDATE OF project_id,home_project_id ON workspace_components FOR EACH ROW EXECUTE FUNCTION assign_app_project();
UPDATE workspace_components SET project_id=project_id WHERE project_id IS NULL OR home_project_id IS NULL;

-- Acceptance applies only the owner's stored invitation restrictions, atomically.
CREATE FUNCTION apply_invitation_access() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF OLD.accepted_by IS NULL AND NEW.accepted_by IS NOT NULL THEN
  UPDATE workspaces SET permission_rules=permission_rules || COALESCE((SELECT jsonb_agg(value || jsonb_build_object('subject',NEW.accepted_by)) FROM jsonb_array_elements(OLD.access_rules)), '[]'::jsonb), access_version=access_version+1 WHERE id=NEW.workspace_id;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION apply_invitation_access() FROM PUBLIC;
CREATE TRIGGER invitation_access_accepted AFTER UPDATE OF accepted_by ON workspace_invitations FOR EACH ROW EXECUTE FUNCTION apply_invitation_access();
DROP POLICY invitation_recipient ON workspace_access;
CREATE POLICY invitation_recipient ON workspace_access AS RESTRICTIVE FOR INSERT WITH CHECK (trialy_security.workspace_permission(workspace_id,true) OR (user_id=trialy_security.actor_id() AND ai_enabled=(role<>'inspector') AND EXISTS(SELECT 1 FROM workspace_invitations i WHERE i.workspace_id=workspace_access.workspace_id AND i.token_hash=nullif(current_setting('trialy.invitation',true),'') AND i.role=workspace_access.role AND i.allowed_types IS NOT DISTINCT FROM workspace_access.allowed_types)));
CREATE POLICY support_worker ON support_requests USING(trialy_security.worker()) WITH CHECK(trialy_security.worker());
ALTER TABLE users ADD COLUMN stripe_customer_id text, ADD COLUMN stripe_subscription_id text, ADD COLUMN stripe_checkout_id text;
CREATE INDEX support_pending ON support_requests(available_at,created_at) WHERE delivery_status='pending';
