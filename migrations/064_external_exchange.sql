-- External exchange (docs/product/EXTERNAL_EXCHANGE.md): per-recipient, time-limited
-- pages a workspace sends to people outside it. Extends public forms (008/014).
-- Recipient access uses an unguessable bearer token (hash stored), optional
-- email verification, a per-group confidentiality gate and a deadline.
-- Received content is never deleted by revocation, expiry or app archival.

ALTER TABLE workspace_access ADD COLUMN external_send boolean NOT NULL DEFAULT false;

CREATE TABLE exchange_groups (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), owner_id uuid NOT NULL REFERENCES users(id),
 app_id uuid REFERENCES workspace_components(id), title text NOT NULL, summary text NOT NULL DEFAULT '', dates jsonb NOT NULL DEFAULT '[]',
 sender_name text NOT NULL, sender_company text NOT NULL, logo_version_id uuid REFERENCES document_versions(id), privacy_notice text NOT NULL DEFAULT '',
 gate text NOT NULL CHECK(gate IN ('none','acknowledgement','signed_document')), gate_text text NOT NULL DEFAULT '', gate_slot text,
 verify_email boolean NOT NULL DEFAULT false, messages_after_deadline boolean NOT NULL DEFAULT true,
 documents jsonb NOT NULL DEFAULT '[]', type_id uuid REFERENCES entity_types(id), type_version integer, fields jsonb NOT NULL DEFAULT '[]', questions jsonb NOT NULL DEFAULT '[]',
 max_files integer NOT NULL DEFAULT 10 CHECK(max_files BETWEEN 0 AND 10), slots jsonb NOT NULL DEFAULT '[]', email_defaults jsonb NOT NULL DEFAULT '{}',
 archived boolean NOT NULL DEFAULT false, version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE exchanges (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), group_id uuid NOT NULL REFERENCES exchange_groups(id),
 record_id uuid REFERENCES records(id), recipient_name text NOT NULL DEFAULT '', recipient_company text NOT NULL DEFAULT '', recipient_emails jsonb NOT NULL,
 token_hash text NOT NULL UNIQUE, link_token text NOT NULL, expires_at timestamptz NOT NULL, revoked_at timestamptz, version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX exchanges_group ON exchanges(group_id);
