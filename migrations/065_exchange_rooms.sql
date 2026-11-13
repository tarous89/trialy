-- External exchange room extension (docs/product/EXTERNAL_EXCHANGE.md §5, R1–R8), for Data Room.
-- Room mode: no form, submissions or deadline; access until revoked or an optional end date
-- (1–730 days). Sections and order per shared document, ordered levels with their own entry step,
-- inline viewer sessions with approximate seconds, documents replaced in place, room Q&A with
-- private or published answers, bound output tables kept current by the platform ("tracked"), and
-- a pre-approved daily digest. Levels are enforced by row security as well as by the page.

ALTER TABLE exchange_groups ADD COLUMN kind text NOT NULL DEFAULT 'request' CHECK(kind IN ('request','room'));
-- Ordered levels: [{key,name,entry:'none'|'click_through'|'signed_document',text,slot}].
ALTER TABLE exchange_groups ADD COLUMN levels jsonb NOT NULL DEFAULT '[]';
-- Owner-approved digest text: {subject,body,displayName,replyTo,senderUserId,approvedBy,approvedAt}; null = no automatic digest.
ALTER TABLE exchange_groups ADD COLUMN digest jsonb;
ALTER TABLE exchange_groups ADD COLUMN notify_engagement boolean NOT NULL DEFAULT false;
ALTER TABLE exchange_groups ADD COLUMN quiet_days integer NOT NULL DEFAULT 10 CHECK(quiet_days BETWEEN 1 AND 365);
-- The levels a person holds (level keys of the group).
ALTER TABLE exchanges ADD COLUMN levels jsonb NOT NULL DEFAULT '[]';
-- Rooms may run until revoked: no end date.
ALTER TABLE exchanges ALTER COLUMN expires_at DROP NOT NULL;

-- Last visit per person, for New / Updated badges and "what changed".
CREATE TABLE exchange_visits (
 exchange_id uuid PRIMARY KEY REFERENCES exchanges(id), workspace_id uuid NOT NULL REFERENCES workspaces(id),
 last_seen_at timestamptz NOT NULL DEFAULT now(), previous_seen_at timestamptz
);
-- Inline viewer sessions: one per open of a document version (repeat opens within 30 minutes reuse it).
-- Seconds are approximate visible time from heartbeats; only the counters move.
CREATE TABLE exchange_views (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), exchange_id uuid NOT NULL REFERENCES exchanges(id),
 document_id uuid NOT NULL, version_id uuid NOT NULL REFERENCES document_versions(id), started_at timestamptz NOT NULL DEFAULT now(),
 last_beat_at timestamptz NOT NULL DEFAULT now(), seconds integer NOT NULL DEFAULT 0 CHECK(seconds>=0)
);
CREATE INDEX exchange_views_exchange ON exchange_views(exchange_id,version_id,last_beat_at);
CREATE FUNCTION protect_exchange_view() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'History is append-only'; END IF;
 IF (to_jsonb(OLD)-ARRAY['last_beat_at','seconds']) IS DISTINCT FROM (to_jsonb(NEW)-ARRAY['last_beat_at','seconds']) OR NEW.seconds<OLD.seconds OR NEW.last_beat_at<OLD.last_beat_at THEN RAISE EXCEPTION 'Viewer sessions only accumulate time'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER immutable_exchange_views BEFORE UPDATE OR DELETE ON exchange_views FOR EACH ROW EXECUTE FUNCTION protect_exchange_view();

-- Room Q&A. Questions come from the person's page; answers are immutable, editing adds a new answer that supersedes.
CREATE TABLE exchange_questions (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), group_id uuid NOT NULL REFERENCES exchange_groups(id), exchange_id uuid NOT NULL REFERENCES exchanges(id),
 body text NOT NULL, section text, document_id uuid, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX exchange_questions_group ON exchange_questions(group_id,created_at);
