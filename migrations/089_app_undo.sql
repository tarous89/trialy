-- G8, A10, D18 (package 4.6): Undo inside an app, for the person's own recent actions while the app stays open.
-- One row per saved action. The reverse change is computed by the server when the action is saved; the client never
-- supplies earlier values. An entry is usable only by the person who made the change, from the same open app view,
-- for 60 minutes, and only while every record is still at the version the action produced. History stays append-only:
-- an Undo is a new audited change.
CREATE TABLE app_undo_entries (
 id uuid PRIMARY KEY,
 workspace_id uuid NOT NULL REFERENCES workspaces(id),
 app_id uuid NOT NULL REFERENCES workspace_components(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES users(id),
 view_id uuid NOT NULL,
 request_key uuid NOT NULL,
 label text NOT NULL CHECK(char_length(label)<=200),
 inverse jsonb NOT NULL,
 results jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 used_at timestamptz,
 -- The record versions this entry's Undo produced. A record changed only by Undo of later actions can still be undone, in order.
 undone jsonb,
 UNIQUE(user_id,request_key)
);
CREATE INDEX app_undo_entries_view ON app_undo_entries(workspace_id,user_id,view_id,created_at DESC);

ALTER TABLE app_undo_entries ENABLE ROW LEVEL SECURITY;
-- Only the person's own entries, in a workspace they can open.
CREATE POLICY app_undo_entries_own ON app_undo_entries FOR ALL
 USING(user_id=trialy_security.actor_id() AND trialy_security.workspace_permission(workspace_id))
 WITH CHECK(user_id=trialy_security.actor_id() AND trialy_security.workspace_permission(workspace_id));