CREATE TABLE exchange_verifications (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), exchange_id uuid NOT NULL REFERENCES exchanges(id),
 email text NOT NULL, code_hash text NOT NULL, attempts integer NOT NULL DEFAULT 0, expires_at timestamptz NOT NULL,
 session_hash text UNIQUE, session_expires_at timestamptz, verified_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE exchange_drafts (
 exchange_id uuid PRIMARY KEY REFERENCES exchanges(id), workspace_id uuid NOT NULL REFERENCES workspaces(id), data jsonb NOT NULL DEFAULT '{}', updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE exchange_submissions (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), exchange_id uuid NOT NULL REFERENCES exchanges(id),
 version integer NOT NULL, nonce uuid NOT NULL, data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(exchange_id,version), UNIQUE(exchange_id,nonce)
);
CREATE TABLE exchange_files (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), exchange_id uuid NOT NULL REFERENCES exchanges(id),
 submission_id uuid REFERENCES exchange_submissions(id), slot text, filename text NOT NULL, mime text NOT NULL, byte_size integer NOT NULL, checksum text NOT NULL, bytes bytea NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), removed_at timestamptz, CHECK(byte_size=octet_length(bytes))
);
CREATE INDEX exchange_files_exchange ON exchange_files(exchange_id);
CREATE TABLE exchange_file_acceptances (
 file_id uuid PRIMARY KEY REFERENCES exchange_files(id), workspace_id uuid NOT NULL REFERENCES workspaces(id), exchange_id uuid NOT NULL REFERENCES exchanges(id),
 version_id uuid NOT NULL REFERENCES document_versions(id), actor_id uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE exchange_acceptances (
 submission_id uuid PRIMARY KEY REFERENCES exchange_submissions(id), workspace_id uuid NOT NULL REFERENCES workspaces(id), exchange_id uuid NOT NULL REFERENCES exchanges(id),
 record_id uuid NOT NULL REFERENCES records(id), actor_id uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE exchange_messages (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), group_id uuid NOT NULL REFERENCES exchange_groups(id), exchange_id uuid REFERENCES exchanges(id),
 kind text NOT NULL CHECK(kind IN ('private','clarification')), author text NOT NULL CHECK(author IN ('recipient','workspace')),
 question text, body text NOT NULL, author_id uuid REFERENCES users(id), source_message_id uuid REFERENCES exchange_messages(id), created_at timestamptz NOT NULL DEFAULT now(),
 CHECK((kind='private' AND exchange_id IS NOT NULL) OR (kind='clarification' AND exchange_id IS NULL AND author='workspace'))
);
CREATE INDEX exchange_messages_group ON exchange_messages(group_id);
CREATE TABLE exchange_message_reads (
 message_id uuid NOT NULL REFERENCES exchange_messages(id), workspace_id uuid NOT NULL REFERENCES workspaces(id), reader text NOT NULL CHECK(reader IN ('recipient','workspace')),
 exchange_id uuid REFERENCES exchanges(id), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE NULLS NOT DISTINCT (message_id,reader,exchange_id)
);
CREATE TABLE exchange_events (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), exchange_id uuid NOT NULL REFERENCES exchanges(id),
 kind text NOT NULL, detail jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX exchange_events_exchange ON exchange_events(exchange_id,kind);
CREATE TABLE exchange_email_batches (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), group_id uuid NOT NULL REFERENCES exchange_groups(id),
 email_type text NOT NULL, display_name text NOT NULL, reply_to text NOT NULL, sender_user_id uuid NOT NULL REFERENCES users(id),
 subject_template text NOT NULL, body_template text NOT NULL, overrides jsonb NOT NULL DEFAULT '{}', rendered jsonb NOT NULL,
 digest text NOT NULL, scheduled_at timestamptz, status text NOT NULL DEFAULT 'prepared' CHECK(status IN ('prepared','confirmed','sent','cancelled')),
 confirmed_at timestamptz, confirmed_by uuid REFERENCES users(id), created_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE exchange_emails (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), group_id uuid REFERENCES exchange_groups(id), exchange_id uuid REFERENCES exchanges(id),
 batch_id uuid REFERENCES exchange_email_batches(id), email_type text NOT NULL, to_email text NOT NULL, from_name text NOT NULL, reply_to text,
 subject text NOT NULL, text text NOT NULL, status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','sent','delivered','bounced','complained','failed','suppressed')),
 provider_id text, attempts integer NOT NULL DEFAULT 0, diagnostic text, available_at timestamptz NOT NULL DEFAULT now(), sent_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX exchange_emails_queue ON exchange_emails(status,available_at);
CREATE INDEX exchange_emails_provider ON exchange_emails(provider_id);
CREATE TABLE exchange_email_defaults (
 workspace_id uuid NOT NULL REFERENCES workspaces(id), email_type text NOT NULL, subject text NOT NULL, body text NOT NULL,
 updated_by uuid NOT NULL REFERENCES users(id), updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(workspace_id,email_type)
);
CREATE TABLE exchange_sender_preferences (
 workspace_id uuid NOT NULL REFERENCES workspaces(id), user_id uuid NOT NULL REFERENCES users(id), name_kind text NOT NULL CHECK(name_kind IN ('organization','person','custom')),
 custom_name text NOT NULL DEFAULT '', updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(workspace_id,user_id)
);
CREATE TABLE exchange_notifications (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), user_id uuid NOT NULL REFERENCES users(id), exchange_id uuid NOT NULL REFERENCES exchanges(id),
 kind text NOT NULL, title text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), read_at timestamptz
);
CREATE INDEX exchange_notifications_user ON exchange_notifications(user_id,read_at);

