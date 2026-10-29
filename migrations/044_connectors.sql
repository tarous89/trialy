-- Additive connector metadata. Existing components, data and access rules are unchanged.
CREATE TABLE connectors (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), tenant_id uuid NOT NULL REFERENCES tenants(id),
 version integer NOT NULL DEFAULT 0, config jsonb NOT NULL, removed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,workspace_id),
 FOREIGN KEY(tenant_id,workspace_id) REFERENCES workspaces(tenant_id,id)
);
CREATE TABLE connector_credentials (
 connection_id uuid PRIMARY KEY, workspace_id uuid NOT NULL, sealed text NOT NULL, rotated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(connection_id,workspace_id) REFERENCES connectors(id,workspace_id)
);
CREATE TABLE connector_reviews (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), user_id uuid NOT NULL REFERENCES users(id),
 origin text NOT NULL CHECK(origin IN ('human','ai')), kind text NOT NULL CHECK(kind IN ('config','invoke')),
 digest text NOT NULL, body jsonb NOT NULL, expires_at timestamptz NOT NULL DEFAULT now()+interval '15 minutes',
 created_at timestamptz NOT NULL DEFAULT now(), consumed_at timestamptz, result jsonb
);
CREATE TABLE connector_invocations (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL, connection_id uuid NOT NULL, user_id uuid NOT NULL REFERENCES users(id),
 app_id uuid NOT NULL REFERENCES workspace_components(id), operation text NOT NULL, request_key uuid NOT NULL, digest text NOT NULL,
 status text NOT NULL CHECK(status IN ('running','succeeded','failed','unknown')), effect text NOT NULL, review_id uuid REFERENCES connector_reviews(id),
 result jsonb, http_status integer, request_bytes integer NOT NULL DEFAULT 0, response_bytes integer NOT NULL DEFAULT 0,
 duration_ms integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
 FOREIGN KEY(connection_id,workspace_id) REFERENCES connectors(id,workspace_id), UNIQUE(connection_id,user_id,request_key)
);
CREATE INDEX connector_invocations_quota ON connector_invocations(connection_id,created_at DESC);
CREATE INDEX connector_reviews_actor ON connector_reviews(workspace_id,user_id,created_at DESC);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['connectors','connector_credentials','connector_reviews','connector_invocations'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY workspace_read ON %I FOR SELECT USING (trialy_security.workspace_permission(workspace_id))',t);
  EXECUTE format('CREATE POLICY workspace_insert ON %I FOR INSERT WITH CHECK (trialy_security.workspace_permission(workspace_id))',t);
  EXECUTE format('CREATE POLICY workspace_update ON %I FOR UPDATE USING (trialy_security.workspace_permission(workspace_id)) WITH CHECK (trialy_security.workspace_permission(workspace_id))',t);
 END LOOP;
END $$;
CREATE POLICY review_actor ON connector_reviews AS RESTRICTIVE USING (user_id=trialy_security.actor_id()) WITH CHECK (user_id=trialy_security.actor_id());
-- SQL permissions remain a second tenant boundary; service code enforces operation-specific grants.
CREATE FUNCTION protect_connector_review() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (to_jsonb(OLD)-'consumed_at'-'result') IS DISTINCT FROM (to_jsonb(NEW)-'consumed_at'-'result') OR OLD.consumed_at IS NOT NULL OR NEW.consumed_at IS NULL THEN
  RAISE EXCEPTION 'Connector review is immutable';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER connector_review_immutable BEFORE UPDATE ON connector_reviews FOR EACH ROW EXECUTE FUNCTION protect_connector_review();
CREATE FUNCTION protect_connector_invocation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF OLD.status<>'running' OR NEW.status='running' OR (to_jsonb(OLD)-ARRAY['status','result','http_status','response_bytes','duration_ms','completed_at']) IS DISTINCT FROM (to_jsonb(NEW)-ARRAY['status','result','http_status','response_bytes','duration_ms','completed_at']) THEN
  RAISE EXCEPTION 'Completed connector receipts are immutable';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER connector_invocation_immutable BEFORE UPDATE ON connector_invocations FOR EACH ROW EXECUTE FUNCTION protect_connector_invocation();
