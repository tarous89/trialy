-- Notification batches hold current work, not one frozen email per database edit.
CREATE TABLE app_notification_batches (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), tenant_id uuid NOT NULL REFERENCES tenants(id),
 user_id uuid NOT NULL REFERENCES users(id), app_id uuid NOT NULL REFERENCES workspace_components(id),
 action_id uuid NOT NULL REFERENCES app_actions(id), action_version integer NOT NULL, origin text NOT NULL DEFAULT 'ai' CHECK(origin IN ('ai','human')),
 status text NOT NULL DEFAULT 'collecting' CHECK(status IN ('collecting','sending','succeeded','cancelled','blocked','failed')),
 not_before timestamptz NOT NULL DEFAULT now()+interval '2 minutes', diagnostic text,
 created_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz
);
CREATE UNIQUE INDEX notification_open_batch ON app_notification_batches(action_id,action_version) WHERE status='collecting';
CREATE INDEX notification_batches_due ON app_notification_batches(not_before) WHERE status IN ('collecting','sending');
CREATE TABLE app_notification_items (
 batch_id uuid NOT NULL REFERENCES app_notification_batches(id), item_key text NOT NULL, record_id uuid,
 signature text NOT NULL, context jsonb NOT NULL DEFAULT '{}', occurrence text NOT NULL,
 PRIMARY KEY(batch_id,item_key)
);
CREATE TABLE app_notification_occurrences (
 action_id uuid NOT NULL REFERENCES app_actions(id), action_version integer NOT NULL, origin text NOT NULL DEFAULT 'ai' CHECK(origin IN ('ai','human')), occurrence text NOT NULL,
 batch_id uuid NOT NULL REFERENCES app_notification_batches(id), PRIMARY KEY(action_id,action_version,occurrence)
);
CREATE TABLE app_notification_recipients (
 batch_id uuid NOT NULL REFERENCES app_notification_batches(id), user_id uuid NOT NULL REFERENCES users(id), email text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','queued','succeeded','cancelled','failed','unknown')),
 job_id uuid REFERENCES app_service_jobs(id), diagnostic text, PRIMARY KEY(batch_id,user_id)
);
DO $$ DECLARE t text; BEGIN
 ALTER TABLE app_notification_batches ENABLE ROW LEVEL SECURITY;
 CREATE POLICY notification_owner ON app_notification_batches FOR ALL USING (trialy_security.workspace_permission(workspace_id) AND user_id=trialy_security.actor_id()) WITH CHECK (trialy_security.workspace_permission(workspace_id) AND user_id=trialy_security.actor_id());
 CREATE POLICY notification_worker ON app_notification_batches FOR ALL USING (trialy_security.worker()) WITH CHECK (trialy_security.worker());
 FOREACH t IN ARRAY ARRAY['app_notification_items','app_notification_occurrences','app_notification_recipients'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY notification_batch_scope ON %I FOR ALL USING (EXISTS(SELECT 1 FROM app_notification_batches b WHERE b.id=batch_id)) WITH CHECK (EXISTS(SELECT 1 FROM app_notification_batches b WHERE b.id=batch_id))',t);
 END LOOP;
END $$;
CREATE TABLE app_notification_account_locks (tenant_id uuid PRIMARY KEY REFERENCES tenants(id));
ALTER TABLE app_notification_account_locks ENABLE ROW LEVEL SECURITY;
CREATE POLICY notification_account_owner ON app_notification_account_locks FOR ALL USING(trialy_security.worker() OR EXISTS(SELECT 1 FROM memberships m WHERE m.tenant_id=app_notification_account_locks.tenant_id AND m.user_id=trialy_security.actor_id())) WITH CHECK(trialy_security.worker() OR EXISTS(SELECT 1 FROM memberships m WHERE m.tenant_id=app_notification_account_locks.tenant_id AND m.user_id=trialy_security.actor_id()));
-- Worker-only global guard. Recipient history is never exposed across accounts.
CREATE TABLE app_notification_guard (id integer PRIMARY KEY CHECK(id=1), enabled boolean NOT NULL DEFAULT true);
INSERT INTO app_notification_guard(id) VALUES(1);
CREATE TABLE app_notification_allowances (tenant_id uuid PRIMARY KEY REFERENCES tenants(id), daily_limit integer NOT NULL DEFAULT 15 CHECK(daily_limit BETWEEN 1 AND 100));
CREATE TABLE app_notification_reservations (
 job_id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES tenants(id), email text NOT NULL,
 action_id uuid REFERENCES app_actions(id),local_day text,
 reserved_at timestamptz NOT NULL DEFAULT now(), attempted_at timestamptz, released boolean NOT NULL DEFAULT false
);
CREATE INDEX notification_recipient_budget ON app_notification_reservations(email,reserved_at) WHERE NOT released;
CREATE INDEX notification_account_budget ON app_notification_reservations(tenant_id,reserved_at) WHERE NOT released;
ALTER TABLE app_notification_guard ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_notification_allowances ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_notification_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY notification_guard_worker ON app_notification_guard FOR SELECT USING(trialy_security.worker());
CREATE POLICY notification_guard_lock ON app_notification_guard FOR UPDATE USING(trialy_security.worker());
CREATE POLICY notification_allowance_worker ON app_notification_allowances FOR SELECT USING(trialy_security.worker());
CREATE POLICY notification_reservation_worker ON app_notification_reservations FOR ALL USING(trialy_security.worker()) WITH CHECK(trialy_security.worker());

-- Fail closed during mixed-version deployments. Old workers cannot dispatch new
-- app notification jobs, or create unguarded ones. Invitations remain separate.
CREATE FUNCTION protect_notification_delivery() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.kind='email' AND NEW.payload ? 'action' AND (TG_OP='INSERT' OR NEW.status IN ('queued','running')) THEN
  IF NOT (NEW.payload ? 'notification') OR jsonb_array_length(NEW.payload->'message'->'to')<>1 THEN RAISE EXCEPTION 'App notification policy required'; END IF;
  IF NEW.status='running' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM 'running') AND current_setting('trialy.notification_policy',true) IS DISTINCT FROM '1' THEN RAISE EXCEPTION 'Notification worker upgrade required'; END IF;
 END IF;
 RETURN NEW;