CREATE TRIGGER immutable_exchange_submissions BEFORE UPDATE OR DELETE ON exchange_submissions FOR EACH ROW EXECUTE FUNCTION protect_history();
CREATE TRIGGER immutable_exchange_acceptances BEFORE UPDATE OR DELETE ON exchange_acceptances FOR EACH ROW EXECUTE FUNCTION protect_history();
CREATE TRIGGER immutable_exchange_file_acceptances BEFORE UPDATE OR DELETE ON exchange_file_acceptances FOR EACH ROW EXECUTE FUNCTION protect_history();
CREATE TRIGGER immutable_exchange_messages BEFORE UPDATE OR DELETE ON exchange_messages FOR EACH ROW EXECUTE FUNCTION protect_history();
CREATE TRIGGER immutable_exchange_message_reads BEFORE UPDATE OR DELETE ON exchange_message_reads FOR EACH ROW EXECUTE FUNCTION protect_history();
CREATE TRIGGER immutable_exchange_events BEFORE UPDATE OR DELETE ON exchange_events FOR EACH ROW EXECUTE FUNCTION protect_history();
-- Received files keep their bytes; only attachment to a submission and soft removal of an unsubmitted draft file change.
CREATE FUNCTION protect_exchange_file() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'History is append-only'; END IF;
 IF (to_jsonb(OLD)-ARRAY['submission_id','removed_at']) IS DISTINCT FROM (to_jsonb(NEW)-ARRAY['submission_id','removed_at']) OR (OLD.submission_id IS NOT NULL AND NEW.submission_id IS DISTINCT FROM OLD.submission_id) OR (OLD.submission_id IS NOT NULL AND NEW.removed_at IS NOT NULL) THEN RAISE EXCEPTION 'Received file is immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER immutable_exchange_files BEFORE UPDATE OR DELETE ON exchange_files FOR EACH ROW EXECUTE FUNCTION protect_exchange_file();
-- Sent text never changes; only delivery state does.
CREATE FUNCTION protect_exchange_email() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'History is append-only'; END IF;
 IF (to_jsonb(OLD)-ARRAY['status','provider_id','attempts','diagnostic','available_at','sent_at','updated_at']) IS DISTINCT FROM (to_jsonb(NEW)-ARRAY['status','provider_id','attempts','diagnostic','available_at','sent_at','updated_at']) THEN RAISE EXCEPTION 'Sent email is immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER immutable_exchange_emails BEFORE UPDATE OR DELETE ON exchange_emails FOR EACH ROW EXECUTE FUNCTION protect_exchange_email();
CREATE FUNCTION protect_exchange_batch() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'History is append-only'; END IF;
 IF (to_jsonb(OLD)-ARRAY['status','confirmed_at','confirmed_by']) IS DISTINCT FROM (to_jsonb(NEW)-ARRAY['status','confirmed_at','confirmed_by']) THEN RAISE EXCEPTION 'Prepared email batch is immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER immutable_exchange_batches BEFORE UPDATE OR DELETE ON exchange_email_batches FOR EACH ROW EXECUTE FUNCTION protect_exchange_batch();

-- Recipient capability: the exact exchange named by the bearer token hash in trialy.exchange_link.
-- Reading stays possible after the deadline (read-only page); writing stops, except messages when the
-- group allows them and the access events that record what happened. Revocation, group archival,
-- app archival and workspace archival stop everything.
CREATE FUNCTION trialy_security.current_exchange() RETURNS exchanges LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT e.* FROM exchanges e JOIN exchange_groups g ON g.id=e.group_id JOIN workspaces ws ON ws.id=e.workspace_id
 JOIN memberships m ON m.tenant_id=ws.tenant_id AND m.user_id=g.owner_id AND m.role='owner'
 WHERE e.token_hash=nullif(current_setting('trialy.exchange_link',true),'') AND e.revoked_at IS NULL AND NOT g.archived AND NOT ws.archived
 AND (g.app_id IS NULL OR NOT EXISTS(SELECT 1 FROM workspace_components c WHERE c.id=g.app_id AND (c.archived OR c.deleted_at IS NOT NULL)))
