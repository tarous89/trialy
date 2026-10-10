ALTER TABLE audit_events ADD COLUMN event_sequence bigserial;
CREATE UNIQUE INDEX audit_event_sequence ON audit_events(event_sequence);
ALTER TABLE automations ADD COLUMN schedule jsonb;
ALTER TABLE automations ADD COLUMN event_cursor bigint NOT NULL DEFAULT 0;