CREATE TABLE exchange_answers (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), group_id uuid NOT NULL REFERENCES exchange_groups(id),
 question_id uuid REFERENCES exchange_questions(id), exchange_id uuid REFERENCES exchanges(id),
 visibility text NOT NULL CHECK(visibility IN ('private','room','level')), level text, question text, body text NOT NULL,
 author_id uuid NOT NULL REFERENCES users(id), supersedes uuid REFERENCES exchange_answers(id), created_at timestamptz NOT NULL DEFAULT now(),
 CHECK((visibility='private' AND exchange_id IS NOT NULL AND level IS NULL) OR (visibility='room' AND exchange_id IS NULL AND level IS NULL) OR (visibility='level' AND exchange_id IS NULL AND level IS NOT NULL))
);
CREATE INDEX exchange_answers_group ON exchange_answers(group_id,created_at);
CREATE TRIGGER immutable_exchange_questions BEFORE UPDATE OR DELETE ON exchange_questions FOR EACH ROW EXECUTE FUNCTION protect_history();
CREATE TRIGGER immutable_exchange_answers BEFORE UPDATE OR DELETE ON exchange_answers FOR EACH ROW EXECUTE FUNCTION protect_history();

-- Bound output tables (R7). A room group binds an access table and/or an engagement table; the
-- fields listed here are written only by the platform from exchange events ("*" = every field and
-- the row itself). Several rooms may bind the same table.
CREATE TABLE exchange_tracked_tables (
 group_id uuid NOT NULL REFERENCES exchange_groups(id), workspace_id uuid NOT NULL REFERENCES workspaces(id),
 role text NOT NULL CHECK(role IN ('access','engagement')), type_id uuid NOT NULL REFERENCES entity_types(id), fields jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(group_id,role)
);
CREATE INDEX exchange_tracked_tables_type ON exchange_tracked_tables(type_id);
CREATE TRIGGER immutable_exchange_tracked_tables BEFORE UPDATE OR DELETE ON exchange_tracked_tables FOR EACH ROW EXECUTE FUNCTION protect_history();
CREATE TABLE exchange_tracked_records (
 workspace_id uuid NOT NULL REFERENCES workspaces(id), group_id uuid NOT NULL REFERENCES exchange_groups(id), exchange_id uuid NOT NULL REFERENCES exchanges(id),
 role text NOT NULL CHECK(role IN ('access','engagement')), document_ref text NOT NULL DEFAULT '', record_id uuid NOT NULL REFERENCES records(id),
 PRIMARY KEY(exchange_id,role,document_ref)
);
CREATE TABLE exchange_tracking_state (
 exchange_id uuid PRIMARY KEY REFERENCES exchanges(id), workspace_id uuid NOT NULL REFERENCES workspaces(id),
 synced_until timestamptz NOT NULL, synced_at timestamptz NOT NULL DEFAULT now()
);
-- People and assistants never write tracked fields: only the platform's tracking sync, which runs
-- outside any human or assistant context and marks its own transaction, may. This holds for every
-- write path (reviewed saves, database edits, migrations, reversals, automations).
CREATE FUNCTION protect_tracked_records() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE tracked text[]; whole boolean;
BEGIN
 IF current_setting('trialy.tracked_write',true)='on' AND coalesce(current_setting('trialy.origin',true),'') NOT IN ('human','ai') THEN RETURN NEW; END IF;
 SELECT array_agg(DISTINCT f) INTO tracked FROM exchange_tracked_tables t CROSS JOIN LATERAL jsonb_array_elements_text(t.fields) f WHERE t.type_id=NEW.type_id;
 IF tracked IS NULL THEN RETURN NEW; END IF;
 whole:='*'=ANY(tracked);
 IF TG_OP='INSERT' THEN
  IF whole OR EXISTS(SELECT 1 FROM unnest(tracked) k WHERE NEW.data ? k AND NEW.data->k NOT IN ('null'::jsonb,'""'::jsonb)) THEN RAISE EXCEPTION 'Tracked fields are recorded by TrialAgents from exchange activity' USING ERRCODE='42501'; END IF;
 ELSIF whole THEN
  IF OLD.data IS DISTINCT FROM NEW.data OR OLD.state IS DISTINCT FROM NEW.state THEN RAISE EXCEPTION 'Tracked records are recorded by TrialAgents from exchange activity' USING ERRCODE='42501'; END IF;
 ELSIF EXISTS(SELECT 1 FROM unnest(tracked) k WHERE (OLD.data->k) IS DISTINCT FROM (NEW.data->k)) THEN RAISE EXCEPTION 'Tracked fields are recorded by TrialAgents from exchange activity' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_tracked_records BEFORE INSERT OR UPDATE ON records FOR EACH ROW EXECUTE FUNCTION protect_tracked_records();

