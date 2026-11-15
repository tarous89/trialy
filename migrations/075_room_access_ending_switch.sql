-- Data Room 1.1.0: a room's "access ending" reminder (a workspace notification 7 days before a person's access ends) can be switched off.
ALTER TABLE exchange_groups ADD COLUMN IF NOT EXISTS notify_access_ending boolean NOT NULL DEFAULT true;
