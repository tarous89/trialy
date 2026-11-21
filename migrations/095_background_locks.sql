-- Session 6, package 6.7 (P7): background work never slows people.
-- Database-triggered automations read a workspace's newest event before scanning; this index answers that read
-- and the scans that follow. Build it at a quiet time on large installations (O7): it briefly blocks event writes.
CREATE INDEX IF NOT EXISTS audit_workspace_sequence ON audit_events(workspace_id,event_sequence);
