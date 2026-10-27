-- Plan usage ledger. job_id has no foreign key on purpose: deleting a session must not give back
-- the tracks it used this month. Rows are removed when a job fails, so failures never cost a track.
CREATE TABLE IF NOT EXISTS usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('preview', 'full_track')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, kind)
);
CREATE INDEX IF NOT EXISTS usage_events_user_kind_time ON usage_events(user_id, kind, created_at);
