CREATE TABLE workspace_invitations (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), owner_id uuid NOT NULL REFERENCES users(id),
 token_hash text NOT NULL UNIQUE, label text NOT NULL, role text NOT NULL CHECK(role IN ('editor','viewer','inspector')),
 allowed_types jsonb NOT NULL, expires_at timestamptz NOT NULL, revoked_at timestamptz,
 accepted_by uuid REFERENCES users(id), accepted_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((accepted_by IS NULL) = (accepted_at IS NULL))
);
ALTER TABLE external_links ADD COLUMN questions jsonb NOT NULL DEFAULT '[]';
