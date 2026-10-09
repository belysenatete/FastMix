CREATE UNIQUE INDEX IF NOT EXISTS jobs_one_active_per_project
  ON processing_jobs(project_id)
  WHERE status IN ('queued', 'processing');

CREATE UNIQUE INDEX IF NOT EXISTS outputs_one_per_job ON outputs(job_id);
