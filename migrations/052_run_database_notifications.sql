-- Each completed run retains its own report while recipient rate limits still
-- apply across batches. Existing record-change notifications continue to coalesce.
ALTER TABLE app_notification_batches ADD COLUMN source_run_id uuid REFERENCES app_monitor_runs(id);
DROP INDEX notification_open_batch;
CREATE UNIQUE INDEX notification_open_batch ON app_notification_batches
 (action_id,action_version,coalesce(source_run_id,'00000000-0000-0000-0000-000000000000'::uuid)) WHERE status='collecting';
CREATE INDEX monitoring_completion_events ON audit_events(workspace_id,event_sequence) WHERE action='monitoring.finished';
