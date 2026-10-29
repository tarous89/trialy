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

GRANT SELECT,INSERT,UPDATE ON project_records TO trialy_runtime;
GRANT SELECT,INSERT ON record_facts,record_fact_retractions TO trialy_runtime;

GRANT SELECT,INSERT,UPDATE ON cross_table_links TO trialy_runtime;

GRANT SELECT,INSERT ON table_mappings,table_mapping_revocations TO trialy_runtime;

GRANT SELECT,INSERT,UPDATE,DELETE ON worker_health TO trialy_runtime;

-- Anonymous preview lifecycle and durable claim receipts (migration 032).
GRANT SELECT,INSERT,UPDATE,DELETE ON guest_drafts TO trialy_runtime;

-- RLS helpers have fixed search paths and expose booleans, never row contents.
GRANT USAGE ON SCHEMA trialy_security TO trialy_runtime;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA trialy_security TO trialy_runtime;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='trialy_worker') THEN CREATE ROLE trialy_worker NOLOGIN; END IF;
END $$;
GRANT trialy_runtime TO trialy_worker;
-- Only the separately provisioned worker login gets trialy_worker membership.
-- PostgreSQL requires an UPDATE privilege for SELECT ... FOR UPDATE on reviews.
-- Limit it to the identifier column; application code never edits review bodies.
GRANT UPDATE(id) ON data_previews,workspace_previews,foundation_previews TO trialy_runtime;

GRANT INSERT ON support_requests TO trialy_runtime;

-- Additive connector storage (migration 044); no delete privilege on receipts or reviews.
GRANT SELECT,INSERT,UPDATE ON connectors,connector_credentials,connector_reviews,connector_invocations TO trialy_runtime;
