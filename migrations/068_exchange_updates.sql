-- External exchange update extension (docs/product/EXTERNAL_EXCHANGE.md §6, U1–U4), for Investor Updates.
-- A room can carry rendered content (sanitised by TrialAgents, images from platform documents) as its
-- main page; email type "update" carries that content as email-safe HTML with a plain-text part; asks
-- declared in the content collect "I can help" responses written to a bound responses table (as R7);
-- groups sharing a series key give each person an archive of the earlier updates sent to them, and a
-- one-click unsubscribe per series is recorded per address and honoured by later sends. Additive.

-- Content: {html (canonical sanitised HTML with doc: images and ask markers), text, asks:[{key,text}],
-- images:[{versionId,documentId,mime,width,height}], confidentiality, preheader, updatedAt}.
ALTER TABLE exchange_groups ADD COLUMN content jsonb;
ALTER TABLE exchange_groups ADD COLUMN series text CHECK(series ~ '^[A-Za-z0-9][A-Za-z0-9:._-]{0,119}$');
ALTER TABLE exchange_groups ADD COLUMN series_name text;
-- Content images are served from a per-update address that names no recipient, so loading them can never act as an open pixel.
ALTER TABLE exchange_groups ADD COLUMN image_token text UNIQUE;
ALTER TABLE exchange_groups ADD CONSTRAINT exchange_group_update_room CHECK((content IS NULL AND series IS NULL) OR kind='room');
CREATE INDEX exchange_groups_series ON exchange_groups(workspace_id,series) WHERE series IS NOT NULL;

-- Rich email body and its headers (List-Unsubscribe). The existing trigger keeps both immutable once queued.
ALTER TABLE exchange_emails ADD COLUMN html text;
ALTER TABLE exchange_emails ADD COLUMN headers jsonb NOT NULL DEFAULT '{}';

-- Bound output tables gain two roles: "delivery" (one record per person and update: status, sent and read facts)
-- and "responses" (one record per "I can help"). Like access and engagement they are written only by TrialAgents.
ALTER TABLE exchange_tracked_tables DROP CONSTRAINT exchange_tracked_tables_role_check;
ALTER TABLE exchange_tracked_tables ADD CONSTRAINT exchange_tracked_tables_role_check CHECK(role IN ('access','engagement','delivery','responses'));
ALTER TABLE exchange_tracked_records DROP CONSTRAINT exchange_tracked_records_role_check;
ALTER TABLE exchange_tracked_records ADD CONSTRAINT exchange_tracked_records_role_check CHECK(role IN ('access','engagement','delivery','responses'));

-- "I can help" responses: one row per confirmed click (the page's nonce makes retries count once). Immutable.
CREATE TABLE exchange_ask_responses (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), group_id uuid NOT NULL REFERENCES exchange_groups(id), exchange_id uuid NOT NULL REFERENCES exchanges(id),
 ask_key text NOT NULL, ask_text text NOT NULL, note text NOT NULL DEFAULT '' CHECK(length(note)<=2000), nonce uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(exchange_id,nonce)
);
CREATE INDEX exchange_ask_responses_group ON exchange_ask_responses(group_id,created_at);
CREATE TRIGGER immutable_exchange_ask_responses BEFORE UPDATE OR DELETE ON exchange_ask_responses FOR EACH ROW EXECUTE FUNCTION protect_history();

