-- Immutable field deltas, including unset/null distinctions and exact authorization.
CREATE TABLE record_field_changes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES workspaces(id),
 record_id uuid NOT NULL REFERENCES records(id), type_id uuid NOT NULL REFERENCES entity_types(id),
 record_version integer NOT NULL, field_key text NOT NULL,
 before_present boolean NOT NULL, before_value jsonb, after_present boolean NOT NULL, after_value jsonb,
 actor_id uuid REFERENCES users(id), origin text NOT NULL, "authorization" jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX record_field_changes_workspace ON record_field_changes(workspace_id,created_at DESC,id);
CREATE INDEX record_field_changes_record ON record_field_changes(record_id,record_version);
CREATE TRIGGER immutable_field_change BEFORE UPDATE OR DELETE ON record_field_changes FOR EACH ROW EXECUTE FUNCTION protect_history();
CREATE FUNCTION log_record_fields() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE old_data jsonb; k text; auth jsonb;
BEGIN
 old_data := CASE WHEN TG_OP='INSERT' THEN '{}'::jsonb ELSE OLD.data END;
 auth := coalesce(nullif(current_setting('trialy.write_authorization',true),''),'{}')::jsonb;
 FOR k IN SELECT jsonb_object_keys(old_data || NEW.data) LOOP
  IF (old_data ? k) IS DISTINCT FROM (NEW.data ? k) OR (old_data->k) IS DISTINCT FROM (NEW.data->k) THEN
   INSERT INTO record_field_changes(workspace_id,record_id,type_id,record_version,field_key,before_present,before_value,after_present,after_value,actor_id,origin,"authorization")
   VALUES(NEW.workspace_id,NEW.id,NEW.type_id,NEW.version,k,old_data ? k,old_data->k,NEW.data ? k,NEW.data->k,(auth->>'actorId')::uuid,coalesce(auth->>'origin','unattributed'),auth);
  END IF;
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER record_field_audit AFTER INSERT OR UPDATE OF data ON records FOR EACH ROW EXECUTE FUNCTION log_record_fields();
ALTER TABLE data_previews ADD COLUMN summary jsonb;
ALTER TABLE foundation_grants ADD COLUMN authorization_version integer NOT NULL DEFAULT 0;
ALTER TABLE foundation_grants ADD COLUMN expires_at timestamptz;
ALTER TABLE foundation_grants ADD COLUMN field_scope jsonb;
ALTER TABLE foundation_grants ADD COLUMN schema_stamp text;
-- Historical rows are retained; pre-contract grants cannot automatically write.

ALTER TABLE foundation_previews ADD COLUMN kind text NOT NULL DEFAULT 'function' CHECK(kind IN ('function','grant','schedule'));
