-- Anonymous work is isolated from account workspaces until a human saves it.
CREATE TABLE guest_drafts (
 id uuid PRIMARY KEY,
 capability_hash text NOT NULL,
 body jsonb,
 digest text NOT NULL,
 expires_at timestamptz NOT NULL DEFAULT now()+interval '24 hours',
 claimed_by uuid REFERENCES users(id),
 receipt jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((claimed_by IS NULL) = (receipt IS NULL))
);
CREATE INDEX guest_drafts_expiry ON guest_drafts(expires_at);
