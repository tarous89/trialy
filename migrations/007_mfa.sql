ALTER TABLE local_accounts ADD COLUMN mfa_secret text;
ALTER TABLE local_accounts ADD COLUMN mfa_last_step bigint NOT NULL DEFAULT -1;
ALTER TABLE local_accounts ADD COLUMN recovery_hashes jsonb NOT NULL DEFAULT '[]';
ALTER TABLE account_security_events DROP CONSTRAINT account_security_events_action_check;
ALTER TABLE account_security_events ADD CONSTRAINT account_security_events_action_check CHECK(action IN ('password_changed','access_revoked','mfa_enabled','mfa_disabled','recovery_code_used'));
