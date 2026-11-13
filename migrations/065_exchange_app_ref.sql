-- External exchange: an app's own reference for a group (for example "request:<record id>:rfp"), so an app finds its
-- rounds from the exchange itself instead of copying group IDs into its records. Additive; existing groups keep NULL.
ALTER TABLE exchange_groups ADD COLUMN app_ref text;
CREATE INDEX exchange_groups_app_ref ON exchange_groups(workspace_id,app_id,app_ref) WHERE app_ref IS NOT NULL;
