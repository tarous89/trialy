-- A6, B1 (package 3.1): pending app changes are durable until the person resolves them.
-- A pending app change no longer expires (D10): its expiry is set to the last representable day, 9999-12-31,
-- so every existing "expires_at>now()" check keeps working unchanged. When the app moved underneath it, it is shown as
-- "needs preparing again" and can be discarded, but never approved blind: that state is computed when
-- the change is read, so no stored status can go stale.
-- The columns are derived from the preview body on insert, so every path that writes a preview
-- (prepare, revise, finalize, data-access step) is covered without a separate code change, and the
-- runtime role keeps its existing insert/delete-only permissions on this table.
ALTER TABLE workspace_previews
 ADD COLUMN origin text CHECK(origin IN ('human','ai','worker')),
 ADD COLUMN assistant text CHECK(assistant IN ('chatgpt','claude')),
 ADD COLUMN component_id uuid,
 ADD COLUMN change_class text NOT NULL DEFAULT 'other' CHECK(change_class IN ('new','revision','assistant','other')),
 ADD COLUMN review_group text,
 ADD COLUMN base_version integer,
 ADD COLUMN prepared_at timestamptz NOT NULL DEFAULT now();

CREATE FUNCTION trialy_security.classify_workspace_preview() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE op jsonb:=NEW.body->'operation'; kind text:=NEW.body->'operation'->>'kind';
BEGIN
 NEW.origin:=coalesce(NEW.body->>'origin',NEW.origin);
 NEW.assistant:=coalesce(NEW.body->>'assistant',NEW.assistant);
 IF kind IN ('create_tracker','save_component') THEN
  NEW.component_id:=nullif(op->>'componentId','')::uuid;
  NEW.base_version:=CASE WHEN op ? 'expectedVersion' AND jsonb_typeof(op->'expectedVersion')='number' THEN (op->>'expectedVersion')::integer END;
  -- A6 labels: Save / Discard for a new app, Approve / Decline for an assistant's change, Publish / Discard otherwise.
  NEW.change_class:=CASE WHEN NEW.component_id IS NULL THEN 'new' WHEN NEW.origin='ai' THEN 'assistant' ELSE 'revision' END;
  -- D9: every pending change to one app forms one review.
  NEW.review_group:=coalesce(NEW.component_id,NEW.id)::text;
  NEW.expires_at:='9999-12-31 00:00:00+00';
 ELSE
  NEW.change_class:='other';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER workspace_previews_classify BEFORE INSERT ON workspace_previews FOR EACH ROW EXECUTE FUNCTION trialy_security.classify_workspace_preview();

-- Existing rows: classify from their bodies. Rows prepared by an assistant before this release did not
-- record their origin; an unfinished draft can only come from an assistant (people's changes are ready at once).
UPDATE workspace_previews SET
 component_id=nullif(body->'operation'->>'componentId','')::uuid,
 base_version=CASE WHEN jsonb_typeof(body->'operation'->'expectedVersion')='number' THEN (body->'operation'->>'expectedVersion')::integer END,
 origin=CASE WHEN body->>'reviewState'='draft' OR body ? 'designQuality' THEN 'ai' END
WHERE body->'operation'->>'kind' IN ('create_tracker','save_component');
UPDATE workspace_previews SET
 change_class=CASE WHEN component_id IS NULL THEN 'new' WHEN origin='ai' THEN 'assistant' ELSE 'revision' END,
 review_group=coalesce(component_id,id)::text,
 expires_at='9999-12-31 00:00:00+00'
WHERE body->'operation'->>'kind' IN ('create_tracker','save_component') AND expires_at>now();

CREATE INDEX workspace_previews_pending_apps ON workspace_previews(workspace_id,user_id,component_id) WHERE change_class<>'other';
