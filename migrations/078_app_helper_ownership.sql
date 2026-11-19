-- B2/T1: a helper installed with an app belongs to that app. It is listed under the app, never as its own Apps entry.
-- No row is deleted: audit events and immutable revisions keep referencing replaced helpers.
ALTER TABLE foundation_functions ADD COLUMN app_id uuid, ADD COLUMN retired_at timestamptz;
UPDATE foundation_functions f SET app_id=(r.body->'scope'->>'appId')::uuid
FROM foundation_revisions r WHERE r.function_id=f.id AND r.version=f.version
 AND r.body->'scope'->>'appId' ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
CREATE INDEX foundation_functions_app ON foundation_functions(app_id) WHERE app_id IS NOT NULL;
-- A helper is in use while its app's execution list names one of its revisions.
CREATE FUNCTION trialy_security.app_helper_in_use(fn uuid,execution jsonb) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT EXISTS(SELECT 1 FROM foundation_revisions r JOIN jsonb_array_elements(coalesce(execution,'[]')) e ON e->>'revisionId'=r.id::text WHERE r.function_id=fn)
$$;
REVOKE ALL ON FUNCTION trialy_security.app_helper_in_use(uuid,jsonb) FROM PUBLIC;
UPDATE foundation_functions f SET retired_at=now() WHERE f.app_id IS NOT NULL
 AND NOT EXISTS(SELECT 1 FROM workspace_components c WHERE c.id=f.app_id AND c.workspace_id=f.workspace_id AND trialy_security.app_helper_in_use(f.id,c.execution));
-- Saving, copying or restoring an app retires the helpers it replaced and revives the ones it uses again.
CREATE FUNCTION sync_app_helper_retirement() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 UPDATE foundation_functions f SET retired_at=CASE WHEN trialy_security.app_helper_in_use(f.id,NEW.execution) THEN NULL ELSE now() END
 WHERE f.app_id=NEW.id AND f.workspace_id=NEW.workspace_id AND (f.retired_at IS NULL)<>trialy_security.app_helper_in_use(f.id,NEW.execution);
 RETURN NEW;
END $$;
CREATE TRIGGER app_helper_retirement AFTER INSERT OR UPDATE OF execution ON workspace_components FOR EACH ROW EXECUTE FUNCTION sync_app_helper_retirement();