$$;
CREATE FUNCTION trialy_security.exchange_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$ SELECT id FROM trialy_security.current_exchange() $$;
CREATE FUNCTION trialy_security.exchange_group_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$ SELECT group_id FROM trialy_security.current_exchange() $$;
CREATE FUNCTION trialy_security.exchange_permission(w uuid,relation_name text,writing boolean DEFAULT false) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE x record; after_deadline boolean; open_messages boolean;
BEGIN
 SELECT * INTO x FROM trialy_security.current_exchange() WHERE workspace_id=w;
 IF NOT FOUND THEN RETURN false; END IF;
 after_deadline:=x.expires_at<=now();
 IF writing THEN
  IF relation_name IN ('exchange_events','audit_events','exchange_verifications','exchange_message_reads','exchange_emails') THEN RETURN true; END IF;
  IF relation_name='exchange_messages' THEN
   IF NOT after_deadline THEN RETURN true; END IF;
   SELECT messages_after_deadline INTO open_messages FROM exchange_groups WHERE id=x.group_id;RETURN coalesce(open_messages,false);
  END IF;
  RETURN NOT after_deadline AND relation_name IN ('exchange_drafts','exchange_submissions','exchange_files');
 END IF;
 RETURN relation_name IN ('workspaces','workspace_access','workspace_nodes','entity_types','exchange_groups','exchanges','exchange_drafts','exchange_submissions','exchange_files','exchange_file_acceptances','exchange_acceptances','exchange_messages','exchange_message_reads','exchange_events','exchange_verifications','document_versions');
