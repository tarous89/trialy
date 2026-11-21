-- Session 6, package 6.8 (X1, D7, D32): every way of sharing outside the team has exactly one purpose.
--  publish:  prepared content, read-only, for anyone with the link (view links, public app links).
--  collect:  a private submission page per respondent (form links, request exchanges with a form or requested files;
--            the request may carry the brief and documents the respondent needs).
--  disclose: selected documents or updates for named recipients (rooms, document-only requests).
-- An email app invitation is a teammate invitation ('invite'), not external sharing.
-- The mode is derived when a row is written, so every path is covered, and checked against the configuration.

-- Links.
ALTER TABLE external_links ADD COLUMN mode text;
UPDATE external_links SET mode=CASE kind WHEN 'view' THEN 'publish' ELSE 'collect' END;
CREATE FUNCTION trialy_security.external_link_mode() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN IF NEW.mode IS NULL THEN NEW.mode:=CASE NEW.kind WHEN 'view' THEN 'publish' ELSE 'collect' END; END IF; RETURN NEW; END $$;
CREATE TRIGGER external_links_mode BEFORE INSERT OR UPDATE OF kind,mode ON external_links FOR EACH ROW EXECUTE FUNCTION trialy_security.external_link_mode();
ALTER TABLE external_links ALTER COLUMN mode SET NOT NULL;
ALTER TABLE external_links ADD CONSTRAINT external_links_one_mode CHECK ((kind='view' AND mode='publish') OR (kind='form' AND mode='collect'));

-- Exchange groups. Confidential documents (shared behind an acknowledgement or a signed document) always ask the recipient
-- to verify their email (X1 limit).
ALTER TABLE exchange_groups ADD COLUMN mode text;
UPDATE exchange_groups SET mode=CASE WHEN kind='room' THEN 'disclose' WHEN type_id IS NOT NULL OR questions<>'[]'::jsonb OR slots<>'[]'::jsonb THEN 'collect' ELSE 'disclose' END;
-- Migration report: groups whose recipients will now be asked to verify their email on their next visit.
DO $$ DECLARE n integer; BEGIN
 SELECT count(*) INTO n FROM exchange_groups WHERE NOT verify_email AND documents<>'[]'::jsonb AND gate<>'none';
 RAISE NOTICE 'sharing modes: % exchange groups now verify recipient email',n;
END $$;
UPDATE exchange_groups SET verify_email=true WHERE NOT verify_email AND documents<>'[]'::jsonb AND gate<>'none';
CREATE FUNCTION trialy_security.exchange_group_mode() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
 IF NEW.mode IS NULL THEN NEW.mode:=CASE WHEN NEW.kind='room' THEN 'disclose' WHEN NEW.type_id IS NOT NULL OR NEW.questions<>'[]'::jsonb OR NEW.slots<>'[]'::jsonb THEN 'collect' ELSE 'disclose' END; END IF;
 IF NEW.documents<>'[]'::jsonb AND NEW.gate<>'none' THEN NEW.verify_email:=true; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER exchange_groups_mode BEFORE INSERT OR UPDATE ON exchange_groups FOR EACH ROW EXECUTE FUNCTION trialy_security.exchange_group_mode();
ALTER TABLE exchange_groups ALTER COLUMN mode SET NOT NULL;
ALTER TABLE exchange_groups ADD CONSTRAINT exchange_groups_one_mode CHECK (
 mode IN ('collect','disclose')
 AND (kind<>'room' OR mode='disclose')
 AND (mode<>'collect' OR kind='request')
 AND (mode<>'disclose' OR kind='room' OR (type_id IS NULL AND questions='[]'::jsonb AND slots='[]'::jsonb)));

-- App shares. Editing through a public link is removed (D32): existing public edit links become read-only.
ALTER TABLE app_shares ADD COLUMN mode text;
UPDATE app_shares SET config=jsonb_set(config,'{mode}','"view"')||jsonb_build_object('bindings',coalesce((SELECT jsonb_agg(b||'{"writable":[]}'::jsonb) FROM jsonb_array_elements(config->'bindings') b),'[]'::jsonb))
 WHERE kind='public' AND config->>'mode'='edit';
UPDATE workspaces ws SET permission_rules=(SELECT coalesce(jsonb_agg(CASE WHEN r.x->>'kind'='tool' AND r.x->>'subject' IN (SELECT s.principal_id::text FROM app_shares s WHERE s.kind='public' AND s.workspace_id=ws.id AND s.principal_id IS NOT NULL) THEN jsonb_set(r.x,'{write}','"deny"') ELSE r.x END ORDER BY r.i),'[]'::jsonb) FROM jsonb_array_elements(ws.permission_rules) WITH ORDINALITY r(x,i)),access_version=access_version+1
 WHERE EXISTS(SELECT 1 FROM jsonb_array_elements(ws.permission_rules) x JOIN app_shares s ON s.principal_id::text=x->>'subject' AND s.kind='public' AND s.workspace_id=ws.id WHERE x->>'kind'='tool' AND x->>'write'='allow');
UPDATE app_members m SET role='viewer' WHERE role='editor' AND user_id IN (SELECT principal_id FROM app_shares WHERE kind='public' AND principal_id IS NOT NULL);
UPDATE app_shares SET mode=CASE kind WHEN 'public' THEN 'publish' ELSE 'invite' END;
CREATE FUNCTION trialy_security.app_share_mode() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN IF NEW.mode IS NULL THEN NEW.mode:=CASE NEW.kind WHEN 'public' THEN 'publish' ELSE 'invite' END; END IF; RETURN NEW; END $$;
CREATE TRIGGER app_shares_mode BEFORE INSERT OR UPDATE OF kind,mode ON app_shares FOR EACH ROW EXECUTE FUNCTION trialy_security.app_share_mode();
ALTER TABLE app_shares ALTER COLUMN mode SET NOT NULL;
ALTER TABLE app_shares ADD CONSTRAINT app_shares_one_mode CHECK ((kind='public' AND mode='publish' AND coalesce(config->>'mode','view')='view') OR (kind='email' AND mode='invite'));