-- Unsubscribes per series and address (an app's series; the same key in another app is another series). Immutable.
CREATE TABLE exchange_unsubscribes (
 workspace_id uuid NOT NULL REFERENCES workspaces(id), app_id uuid REFERENCES workspace_components(id), series text NOT NULL, email text NOT NULL,
 group_id uuid NOT NULL REFERENCES exchange_groups(id), exchange_id uuid REFERENCES exchanges(id), email_id uuid REFERENCES exchange_emails(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX exchange_unsubscribes_key ON exchange_unsubscribes(workspace_id,coalesce(app_id,'00000000-0000-0000-0000-000000000000'::uuid),series,email);
CREATE TRIGGER immutable_exchange_unsubscribes BEFORE UPDATE OR DELETE ON exchange_unsubscribes FOR EACH ROW EXECUTE FUNCTION protect_history();

-- Recipient capability: room pages may also write ask responses; they read their own.
CREATE OR REPLACE FUNCTION trialy_security.exchange_permission(w uuid,relation_name text,writing boolean DEFAULT false) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE x record; g record; after_deadline boolean;
BEGIN
 SELECT * INTO x FROM trialy_security.current_exchange() WHERE workspace_id=w;
 IF NOT FOUND THEN RETURN false; END IF;
 SELECT kind,messages_after_deadline INTO g FROM exchange_groups WHERE id=x.group_id;
 after_deadline:=coalesce(x.expires_at<=now(),false);
 IF writing THEN
  IF relation_name IN ('exchange_events','audit_events','exchange_verifications','exchange_message_reads','exchange_emails','exchange_visits','exchange_views') THEN RETURN true; END IF;
  IF g.kind='room' THEN RETURN relation_name IN ('exchange_questions','exchange_files','exchange_ask_responses'); END IF;
  IF relation_name='exchange_messages' THEN RETURN NOT after_deadline OR coalesce(g.messages_after_deadline,false); END IF;
  RETURN NOT after_deadline AND relation_name IN ('exchange_drafts','exchange_submissions','exchange_files');
 END IF;
 RETURN relation_name IN ('workspaces','workspace_access','workspace_nodes','entity_types','exchange_groups','exchanges','exchange_drafts','exchange_submissions','exchange_files','exchange_file_acceptances','exchange_acceptances','exchange_messages','exchange_message_reads','exchange_events','exchange_verifications','document_versions','exchange_visits','exchange_views','exchange_questions','exchange_answers','exchange_ask_responses');
END $$;

-- Series archive (U4): earlier updates of a person's series that were sent to one of their addresses, newest first.
-- The caller proves the person's page with its link (token hash); the page must be live as for current_exchange().
-- A revoked or ended exchange, an archived group and an archived app drop out; nothing else is shown.
CREATE FUNCTION trialy_security.exchange_series_items(link_hash text) RETURNS TABLE(exchange_id uuid,title text,sent_at timestamptz,link_token text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 WITH cur AS (SELECT e.id,e.recipient_emails,g.series,g.app_id,g.workspace_id FROM exchanges e JOIN exchange_groups g ON g.id=e.group_id JOIN workspaces ws ON ws.id=e.workspace_id
  WHERE e.token_hash=link_hash AND g.series IS NOT NULL AND e.revoked_at IS NULL AND NOT g.archived AND NOT ws.archived AND (e.expires_at IS NULL OR e.expires_at>now())
  AND (g.app_id IS NULL OR NOT EXISTS(SELECT 1 FROM workspace_components c WHERE c.id=g.app_id AND (c.archived OR c.deleted_at IS NOT NULL)))),
 own AS (SELECT coalesce((SELECT min(v.created_at) FROM exchange_events v JOIN cur ON v.exchange_id=cur.id WHERE v.kind='email_sent' AND v.detail->>'emailType'='update'),now()) AS at)
 SELECT x.id,g.title,s.at,x.link_token FROM cur CROSS JOIN own
 JOIN exchange_groups g ON g.workspace_id=cur.workspace_id AND g.series=cur.series AND g.app_id IS NOT DISTINCT FROM cur.app_id AND g.kind='room' AND NOT g.archived
 JOIN exchanges x ON x.group_id=g.id AND x.id<>cur.id AND x.revoked_at IS NULL AND (x.expires_at IS NULL OR x.expires_at>now())
 CROSS JOIN LATERAL (SELECT min(v.created_at) AS at FROM exchange_events v WHERE v.exchange_id=x.id AND v.kind='email_sent' AND v.detail->>'emailType'='update' AND cur.recipient_emails ? (v.detail->>'to')) s
 WHERE s.at IS NOT NULL AND s.at<own.at
 AND (g.app_id IS NULL OR NOT EXISTS(SELECT 1 FROM workspace_components c WHERE c.id=g.app_id AND (c.archived OR c.deleted_at IS NOT NULL)))
 ORDER BY s.at DESC LIMIT 50
$$;

-- Content images (U1/U2): readable by anyone holding the update's image address while the update, its app and workspace are live.
CREATE FUNCTION trialy_security.exchange_content_image(image_ref text,version_ref uuid) RETURNS TABLE(filename text,mime text,checksum text,bytes bytea) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT d.filename,d.mime,d.checksum,p.bytes FROM exchange_groups g JOIN workspaces ws ON ws.id=g.workspace_id JOIN document_versions d ON d.id=version_ref JOIN document_payloads p ON p.version_id=d.id
 WHERE g.image_token=image_ref AND g.content IS NOT NULL AND NOT g.archived AND NOT ws.archived
 AND g.content->'images' @> jsonb_build_array(jsonb_build_object('versionId',version_ref::text))
 AND (g.app_id IS NULL OR NOT EXISTS(SELECT 1 FROM workspace_components c WHERE c.id=g.app_id AND (c.archived OR c.deleted_at IS NOT NULL)))
$$;

-- One-click unsubscribe (U2, RFC 8058): the email's own id is the capability. apply=false describes it (the
-- confirmation page), apply=true records it once per series and address, with an exchange event and audit entry.
-- It keeps working after revocation or archival: leaving a list never depends on access.
CREATE FUNCTION trialy_security.exchange_unsubscribe(email_ref uuid,apply boolean) RETURNS TABLE(series_label text,sender_company text,email text,unsubscribed_at timestamptz) LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE m record; done timestamptz;
BEGIN
 SELECT x.id,x.to_email,x.exchange_id,g.id AS group_id,g.workspace_id,g.app_id,g.series,coalesce(nullif(g.series_name,''),g.title) AS label,g.sender_company,g.owner_id,ws.tenant_id
  INTO m FROM exchange_emails x JOIN exchange_groups g ON g.id=x.group_id JOIN workspaces ws ON ws.id=g.workspace_id WHERE x.id=email_ref AND g.series IS NOT NULL;
 IF NOT FOUND THEN RETURN; END IF;
 SELECT u.created_at INTO done FROM exchange_unsubscribes u WHERE u.workspace_id=m.workspace_id AND u.app_id IS NOT DISTINCT FROM m.app_id AND u.series=m.series AND u.email=m.to_email;
 IF apply AND done IS NULL THEN
  INSERT INTO exchange_unsubscribes(workspace_id,app_id,series,email,group_id,exchange_id,email_id) VALUES(m.workspace_id,m.app_id,m.series,m.to_email,m.group_id,m.exchange_id,m.id) RETURNING created_at INTO done;
  IF m.exchange_id IS NOT NULL THEN
   INSERT INTO exchange_events(id,workspace_id,exchange_id,kind,detail) VALUES(gen_random_uuid(),m.workspace_id,m.exchange_id,'unsubscribed',jsonb_build_object('series',m.series,'email',m.to_email,'emailId',m.id));
  END IF;
  INSERT INTO audit_events(id,workspace_id,tenant_id,actor_id,action,object_id,origin,after_value) VALUES(gen_random_uuid(),m.workspace_id,m.tenant_id,m.owner_id,'exchange.unsubscribed',m.exchange_id,'external',jsonb_build_object('series',m.series,'email',m.to_email,'emailId',m.id,'groupId',m.group_id,'exchangeId',m.exchange_id));
 END IF;
 RETURN QUERY SELECT m.label::text,m.sender_company::text,m.to_email::text,done;
END $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA trialy_security FROM PUBLIC;

ALTER TABLE exchange_ask_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY workspace_read ON exchange_ask_responses FOR SELECT USING (trialy_security.workspace_permission(workspace_id) OR trialy_security.exchange_permission(workspace_id,'exchange_ask_responses'));
CREATE POLICY workspace_insert ON exchange_ask_responses FOR INSERT WITH CHECK (trialy_security.workspace_permission(workspace_id,true) OR trialy_security.exchange_permission(workspace_id,'exchange_ask_responses',true));
-- A person reads and writes only their own responses; who responded is visible to the workspace only.
CREATE POLICY exact_exchange_ask_response ON exchange_ask_responses AS RESTRICTIVE USING (trialy_security.workspace_permission(workspace_id) OR exchange_id=trialy_security.exchange_id()) WITH CHECK (trialy_security.workspace_permission(workspace_id,true) OR (exchange_id=trialy_security.exchange_id() AND group_id=trialy_security.exchange_group_id()));
ALTER TABLE exchange_unsubscribes ENABLE ROW LEVEL SECURITY;
CREATE POLICY workspace_scope ON exchange_unsubscribes FOR SELECT USING (trialy_security.workspace_permission(workspace_id));