END $$;
-- Documents the current exchange's group shares (and its sender logo) are readable by that recipient.
CREATE FUNCTION trialy_security.exchange_document(version_ref uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT EXISTS(SELECT 1 FROM trialy_security.current_exchange() e JOIN exchange_groups g ON g.id=e.group_id WHERE g.logo_version_id=version_ref OR g.documents @> jsonb_build_array(jsonb_build_object('versionId',version_ref::text)))
$$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA trialy_security FROM PUBLIC;

DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['exchange_groups','exchanges','exchange_verifications','exchange_drafts','exchange_submissions','exchange_files','exchange_file_acceptances','exchange_acceptances','exchange_messages','exchange_message_reads','exchange_events','exchange_emails'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY workspace_read ON %I FOR SELECT USING (trialy_security.workspace_permission(workspace_id) OR trialy_security.exchange_permission(workspace_id,%L))',t,t);
  EXECUTE format('CREATE POLICY workspace_insert ON %I FOR INSERT WITH CHECK (trialy_security.workspace_permission(workspace_id,true) OR trialy_security.exchange_permission(workspace_id,%L,true))',t,t);
  EXECUTE format('CREATE POLICY workspace_update ON %I FOR UPDATE USING (trialy_security.workspace_permission(workspace_id) OR trialy_security.exchange_permission(workspace_id,%L)) WITH CHECK (trialy_security.workspace_permission(workspace_id,true) OR trialy_security.exchange_permission(workspace_id,%L,true))',t,t,t);
  EXECUTE format('CREATE POLICY workspace_delete ON %I FOR DELETE USING (trialy_security.workspace_permission(workspace_id,true) OR trialy_security.exchange_permission(workspace_id,%L,true))',t,t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['exchange_email_batches','exchange_email_defaults','exchange_sender_preferences'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY workspace_scope ON %I FOR ALL USING (trialy_security.workspace_permission(workspace_id)) WITH CHECK (trialy_security.workspace_permission(workspace_id,true))',t);
 END LOOP;
END $$;
-- A recipient sees exactly their exchange, its group, their own content and the group's clarifications.
CREATE POLICY exact_exchange ON exchanges AS RESTRICTIVE USING (trialy_security.workspace_permission(workspace_id) OR token_hash=nullif(current_setting('trialy.exchange_link',true),''));
CREATE POLICY exact_exchange_group ON exchange_groups AS RESTRICTIVE USING (trialy_security.workspace_permission(workspace_id) OR id=trialy_security.exchange_group_id());
CREATE POLICY exact_exchange_verification ON exchange_verifications AS RESTRICTIVE USING (trialy_security.workspace_permission(workspace_id) OR exchange_id=trialy_security.exchange_id()) WITH CHECK (trialy_security.workspace_permission(workspace_id,true) OR exchange_id=trialy_security.exchange_id());
CREATE POLICY exact_exchange_draft ON exchange_drafts AS RESTRICTIVE USING (trialy_security.workspace_permission(workspace_id) OR exchange_id=trialy_security.exchange_id()) WITH CHECK (trialy_security.workspace_permission(workspace_id,true) OR exchange_id=trialy_security.exchange_id());
CREATE POLICY exact_exchange_submission ON exchange_submissions AS RESTRICTIVE USING (trialy_security.workspace_permission(workspace_id) OR exchange_id=trialy_security.exchange_id()) WITH CHECK (trialy_security.workspace_permission(workspace_id,true) OR exchange_id=trialy_security.exchange_id());
CREATE POLICY exact_exchange_file ON exchange_files AS RESTRICTIVE USING (trialy_security.workspace_permission(workspace_id) OR exchange_id=trialy_security.exchange_id()) WITH CHECK (trialy_security.workspace_permission(workspace_id,true) OR exchange_id=trialy_security.exchange_id());
CREATE POLICY exact_exchange_file_acceptance ON exchange_file_acceptances AS RESTRICTIVE USING (trialy_security.workspace_permission(workspace_id) OR exchange_id=trialy_security.exchange_id());
CREATE POLICY exact_exchange_acceptance ON exchange_acceptances AS RESTRICTIVE USING (trialy_security.workspace_permission(workspace_id) OR exchange_id=trialy_security.exchange_id());
CREATE POLICY exact_exchange_message ON exchange_messages AS RESTRICTIVE USING (trialy_security.workspace_permission(workspace_id) OR exchange_id=trialy_security.exchange_id() OR (kind='clarification' AND group_id=trialy_security.exchange_group_id())) WITH CHECK (trialy_security.workspace_permission(workspace_id,true) OR (exchange_id=trialy_security.exchange_id() AND author='recipient' AND kind='private'));
CREATE POLICY exact_exchange_read ON exchange_message_reads AS RESTRICTIVE USING (trialy_security.workspace_permission(workspace_id) OR exchange_id=trialy_security.exchange_id()) WITH CHECK (trialy_security.workspace_permission(workspace_id,true) OR (exchange_id=trialy_security.exchange_id() AND reader='recipient'));
CREATE POLICY exact_exchange_event ON exchange_events AS RESTRICTIVE USING (trialy_security.workspace_permission(workspace_id) OR exchange_id=trialy_security.exchange_id()) WITH CHECK (trialy_security.workspace_permission(workspace_id,true) OR exchange_id=trialy_security.exchange_id());
-- Narrow reads the recipient page needs from existing tables, and the audit trail it writes.
CREATE POLICY exchange_workspace_read ON workspaces FOR SELECT USING (trialy_security.exchange_permission(id,'workspaces'));
CREATE POLICY exchange_access_read ON workspace_access FOR SELECT USING (trialy_security.exchange_permission(workspace_id,'workspace_access'));
CREATE POLICY exchange_node_read ON workspace_nodes FOR SELECT USING (trialy_security.exchange_permission(workspace_id,'workspace_nodes'));
CREATE POLICY exchange_type_read ON entity_types FOR SELECT USING (trialy_security.exchange_permission(workspace_id,'entity_types'));
CREATE POLICY exchange_document_read ON document_versions FOR SELECT USING (trialy_security.exchange_document(id));
CREATE POLICY exchange_audit_insert ON audit_events FOR INSERT WITH CHECK (trialy_security.exchange_permission(workspace_id,'audit_events',true));
-- Verification codes are the only email a recipient can cause, and only to their own invited address.
CREATE POLICY exact_exchange_email ON exchange_emails AS RESTRICTIVE USING (trialy_security.workspace_permission(workspace_id)) WITH CHECK (trialy_security.workspace_permission(workspace_id,true) OR (exchange_id=trialy_security.exchange_id() AND email_type='verification'));
-- Members see and mark read only their own in-app notifications (any role); the worker creates them.
ALTER TABLE exchange_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_exchange_notification_read ON exchange_notifications FOR SELECT USING (trialy_security.worker() OR (user_id=trialy_security.actor_id() AND trialy_security.workspace_permission(workspace_id)));
CREATE POLICY own_exchange_notification_update ON exchange_notifications FOR UPDATE USING (trialy_security.worker() OR (user_id=trialy_security.actor_id() AND trialy_security.workspace_permission(workspace_id))) WITH CHECK (trialy_security.worker() OR (user_id=trialy_security.actor_id() AND trialy_security.workspace_permission(workspace_id)));
CREATE POLICY exchange_notification_insert ON exchange_notifications FOR INSERT WITH CHECK (trialy_security.worker() OR trialy_security.workspace_permission(workspace_id,true));
