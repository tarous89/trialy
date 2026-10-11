-- Run as the migration/table owner in the target database. Does not create credentials.
-- A separately provisioned non-owner login must receive trialy_runtime membership.
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='trialy_runtime') THEN CREATE ROLE trialy_runtime NOLOGIN; END IF;
END $$;
GRANT USAGE ON SCHEMA public TO trialy_runtime;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO trialy_runtime;
GRANT INSERT ON users,tenants,memberships,workspaces,workspace_access,entity_types,records,document_versions,document_payloads,extractions,revisions,audit_events,commit_receipts,jobs,action_grants,saved_views,approvals,session,automations,automation_runs,local_accounts,oauth_data,oauth_tokens,document_controls,acknowledgements,account_acceptances,account_security_events,document_access,external_links,form_submissions,submission_acceptances,template_installations,folder_access,workspace_invitations,submission_files,submission_file_acceptances,record_review_requests,record_review_decisions,inbox_reminders,inbox_read_receipts TO trialy_runtime;
GRANT UPDATE ON users,memberships,workspaces,workspace_access,entity_types,records,extractions,jobs,action_grants,saved_views,session,automations,local_accounts,oauth_data,oauth_tokens,document_controls,document_access,external_links,template_installations,folder_access,workspace_invitations TO trialy_runtime;
GRANT DELETE ON session,oauth_data,oauth_tokens,workspace_access TO trialy_runtime;
-- No DELETE/UPDATE on original payloads, original metadata, revisions, approvals,
-- audit, acknowledgements, accepted notices or completed automation runs.
-- No table ownership, CREATE, TRUNCATE or role administration for this role.

GRANT USAGE, SELECT ON SEQUENCE audit_events_event_sequence_seq TO trialy_runtime;

GRANT INSERT ON foundation_functions,foundation_revisions,foundation_grants,foundation_schedules,foundation_receipts,foundation_runs,foundation_previews TO trialy_runtime;
GRANT UPDATE ON foundation_functions,foundation_grants,foundation_schedules,foundation_runs TO trialy_runtime;
GRANT DELETE ON foundation_runs,foundation_previews TO trialy_runtime;

GRANT INSERT ON workspace_nodes,workspace_components,maintenance_scopes,workspace_previews,workspace_receipts,identity_links,record_observations TO trialy_runtime;
GRANT UPDATE ON workspace_nodes,workspace_components,maintenance_scopes,identity_links TO trialy_runtime;
GRANT DELETE ON workspace_previews TO trialy_runtime;

GRANT INSERT, DELETE ON data_previews TO trialy_runtime;

GRANT INSERT ON record_field_changes TO trialy_runtime;