-- Recipient capability, now room-aware: a room's link stops at its end date (no read-only page);
-- a request's page stays readable after its deadline as before. Rooms without an end date never expire.
CREATE OR REPLACE FUNCTION trialy_security.current_exchange() RETURNS exchanges LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT e.* FROM exchanges e JOIN exchange_groups g ON g.id=e.group_id JOIN workspaces ws ON ws.id=e.workspace_id
 JOIN memberships m ON m.tenant_id=ws.tenant_id AND m.user_id=g.owner_id AND m.role='owner'
 WHERE e.token_hash=nullif(current_setting('trialy.exchange_link',true),'') AND e.revoked_at IS NULL AND NOT g.archived AND NOT ws.archived
 AND (g.kind<>'room' OR e.expires_at IS NULL OR e.expires_at>now())
 AND (g.app_id IS NULL OR NOT EXISTS(SELECT 1 FROM workspace_components c WHERE c.id=g.app_id AND (c.archived OR c.deleted_at IS NOT NULL)))
$$;
CREATE FUNCTION trialy_security.exchange_levels() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$ SELECT coalesce((SELECT levels FROM trialy_security.current_exchange()),'[]'::jsonb) $$;
CREATE OR REPLACE FUNCTION trialy_security.exchange_permission(w uuid,relation_name text,writing boolean DEFAULT false) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE x record; g record; after_deadline boolean;
BEGIN
 SELECT * INTO x FROM trialy_security.current_exchange() WHERE workspace_id=w;
 IF NOT FOUND THEN RETURN false; END IF;
 SELECT kind,messages_after_deadline INTO g FROM exchange_groups WHERE id=x.group_id;
 after_deadline:=coalesce(x.expires_at<=now(),false);
 IF writing THEN
  IF relation_name IN ('exchange_events','audit_events','exchange_verifications','exchange_message_reads','exchange_emails','exchange_visits','exchange_views') THEN RETURN true; END IF;
  IF g.kind='room' THEN RETURN relation_name IN ('exchange_questions','exchange_files'); END IF;
  IF relation_name='exchange_messages' THEN RETURN NOT after_deadline OR coalesce(g.messages_after_deadline,false); END IF;
  RETURN NOT after_deadline AND relation_name IN ('exchange_drafts','exchange_submissions','exchange_files');
 END IF;
 RETURN relation_name IN ('workspaces','workspace_access','workspace_nodes','entity_types','exchange_groups','exchanges','exchange_drafts','exchange_submissions','exchange_files','exchange_file_acceptances','exchange_acceptances','exchange_messages','exchange_message_reads','exchange_events','exchange_verifications','document_versions','exchange_visits','exchange_views','exchange_questions','exchange_answers');
END $$;
-- A level is open for the current person when they hold it and its entry step is complete.
CREATE FUNCTION trialy_security.exchange_level_open(exchange_ref uuid,group_ref uuid,level_key text) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE l jsonb; e record;
BEGIN
 SELECT * INTO e FROM exchanges WHERE id=exchange_ref;
 IF NOT FOUND OR NOT (e.levels ? level_key) THEN RETURN false; END IF;
 SELECT v INTO l FROM exchange_groups g CROSS JOIN LATERAL jsonb_array_elements(g.levels) v WHERE g.id=group_ref AND v->>'key'=level_key;
 IF l IS NULL THEN RETURN false; END IF;
 IF l->>'entry'='click_through' THEN RETURN EXISTS(SELECT 1 FROM exchange_events WHERE exchange_id=exchange_ref AND kind='level_acknowledged' AND detail->>'level'=level_key); END IF;
 IF l->>'entry'='signed_document' THEN RETURN EXISTS(SELECT 1 FROM exchange_files f JOIN exchange_file_acceptances a ON a.file_id=f.id WHERE f.exchange_id=exchange_ref AND f.slot=l->>'slot'); END IF;
 RETURN true;
