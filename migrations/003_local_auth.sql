CREATE TABLE local_accounts(user_id uuid PRIMARY KEY REFERENCES users(id),email text NOT NULL UNIQUE,password_hash text NOT NULL);
CREATE TABLE oauth_data(id text PRIMARY KEY,kind text NOT NULL,expires_at bigint,data jsonb NOT NULL);
CREATE INDEX oauth_expiry ON oauth_data(expires_at);
CREATE TABLE oauth_tokens(hash text PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id),client_id text NOT NULL,kind text NOT NULL,family text NOT NULL,expires_at bigint NOT NULL,used_at bigint);
CREATE INDEX oauth_family ON oauth_tokens(family);
