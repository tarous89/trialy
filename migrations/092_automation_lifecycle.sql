-- Session 6, package 6.2 (A9, A11): an automation can be archived and restored on its own, not only with its app.
-- An archived automation is off, runs nothing and is hidden from lists; restoring it brings it back switched off.
ALTER TABLE app_monitors ADD COLUMN archived_at timestamptz;
ALTER TABLE app_actions ADD COLUMN archived_at timestamptz;
CREATE INDEX app_monitors_archived ON app_monitors(workspace_id,archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX app_actions_archived ON app_actions(workspace_id,archived_at) WHERE archived_at IS NOT NULL;
