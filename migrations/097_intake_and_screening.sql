-- Session 6, package 6.9 (X2, D33–D36): direct intake, review of everything else, file screening and rejections.

-- D33: a form link that only creates new records may take valid responses straight in ("direct").
-- Everything else (changes to existing records, every file) still goes to a reviewer.
ALTER TABLE external_links ADD COLUMN intake text NOT NULL DEFAULT 'review' CHECK (intake IN ('review','direct'));
-- D36: a record created by direct intake never starts an assistant run; the flag lets triggers tell.
ALTER TABLE submission_acceptances ADD COLUMN intake boolean NOT NULL DEFAULT false;

-- D35: screening status on every file that comes in from outside. Files stored before screening existed
-- are screened the first time someone opens or accepts them.
ALTER TABLE submission_files ADD COLUMN screening_status text NOT NULL DEFAULT 'not_screened' CHECK (screening_status IN ('not_screened','passed','failed'));
ALTER TABLE submission_files ADD COLUMN screening_reason text;
ALTER TABLE exchange_files ADD COLUMN screening_status text NOT NULL DEFAULT 'not_screened' CHECK (screening_status IN ('not_screened','passed','failed'));
ALTER TABLE exchange_files ADD COLUMN screening_reason text;

-- Rejections by a reviewer, with the reason the submitter sees.
CREATE TABLE external_rejections (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id),
 object_kind text NOT NULL CHECK (object_kind IN ('form_submission','exchange_submission','exchange_file','submission_file')),
 object_id uuid NOT NULL, reason text NOT NULL, rejected_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (object_kind,object_id)
);
ALTER TABLE external_rejections ENABLE ROW LEVEL SECURITY;
CREATE POLICY rejection_scope ON external_rejections FOR ALL USING (trialy_security.workspace_permission(workspace_id)) WITH CHECK (trialy_security.workspace_permission(workspace_id,true));

-- Received files stay immutable; only a first screening result may be recorded on a file stored before screening existed.
CREATE OR REPLACE FUNCTION protect_exchange_file() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'History is append-only'; END IF;
 IF (to_jsonb(OLD)-ARRAY['submission_id','removed_at','screening_status','screening_reason']) IS DISTINCT FROM (to_jsonb(NEW)-ARRAY['submission_id','removed_at','screening_status','screening_reason']) OR (OLD.submission_id IS NOT NULL AND NEW.submission_id IS DISTINCT FROM OLD.submission_id) OR (OLD.submission_id IS NOT NULL AND NEW.removed_at IS NOT NULL) THEN RAISE EXCEPTION 'Received file is immutable'; END IF;
 IF (OLD.screening_status,OLD.screening_reason) IS DISTINCT FROM (NEW.screening_status,NEW.screening_reason) AND OLD.screening_status<>'not_screened' THEN RAISE EXCEPTION 'A screening result is recorded once'; END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION protect_submission_file() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'History is append-only'; END IF;
 IF (to_jsonb(OLD)-ARRAY['screening_status','screening_reason']) IS DISTINCT FROM (to_jsonb(NEW)-ARRAY['screening_status','screening_reason']) OR OLD.screening_status<>'not_screened' THEN RAISE EXCEPTION 'History is append-only'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER immutable_submission_files ON submission_files;
CREATE TRIGGER immutable_submission_files BEFORE UPDATE OR DELETE ON submission_files FOR EACH ROW EXECUTE FUNCTION protect_submission_file();
