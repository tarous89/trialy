CREATE TABLE worker_health (
 id text PRIMARY KEY, heartbeat_at timestamptz NOT NULL DEFAULT now(), last_success_at timestamptz, last_error_at timestamptz,
 CHECK(length(id)<=200)
);
