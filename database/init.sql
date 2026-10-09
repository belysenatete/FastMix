CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  password_hash TEXT,
  auth_provider TEXT NOT NULL DEFAULT 'local',
  preferred_language TEXT NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'fr')),
  marketing_emails BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled session',
  prompt TEXT NOT NULL DEFAULT '',
  project_type TEXT NOT NULL DEFAULT 'mix' CHECK (project_type IN ('mix', 'master')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'uploading', 'ready', 'queued', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS projects_user_updated ON projects(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('beat', 'lead_vocal', 'doubles', 'backing_vocals', 'adlibs', 'instrument', 'master')),
  original_name TEXT NOT NULL,
  storage_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
  duration_seconds NUMERIC(9,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  progress SMALLINT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  processor TEXT NOT NULL DEFAULT 'demo',
  attempt INTEGER NOT NULL DEFAULT 0,
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jobs_queue ON processing_jobs(created_at) WHERE status = 'queued';
CREATE UNIQUE INDEX IF NOT EXISTS jobs_one_active_per_project ON processing_jobs(project_id) WHERE status IN ('queued', 'processing');

CREATE TABLE IF NOT EXISTS outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES processing_jobs(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL UNIQUE,
  format TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS outputs_one_per_job ON outputs(job_id);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_subscription_id TEXT UNIQUE,
  plan_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('trialing', 'active', 'past_due', 'cancelled', 'expired')),
  period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_invoice_id TEXT UNIQUE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL,
  invoice_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  code TEXT NOT NULL UNIQUE,
  first_clicked_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  commission_cents INTEGER NOT NULL DEFAULT 0 CHECK (commission_cents >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