END $$;
-- Preserve receipts; stop only unsent legacy app notifications before fencing.
UPDATE app_service_jobs SET status='cancelled',diagnostic='notification_policy_upgrade',finished_at=now()
 WHERE kind='email' AND payload ? 'action' AND status IN ('queued','running');
CREATE TRIGGER notification_delivery_guard BEFORE INSERT OR UPDATE ON app_service_jobs FOR EACH ROW EXECUTE FUNCTION protect_notification_delivery();
UPDATE app_actions SET paused=true,last_error='notification_policy_review_required'
 WHERE EXISTS(SELECT 1 FROM jsonb_array_elements(config->'steps') s WHERE s->>'kind'='email')
 AND (jsonb_array_length(config->'steps')<>1 OR config->'trigger'->>'kind'='interval'
 OR (config->'trigger'->>'kind'='database' AND config->'trigger'->'events' ? 'deleted')
 OR (config->'trigger'->>'kind'='database' AND NOT(config->'trigger' ? 'becomes') AND config->'trigger'->'events'<>'["created"]'::jsonb));

-- Capacity includes every authorizing owner in the account without disclosing
-- their private batches. Call only while holding the account queue lock.
CREATE FUNCTION trialy_security.notification_capacity(t uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT (trialy_security.worker() OR EXISTS(SELECT 1 FROM memberships m WHERE m.tenant_id=t AND m.user_id=trialy_security.actor_id()))
 AND (SELECT count(*) FROM app_notification_batches b WHERE b.tenant_id=t AND b.status IN ('collecting','sending'))<100;
$$;
REVOKE ALL ON FUNCTION trialy_security.notification_capacity(uuid) FROM PUBLIC;