END $$;
-- Documents readable by the current person: the group's current versions (and logo); in a group with
-- levels only documents at levels they hold whose entry step is complete, or the document to sign for a held level.
CREATE OR REPLACE FUNCTION trialy_security.exchange_document(version_ref uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT EXISTS(SELECT 1 FROM trialy_security.current_exchange() e JOIN exchange_groups g ON g.id=e.group_id WHERE g.logo_version_id=version_ref
  OR EXISTS(SELECT 1 FROM jsonb_array_elements(g.documents) d WHERE d->>'versionId'=version_ref::text AND (jsonb_array_length(g.levels)=0
   OR (e.levels ? (d->>'level') AND (coalesce((d->>'toSign')::boolean,false) OR trialy_security.exchange_level_open(e.id,g.id,d->>'level'))))))
$$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA trialy_security FROM PUBLIC;

DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['exchange_visits','exchange_views','exchange_questions','exchange_answers'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY workspace_read ON %I FOR SELECT USING (trialy_security.workspace_permission(workspace_id) OR trialy_security.exchange_permission(workspace_id,%L))',t,t);
  EXECUTE format('CREATE POLICY workspace_insert ON %I FOR INSERT WITH CHECK (trialy_security.workspace_permission(workspace_id,true) OR trialy_security.exchange_permission(workspace_id,%L,true))',t,t);
  EXECUTE format('CREATE POLICY workspace_update ON %I FOR UPDATE USING (trialy_security.workspace_permission(workspace_id) OR trialy_security.exchange_permission(workspace_id,%L)) WITH CHECK (trialy_security.workspace_permission(workspace_id,true) OR trialy_security.exchange_permission(workspace_id,%L,true))',t,t,t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['exchange_tracked_tables','exchange_tracked_records','exchange_tracking_state'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY workspace_scope ON %I FOR ALL USING (trialy_security.workspace_permission(workspace_id)) WITH CHECK (trialy_security.workspace_permission(workspace_id,true))',t);
 END LOOP;
END $$;
-- A person sees and writes only their own visit, viewer sessions and questions, and only the answers
-- addressed to them: their private answers, room-wide answers and answers for a level they hold.
CREATE POLICY exact_exchange_visit ON exchange_visits AS RESTRICTIVE USING (trialy_security.workspace_permission(workspace_id) OR exchange_id=trialy_security.exchange_id()) WITH CHECK (trialy_security.workspace_permission(workspace_id,true) OR exchange_id=trialy_security.exchange_id());
CREATE POLICY exact_exchange_view ON exchange_views AS RESTRICTIVE USING (trialy_security.workspace_permission(workspace_id) OR exchange_id=trialy_security.exchange_id()) WITH CHECK (trialy_security.workspace_permission(workspace_id,true) OR (exchange_id=trialy_security.exchange_id() AND trialy_security.exchange_document(version_id)));
CREATE POLICY exact_exchange_question ON exchange_questions AS RESTRICTIVE USING (trialy_security.workspace_permission(workspace_id) OR exchange_id=trialy_security.exchange_id()) WITH CHECK (trialy_security.workspace_permission(workspace_id,true) OR (exchange_id=trialy_security.exchange_id() AND group_id=trialy_security.exchange_group_id()));
CREATE POLICY exact_exchange_answer ON exchange_answers AS RESTRICTIVE USING (trialy_security.workspace_permission(workspace_id) OR (group_id=trialy_security.exchange_group_id() AND (visibility='room' OR (visibility='private' AND exchange_id=trialy_security.exchange_id()) OR (visibility='level' AND trialy_security.exchange_levels() ? level)))) WITH CHECK (trialy_security.workspace_permission(workspace_id,true));
