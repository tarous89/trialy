-- A5: a team member asks for access to an app. Anyone who may grant the requested role answers; the first answer counts.
CREATE TABLE app_access_requests (
 id uuid PRIMARY KEY,
 workspace_id uuid NOT NULL REFERENCES workspaces(id),
 app_id uuid NOT NULL REFERENCES workspace_components(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES users(id),
 requested_role text NOT NULL CHECK(requested_role IN ('viewer','editor')),
 note text CHECK(char_length(note)<=500),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','declined','cancelled')),
 decided_by uuid REFERENCES users(id),
 decided_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK((status='pending')=(decided_by IS NULL) AND (status='pending')=(decided_at IS NULL))
);
-- One open request per person and app.
CREATE UNIQUE INDEX app_access_requests_pending ON app_access_requests(app_id,user_id) WHERE status='pending';
CREATE INDEX app_access_requests_app ON app_access_requests(workspace_id,app_id,created_at);

ALTER TABLE app_access_requests ENABLE ROW LEVEL SECURITY;
-- The person who asked sees their own requests; people who can open the app see its requests (the server narrows this to
-- those who may grant the role). The worker reads a request before sending its emails.
CREATE POLICY app_access_requests_read ON app_access_requests FOR SELECT USING(trialy_security.worker() OR (trialy_security.workspace_permission(workspace_id) AND (user_id=trialy_security.actor_id() OR trialy_security.app_role(app_id,trialy_security.actor_id()) IS NOT NULL)));
CREATE POLICY app_access_requests_ask ON app_access_requests FOR INSERT WITH CHECK(user_id=trialy_security.actor_id() AND status='pending' AND trialy_security.workspace_permission(workspace_id));
CREATE POLICY app_access_requests_answer ON app_access_requests FOR UPDATE
 USING(trialy_security.workspace_permission(workspace_id) AND (user_id=trialy_security.actor_id() OR trialy_security.app_role(app_id,trialy_security.actor_id()) IS NOT NULL))
 WITH CHECK(trialy_security.workspace_permission(workspace_id));
-- Asking and withdrawing are recorded for every team member, also one who is view-only in the organization.
CREATE POLICY access_request_audit ON audit_events FOR INSERT WITH CHECK(action IN ('app.access_requested','app.access_request_cancelled') AND actor_id=trialy_security.actor_id() AND origin='human' AND trialy_security.workspace_permission(workspace_id));

-- The same rules as src/domain/access-requests.ts, for a caller that skips the application:
-- only a signed-in team member asks; only the person who asked changes or cancels an open request;
-- approving needs a role at least as high as the one asked for, and the person must already hold it;
-- declining is for owners of the app; an answered request never changes again.
CREATE FUNCTION trialy_security.guard_access_request() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE who uuid:=trialy_security.actor_id(); ranks text[]:=ARRAY['none','viewer','editor','owner']; mine text;
BEGIN
 IF who IS NULL THEN RETURN NEW; END IF;
 IF coalesce(current_setting('trialy.origin',true),'')<>'human' THEN RAISE EXCEPTION 'A signed-in person must ask for or answer an access request' USING ERRCODE='insufficient_privilege'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.user_id<>who OR NEW.status<>'pending' OR NOT EXISTS(SELECT 1 FROM workspace_components c JOIN workspaces w ON w.id=c.workspace_id JOIN memberships m ON m.tenant_id=w.tenant_id AND m.user_id=who AND m.kind='member'
   WHERE c.id=NEW.app_id AND c.workspace_id=NEW.workspace_id AND c.deleted_at IS NULL) THEN RAISE EXCEPTION 'Only team members can ask for access' USING ERRCODE='insufficient_privilege'; END IF;
  RETURN NEW;
 END IF;
 IF OLD.status<>'pending' OR (to_jsonb(NEW)-ARRAY['requested_role','note','status','decided_by','decided_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['requested_role','note','status','decided_by','decided_at']) THEN RAISE EXCEPTION 'This request was already answered' USING ERRCODE='insufficient_privilege'; END IF;
 IF NEW.status='pending' OR NEW.status='cancelled' THEN
  IF who<>OLD.user_id OR NEW.decided_by IS DISTINCT FROM (CASE WHEN NEW.status='cancelled' THEN who END) THEN RAISE EXCEPTION 'Only the person who asked can change or cancel this request' USING ERRCODE='insufficient_privilege'; END IF;
  RETURN NEW;
 END IF;
 mine:=coalesce(trialy_security.app_role(OLD.app_id,who),'none');
 IF who=OLD.user_id OR NEW.decided_by IS DISTINCT FROM who OR NEW.requested_role<>OLD.requested_role THEN RAISE EXCEPTION 'You cannot answer this request' USING ERRCODE='insufficient_privilege'; END IF;
 IF NEW.status='declined' AND mine<>'owner' THEN RAISE EXCEPTION 'Only an owner of this app can decline a request' USING ERRCODE='insufficient_privilege'; END IF;
 IF NEW.status='approved' AND (array_position(ranks,mine)<array_position(ranks,OLD.requested_role)
  OR array_position(ranks,coalesce(trialy_security.app_role(OLD.app_id,OLD.user_id),'none'))<array_position(ranks,OLD.requested_role)) THEN RAISE EXCEPTION 'Grant the role before approving this request' USING ERRCODE='insufficient_privilege'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION trialy_security.guard_access_request() FROM PUBLIC;
CREATE TRIGGER app_access_requests_guard BEFORE INSERT OR UPDATE ON app_access_requests FOR EACH ROW EXECUTE FUNCTION trialy_security.guard_access_request();
