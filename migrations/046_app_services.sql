-- Persistent, scoped app actions and external work. Existing workflows remain compatible.
CREATE TABLE app_actions (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), user_id uuid NOT NULL REFERENCES users(id),
 app_id uuid NOT NULL REFERENCES workspace_components(id), version integer NOT NULL DEFAULT 0, config jsonb NOT NULL,
 approved_by uuid NOT NULL REFERENCES users(id), approved_at timestamptz NOT NULL DEFAULT now(), paused boolean NOT NULL DEFAULT false,
 next_at timestamptz, event_cursor bigint NOT NULL DEFAULT 0, last_error text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE app_action_runs (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), user_id uuid NOT NULL REFERENCES users(id), action_id uuid NOT NULL REFERENCES app_actions(id),
 action_version integer NOT NULL, occurrence text NOT NULL, record_id uuid, record_version integer, step integer NOT NULL DEFAULT 0,
 status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','waiting','running','succeeded','failed','cancelled','unknown')),
 results jsonb NOT NULL DEFAULT '{}', pending_job uuid, lease_token uuid, lease_until timestamptz, diagnostic text,
 created_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz, UNIQUE(action_id,action_version,occurrence)
);
CREATE TABLE app_service_jobs (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), user_id uuid NOT NULL REFERENCES users(id), app_id uuid REFERENCES workspace_components(id),
 kind text NOT NULL CHECK(kind IN ('email','connector')), request_key text NOT NULL, digest text NOT NULL, payload jsonb NOT NULL,
 status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','running','succeeded','failed','cancelled','unknown')),
 result jsonb, diagnostic text, attempts integer NOT NULL DEFAULT 0, available_at timestamptz NOT NULL DEFAULT now(),
 deadline_at timestamptz NOT NULL, lease_until timestamptz, lease_token uuid, provider_id text, delivery_status text,
 created_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz, UNIQUE(workspace_id,user_id,request_key)
);
CREATE INDEX app_services_ready ON app_service_jobs(status,available_at);
CREATE INDEX app_actions_due ON app_actions(next_at) WHERE NOT paused;
CREATE INDEX app_action_runs_ready ON app_action_runs(status,created_at);
CREATE TABLE app_service_previews (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), user_id uuid NOT NULL REFERENCES users(id),
 kind text NOT NULL, body jsonb NOT NULL, digest text NOT NULL, expires_at timestamptz NOT NULL DEFAULT now()+interval '24 hours',
 consumed_at timestamptz, result jsonb
);
CREATE TABLE notification_events (id text PRIMARY KEY, provider_id text NOT NULL, event_type text NOT NULL, recipients jsonb NOT NULL DEFAULT '[]', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE notification_suppressions (email text PRIMARY KEY, reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['app_actions','app_action_runs','app_service_jobs','app_service_previews'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY workspace_scope ON %I FOR ALL USING (trialy_security.workspace_permission(workspace_id)) WITH CHECK (trialy_security.workspace_permission(workspace_id))',t);
 END LOOP;
END $$;
CREATE POLICY preview_actor ON app_service_previews AS RESTRICTIVE USING (user_id=trialy_security.actor_id()) WITH CHECK(user_id=trialy_security.actor_id());
CREATE TRIGGER service_review_immutable BEFORE UPDATE ON app_service_previews FOR EACH ROW EXECUTE FUNCTION protect_connector_review();
CREATE FUNCTION protect_service_job() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (to_jsonb(OLD)-ARRAY['status','result','diagnostic','attempts','available_at','lease_until','lease_token','provider_id','delivery_status','finished_at']) IS DISTINCT FROM (to_jsonb(NEW)-ARRAY['status','result','diagnostic','attempts','available_at','lease_until','lease_token','provider_id','delivery_status','finished_at']) THEN RAISE EXCEPTION 'Service request is immutable'; END IF;
 IF OLD.status IN ('succeeded','failed','cancelled','unknown') AND (to_jsonb(OLD)-'delivery_status') IS DISTINCT FROM (to_jsonb(NEW)-'delivery_status') THEN RAISE EXCEPTION 'Completed service receipt is immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER service_job_immutable BEFORE UPDATE ON app_service_jobs FOR EACH ROW EXECUTE FUNCTION protect_service_job();
-- Delivery events contain no message body. Inserts are accepted only by the signed webhook route.
ALTER TABLE notification_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY event_insert ON notification_events FOR INSERT WITH CHECK(true);
CREATE POLICY event_worker ON notification_events FOR SELECT USING(trialy_security.worker());
ALTER TABLE notification_suppressions ENABLE ROW LEVEL SECURITY;
CREATE POLICY suppression_worker ON notification_suppressions FOR ALL USING(trialy_security.worker()) WITH CHECK(trialy_security.worker());
ALTER TABLE app_actions ADD COLUMN scope_stamp text NOT NULL DEFAULT '', ADD COLUMN scan_cursor uuid;
ALTER TABLE app_action_runs ADD COLUMN origin text NOT NULL DEFAULT 'ai' CHECK(origin IN ('human','ai'));
ALTER TABLE app_action_runs ADD COLUMN causal_chain jsonb NOT NULL DEFAULT '[]';
CREATE TABLE app_action_effects (run_id uuid NOT NULL REFERENCES app_action_runs(id),step integer NOT NULL,job_id uuid NOT NULL,PRIMARY KEY(run_id,step));
ALTER TABLE app_action_effects ENABLE ROW LEVEL SECURITY;
CREATE POLICY effect_scope ON app_action_effects FOR ALL USING(EXISTS(SELECT 1 FROM app_action_runs r WHERE r.id=run_id AND trialy_security.workspace_permission(r.workspace_id))) WITH CHECK(EXISTS(SELECT 1 FROM app_action_runs r WHERE r.id=run_id AND trialy_security.workspace_permission(r.workspace_id)));
CREATE TABLE app_shares (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), app_id uuid NOT NULL REFERENCES workspace_components(id), app_version integer NOT NULL,
 owner_id uuid NOT NULL REFERENCES users(id), kind text NOT NULL CHECK(kind IN ('email','public')), email text, token_hash text UNIQUE NOT NULL,
 principal_id uuid REFERENCES users(id), config jsonb NOT NULL, expires_at timestamptz NOT NULL, revoked_at timestamptz, accepted_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE app_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY share_scope ON app_shares FOR ALL USING(trialy_security.workspace_permission(workspace_id) OR token_hash=nullif(current_setting('trialy.app_share',true),'')) WITH CHECK(trialy_security.workspace_permission(workspace_id,true));
-- Accepting an emailed, unguessable token proves possession of the invited address.
-- No reusable login credential is created by either sharing mode.
CREATE FUNCTION trialy_security.accept_app_share(share_hash text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE s app_shares; who uuid:=trialy_security.actor_id(); tenant uuid; email_value text; rule jsonb;
BEGIN
 SELECT * INTO s FROM app_shares WHERE token_hash=share_hash AND kind='email' AND revoked_at IS NULL AND expires_at>now() FOR UPDATE;
 IF s.id IS NULL OR who IS NULL OR current_setting('trialy.origin',true)<>'human' THEN RAISE EXCEPTION 'Invitation unavailable'; END IF;
 SELECT lower(email) INTO email_value FROM users WHERE id=who;
 IF email_value<>s.email THEN RAISE EXCEPTION 'Sign in with the invited email'; END IF;
 IF s.accepted_at IS NOT NULL THEN IF s.principal_id=who THEN RETURN s.id; ELSE RAISE EXCEPTION 'Invitation unavailable'; END IF; END IF;
 SELECT tenant_id INTO tenant FROM workspaces WHERE id=s.workspace_id AND NOT archived;
 IF tenant IS NULL OR NOT EXISTS(SELECT 1 FROM workspace_components WHERE id=s.app_id AND version=s.app_version AND NOT archived) THEN RAISE EXCEPTION 'App changed'; END IF;
 INSERT INTO memberships(tenant_id,user_id,role) VALUES(tenant,who,'viewer') ON CONFLICT DO NOTHING;
 INSERT INTO workspace_access(workspace_id,user_id,role,allowed_types,ai_enabled,database_browse,direct_data) VALUES(s.workspace_id,who,'viewer','[]',true,false,false) ON CONFLICT DO NOTHING;
 IF EXISTS(SELECT 1 FROM workspaces w CROSS JOIN LATERAL jsonb_array_elements(w.permission_rules) r WHERE w.id=s.workspace_id AND r->>'subject'=who::text AND r->>'kind'='tool' AND r->>'resourceId'=s.app_id::text) THEN RAISE EXCEPTION 'This app already has an access rule for this account; ask the owner to manage existing access'; END IF;
 rule=jsonb_build_object('shareId',s.id,'subject',who,'kind','tool','resourceId',s.app_id,'read','allow','write',CASE WHEN s.config->>'mode'='edit' THEN 'allow' ELSE 'deny' END,'bindings',s.config->'bindings');
 UPDATE workspaces SET permission_rules=(SELECT coalesce(jsonb_agg(r),'[]') FROM jsonb_array_elements(permission_rules) r WHERE NOT(r->>'subject'=who::text AND r->>'kind'='tool' AND r->>'resourceId'=s.app_id::text))||jsonb_build_array(rule),access_version=access_version+1 WHERE id=s.workspace_id;
 UPDATE app_shares SET principal_id=who,accepted_at=now() WHERE id=s.id;
 RETURN s.id;
END $$;
REVOKE ALL ON FUNCTION trialy_security.accept_app_share(text) FROM PUBLIC;

CREATE INDEX notification_provider_events ON notification_events(provider_id,created_at);
CREATE INDEX service_job_provider ON app_service_jobs(provider_id) WHERE provider_id IS NOT NULL;

ALTER TABLE connector_invocations ADD COLUMN deadline_at timestamptz NOT NULL DEFAULT now()+interval '30 seconds';

-- The verified webhook can append a deduplicated event without reading other tenants' recipients.
CREATE FUNCTION trialy_security.ingest_notification_event(event_id text,provider text,event_kind text,addresses jsonb) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 INSERT INTO notification_events(id,provider_id,event_type,recipients) VALUES(event_id,provider,event_kind,addresses) ON CONFLICT(id) DO NOTHING;
$$;
REVOKE ALL ON FUNCTION trialy_security.ingest_notification_event(text,text,text,jsonb) FROM PUBLIC;

CREATE INDEX action_effect_job ON app_action_effects(job_id);
