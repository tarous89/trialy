-- E5: an email step that belongs to one research automation. The email keeps its
-- own action row and delivery ledger; follow_up_of groups it with its research.
ALTER TABLE app_actions ADD COLUMN follow_up_of uuid REFERENCES app_monitors(id);
CREATE INDEX app_actions_follow_up_of ON app_actions(follow_up_of) WHERE follow_up_of IS NOT NULL AND deleted_at IS NULL;
ALTER TABLE automation_recipe_setups ADD COLUMN follow_up_id uuid, ADD COLUMN follow_up_version integer;

-- E6: a dynamic binding takes the app's current fields at each run, so removing a field from the app
-- doesn't retire it; only removing the whole table does. Static bindings keep the 059 behavior.
CREATE OR REPLACE FUNCTION app_config_uses_removed_binding(config jsonb, removed jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path=pg_catalog,public AS $$
 SELECT EXISTS(SELECT 1 FROM jsonb_array_elements(removed) d WHERE
  EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(config->'readBindings','[]')) b
   WHERE b->>'typeId'=d->>'typeId' AND ((d->>'whole')::boolean OR (coalesce(b->>'dynamic','false')<>'true' AND EXISTS(SELECT 1 FROM jsonb_array_elements_text(d->'fields') k WHERE b->'fields' ? k))))
  OR (config->>'recordTypeId'=d->>'typeId' AND ((d->>'whole')::boolean OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(d->'fields') k WHERE config->'fields' ? k)))
  OR EXISTS(SELECT 1 FROM (VALUES(config->'trigger'),(config->'automation'->'trigger')) AS triggers(t)
   WHERE t->>'typeId'=d->>'typeId' AND ((d->>'whole')::boolean OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(d->'fields') k WHERE t->'fields' ? k OR t->>'field'=k OR t->'becomes'->>'field'=k)))
 );
$$;
REVOKE ALL ON FUNCTION app_config_uses_removed_binding(jsonb,jsonb) FROM PUBLIC;
