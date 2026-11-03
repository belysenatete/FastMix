-- Paddle billing: the customer (for the self-service portal) and the time of the last webhook applied,
-- so events that arrive out of order can't overwrite newer state.
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS provider_customer_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS provider_updated_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS subscriptions_user_idx ON subscriptions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS subscriptions_lifetime_idx ON subscriptions (plan_key) WHERE plan_key = 'lifetime';
