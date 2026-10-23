ALTER TABLE processing_jobs ADD COLUMN IF NOT EXISTS render TEXT NOT NULL DEFAULT 'preview' CHECK (render IN ('preview', 'full'));
ALTER TABLE processing_jobs ADD COLUMN IF NOT EXISTS source_job_id UUID REFERENCES processing_jobs(id) ON DELETE CASCADE;
ALTER TABLE processing_jobs ADD COLUMN IF NOT EXISTS provider_data JSONB;

-- A preview can be rendered at full length once, so provider credits are never spent twice.
CREATE UNIQUE INDEX IF NOT EXISTS jobs_one_full_per_source ON processing_jobs(source_job_id) WHERE render = 'full';
