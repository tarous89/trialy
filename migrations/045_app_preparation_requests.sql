-- Creation request lookup stays scoped to its owner and workspace.
CREATE INDEX workspace_preview_request_idx ON workspace_previews(workspace_id,user_id,(body->'preparation'->>'requestKey')) WHERE body->'preparation'->>'requestKey' IS NOT NULL;
CREATE UNIQUE INDEX workspace_receipt_request_idx ON workspace_receipts(workspace_id,user_id,(result->'preparation'->>'requestKey')) WHERE result->'preparation'->>'requestKey' IS NOT NULL;
