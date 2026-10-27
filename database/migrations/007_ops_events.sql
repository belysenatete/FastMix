-- Operational alerts raised by the API and processor (provider credits, stuck queue, failure spikes).
CREATE TABLE IF NOT EXISTS ops_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  message TEXT NOT NULL CHECK (char_length(message) <= 1000),
  notified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ops_events_code_time ON ops_events(code, created_at DESC);
